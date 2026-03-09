import { SupabaseClient } from '@supabase/supabase-js';
import { S3ArchivalService } from '../automations/history/s3-archival.service';

const DEFAULT_COMPRESSION_RATIO = Number(process.env.S3_COMPRESSION_RATIO || '3.5');
const DEFAULT_RDS_PRICE_PER_GB = Number(process.env.RDS_PRICE_PER_GB || '1.5');
const DEFAULT_S3_PRICE_PER_GB = Number(process.env.S3_PRICE_PER_GB || '0.023');
const DEFAULT_ACCURACY_THRESHOLD = Number(process.env.COST_ACCURACY_THRESHOLD || '95');
const SAMPLE_SIZE = 100;
const DEFAULT_ROW_SIZE_BYTES = 2048;
const STORAGE_OVERHEAD_MULTIPLIER = 1.15;

export interface CostMetrics {
  dbStorageGb: number;
  s3StorageGb: number;
  archivedStorageGb: number;
  dbCostMonthly: number;
  s3CostMonthly: number;
  monthlySavings: number;
  sevenYearProjection: number;
  compressionRatio: number;
  accuracy: number;
  isEstimate: boolean;
}

export interface CostSnapshot extends CostMetrics {
  id: string;
  userId: string;
  timestamp: string;
}

export interface StorageTrendPoint {
  date: string;
  archivalRateGbPerDay: number;
}

export interface CostSummary {
  dbCost: number;
  s3Cost: number;
  monthlySavings: number;
  sevenYearProjection: number;
  storageGrowthTrend: StorageTrendPoint[];
  accuracy: number;
  dbStorageGb: number;
  s3StorageGb: number;
  archivedStorageGb: number;
  compressionRatio: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  lastUpdatedAt: string | null;
  isEstimate: boolean;
}

interface StorageBreakdown {
  recordCount: number;
  dbStorageBytes: number;
  dbStorageGb: number;
}

interface ArchivedStorageBreakdown {
  archivedBytes: number;
  archivedStorageGb: number;
  effectiveStorageBytes: number;
  effectiveStorageGb: number;
  isEstimate: boolean;
  archiveEnabled: boolean;
}

interface RetentionPolicy {
  archive_enabled?: boolean;
  archive_bucket?: string | null;
}

interface CostSnapshotServiceOptions {
  archivalStorageProvider?: (userId: string, bucket: string) => Promise<number>;
  now?: () => Date;
}

export class CostSnapshotService {
  private readonly archivalStorageProvider: (userId: string, bucket: string) => Promise<number>;
  private readonly now: () => Date;

  constructor(
    private readonly supabase: SupabaseClient,
    options: CostSnapshotServiceOptions = {}
  ) {
    this.archivalStorageProvider =
      options.archivalStorageProvider || defaultArchivalStorageProvider;
    this.now = options.now || (() => new Date());
  }

  async calculateUserCostMetrics(userId: string): Promise<CostMetrics> {
    const dbStorage = await this.calculateUserDbStorage(userId);
    const retentionPolicy = await this.getUserRetentionPolicy(userId);
    const archivedStorage = await this.calculateArchivedStorage(
      userId,
      dbStorage.dbStorageBytes,
      retentionPolicy
    );

    return this.buildMetrics(dbStorage, archivedStorage);
  }

  async captureDailySnapshot(userId: string): Promise<CostSnapshot> {
    const existingSnapshot = await this.findSnapshotForDate(userId, this.now());
    if (existingSnapshot) {
      return existingSnapshot;
    }

    const metrics = await this.calculateUserCostMetrics(userId);
    return this.insertCostSnapshot(userId, metrics, this.now());
  }

  async insertCostSnapshot(
    userId: string,
    metrics: CostMetrics,
    timestamp: Date = this.now()
  ): Promise<CostSnapshot> {
    const { data, error } = await this.supabase
      .from('cost_snapshots')
      .insert({
        user_id: userId,
        timestamp: timestamp.toISOString(),
        db_storage_gb: metrics.dbStorageGb,
        s3_storage_gb: metrics.s3StorageGb,
        db_cost_monthly: metrics.dbCostMonthly,
        s3_cost_monthly: metrics.s3CostMonthly,
        monthly_savings: metrics.monthlySavings,
        seven_year_savings: metrics.sevenYearProjection,
        compression_ratio: metrics.compressionRatio,
        accuracy_percent: metrics.accuracy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert cost snapshot: ${error.message}`);
    }

    return this.mapSnapshotRow(data, metrics.isEstimate);
  }

  async getCostSummary(userId: string): Promise<CostSummary> {
    const snapshots = await this.loadRecentSnapshots(userId);

    if (snapshots.length === 0) {
      const metrics = await this.calculateUserCostMetrics(userId);
      return this.buildSummaryFromMetrics(metrics, [], null);
    }

    const latest = snapshots[0];

    return {
      dbCost: latest.dbCostMonthly,
      s3Cost: latest.s3CostMonthly,
      monthlySavings: latest.monthlySavings,
      sevenYearProjection: latest.sevenYearProjection,
      storageGrowthTrend: this.calculateStorageGrowthTrend(snapshots),
      accuracy: latest.accuracy,
      dbStorageGb: latest.dbStorageGb,
      s3StorageGb: latest.s3StorageGb,
      archivedStorageGb: latest.archivedStorageGb,
      compressionRatio: latest.compressionRatio,
      trend: this.calculateTrendDirection(snapshots),
      trendLabel: this.calculateTrendLabel(snapshots),
      lastUpdatedAt: latest.timestamp,
      isEstimate: latest.isEstimate,
    };
  }

  async validateCostAccuracy(snapshot: CostSnapshot): Promise<boolean> {
    return snapshot.accuracy >= DEFAULT_ACCURACY_THRESHOLD;
  }

  private async calculateUserDbStorage(userId: string): Promise<StorageBreakdown> {
    const countResult = await this.supabase
      .from('execution_histories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countResult.error) {
      throw new Error(`Failed to count execution history records: ${countResult.error.message}`);
    }

    const recordCount = countResult.count || 0;
    if (recordCount === 0) {
      return {
        recordCount: 0,
        dbStorageBytes: 0,
        dbStorageGb: 0,
      };
    }

    const sampleResult = await this.supabase
      .from('execution_histories')
      .select(
        'id, automation_id, status, trigger_type, trigger_data, started_at, completed_at, duration_ms, error_context, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(SAMPLE_SIZE);

    if (sampleResult.error) {
      throw new Error(`Failed to sample execution history rows: ${sampleResult.error.message}`);
    }

    const sampleRows = sampleResult.data || [];
    const averageRowBytes =
      sampleRows.length === 0
        ? DEFAULT_ROW_SIZE_BYTES
        : Math.max(
            DEFAULT_ROW_SIZE_BYTES,
            Math.ceil(
              (sampleRows.reduce((sum, row) => {
                return sum + Buffer.byteLength(JSON.stringify(row), 'utf8');
              }, 0) /
                sampleRows.length) *
                STORAGE_OVERHEAD_MULTIPLIER
            )
          );

    const dbStorageBytes = Math.round(recordCount * averageRowBytes);

    return {
      recordCount,
      dbStorageBytes,
      dbStorageGb: roundTo(dbStorageBytes / BYTES_PER_GB, 4),
    };
  }

  private async calculateArchivedStorage(
    userId: string,
    dbStorageBytes: number,
    retentionPolicy: RetentionPolicy | null
  ): Promise<ArchivedStorageBreakdown> {
    const estimatedArchivedBytes =
      dbStorageBytes > 0 ? Math.round(dbStorageBytes / DEFAULT_COMPRESSION_RATIO) : 0;

    const archiveEnabled = Boolean(
      retentionPolicy?.archive_enabled && retentionPolicy?.archive_bucket
    );

    if (!archiveEnabled || !retentionPolicy?.archive_bucket) {
      return {
        archivedBytes: 0,
        archivedStorageGb: 0,
        effectiveStorageBytes: estimatedArchivedBytes,
        effectiveStorageGb: roundTo(estimatedArchivedBytes / BYTES_PER_GB, 4),
        isEstimate: true,
        archiveEnabled: false,
      };
    }

    const archivedBytes = await this.archivalStorageProvider(
      userId,
      retentionPolicy.archive_bucket
    );

    if (archivedBytes > 0) {
      return {
        archivedBytes,
        archivedStorageGb: roundTo(archivedBytes / BYTES_PER_GB, 4),
        effectiveStorageBytes: archivedBytes,
        effectiveStorageGb: roundTo(archivedBytes / BYTES_PER_GB, 4),
        isEstimate: false,
        archiveEnabled: true,
      };
    }

    return {
      archivedBytes: 0,
      archivedStorageGb: 0,
      effectiveStorageBytes: estimatedArchivedBytes,
      effectiveStorageGb: roundTo(estimatedArchivedBytes / BYTES_PER_GB, 4),
      isEstimate: true,
      archiveEnabled: true,
    };
  }

  private buildMetrics(
    dbStorage: StorageBreakdown,
    archivedStorage: ArchivedStorageBreakdown
  ): CostMetrics {
    const costSavings = S3ArchivalService.calculateCostSavings(
      dbStorage.recordCount,
      archivedStorage.effectiveStorageBytes,
      7
    );

    const dbCostMonthly = roundTo(dbStorage.dbStorageGb * DEFAULT_RDS_PRICE_PER_GB, 4);
    const s3CostMonthly =
      archivedStorage.effectiveStorageBytes > 0
        ? roundTo(costSavings.monthlyS3Cost, 4)
        : 0;
    const monthlySavings = roundTo(dbCostMonthly - s3CostMonthly, 4);
    const effectiveCompressionRatio =
      archivedStorage.effectiveStorageBytes > 0 && dbStorage.dbStorageBytes > 0
        ? roundTo(
            Math.max(
              1,
              dbStorage.dbStorageBytes / archivedStorage.effectiveStorageBytes
            ),
            2
          )
        : DEFAULT_COMPRESSION_RATIO;

    return {
      dbStorageGb: roundTo(dbStorage.dbStorageGb, 4),
      s3StorageGb: roundTo(archivedStorage.effectiveStorageGb, 4),
      archivedStorageGb: roundTo(archivedStorage.archivedStorageGb, 4),
      dbCostMonthly,
      s3CostMonthly,
      monthlySavings,
      sevenYearProjection: roundTo(monthlySavings * 84, 2),
      compressionRatio: effectiveCompressionRatio,
      accuracy: DEFAULT_ACCURACY_THRESHOLD,
      isEstimate: archivedStorage.isEstimate,
    };
  }

  private async loadRecentSnapshots(userId: string): Promise<CostSnapshot[]> {
    const { data, error } = await this.supabase
      .from('cost_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(7);

    if (error) {
      throw new Error(`Failed to fetch cost snapshots: ${error.message}`);
    }

    return (data || []).map((row) => this.mapSnapshotRow(row, false));
  }

  private async findSnapshotForDate(userId: string, date: Date): Promise<CostSnapshot | null> {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const { data, error } = await this.supabase
      .from('cost_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startOfDay.toISOString())
      .lt('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to query existing daily snapshot: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return this.mapSnapshotRow(data[0], false);
  }

  private async getUserRetentionPolicy(userId: string): Promise<RetentionPolicy | null> {
    const { data, error } = await this.supabase
      .from('user_retention_policies')
      .select('archive_enabled, archive_bucket')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch retention policy: ${error.message}`);
    }

    return data || null;
  }

  private mapSnapshotRow(row: any, isEstimateFallback: boolean): CostSnapshot {
    const dbStorageGb = Number(row.db_storage_gb || 0);
    const s3StorageGb = Number(row.s3_storage_gb || 0);
    const compressionRatio = Number(row.compression_ratio || DEFAULT_COMPRESSION_RATIO);

    return {
      id: row.id,
      userId: row.user_id,
      timestamp: new Date(row.timestamp).toISOString(),
      dbStorageGb,
      s3StorageGb,
      archivedStorageGb: s3StorageGb,
      dbCostMonthly: Number(row.db_cost_monthly || 0),
      s3CostMonthly: Number(row.s3_cost_monthly || 0),
      monthlySavings: Number(row.monthly_savings || 0),
      sevenYearProjection: Number(row.seven_year_savings || 0),
      compressionRatio,
      accuracy: Number(row.accuracy_percent || DEFAULT_ACCURACY_THRESHOLD),
      isEstimate: isEstimateFallback,
    };
  }

  private buildSummaryFromMetrics(
    metrics: CostMetrics,
    snapshots: CostSnapshot[],
    lastUpdatedAt: string | null
  ): CostSummary {
    return {
      dbCost: metrics.dbCostMonthly,
      s3Cost: metrics.s3CostMonthly,
      monthlySavings: metrics.monthlySavings,
      sevenYearProjection: metrics.sevenYearProjection,
      storageGrowthTrend: this.calculateStorageGrowthTrend(snapshots),
      accuracy: metrics.accuracy,
      dbStorageGb: metrics.dbStorageGb,
      s3StorageGb: metrics.s3StorageGb,
      archivedStorageGb: metrics.archivedStorageGb,
      compressionRatio: metrics.compressionRatio,
      trend: 'stable',
      trendLabel: 'Aguardando serie historica',
      lastUpdatedAt,
      isEstimate: metrics.isEstimate,
    };
  }

  private calculateStorageGrowthTrend(snapshots: CostSnapshot[]): StorageTrendPoint[] {
    const chronological = [...snapshots].reverse();

    return chronological.map((snapshot, index) => {
      if (index === 0) {
        return {
          date: snapshot.timestamp,
          archivalRateGbPerDay: 0,
        };
      }

      const windowStart = Math.max(0, index - 6);
      const deltas: number[] = [];

      for (let cursor = windowStart + 1; cursor <= index; cursor += 1) {
        const current = chronological[cursor];
        const previous = chronological[cursor - 1];
        deltas.push(Math.max(0, current.archivedStorageGb - previous.archivedStorageGb));
      }

      const averageDelta =
        deltas.length > 0
          ? deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length
          : 0;

      return {
        date: snapshot.timestamp,
        archivalRateGbPerDay: roundTo(averageDelta, 4),
      };
    });
  }

  private calculateTrendDirection(
    snapshots: CostSnapshot[]
  ): 'up' | 'down' | 'stable' {
    if (snapshots.length < 2) {
      return 'stable';
    }

    const [latest, previous] = snapshots;
    const delta = roundTo(latest.monthlySavings - previous.monthlySavings, 4);

    if (Math.abs(delta) < 0.01) {
      return 'stable';
    }

    return delta > 0 ? 'down' : 'up';
  }

  private calculateTrendLabel(snapshots: CostSnapshot[]): string {
    const trend = this.calculateTrendDirection(snapshots);

    if (trend === 'down') {
      return 'economia aumentando';
    }

    if (trend === 'up') {
      return 'custo aumentando';
    }

    return 'economia estavel';
  }
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function defaultArchivalStorageProvider(userId: string, bucket: string): Promise<number> {
  const archivalService = new S3ArchivalService({
    bucket,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  return archivalService.getArchiveStorageBytes(userId);
}
