/**
 * S3 Archival Service
 * Handles long-term storage of execution history to S3 with compression
 * Cost optimization: S3 storage (~$0.023/GB/month) vs PostgreSQL (~$1-5/GB/month) = 50-200x cheaper
 * Retention: 7 years (2555 days) for compliance
 */

import * as zlib from 'zlib';
import * as stream from 'stream';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

export interface S3ArchivalConfig {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface ArchivalResult {
  success: boolean;
  key?: string;
  recordCount: number;
  compressedSize?: number;
  originalSize?: number;
  compressionRatio?: number;
  error?: string;
}

export class S3ArchivalService {
  private s3Client: any; // AWS SDK v3 S3Client

  constructor(private config: S3ArchivalConfig) {
    // Initialize AWS SDK v3 client (lazy-loaded to avoid dependency if not used)
  }

  /**
   * Initialize S3 client on-demand
   * AWS SDK v3 is preferred over v2 for modern Node.js
   */
  private async initializeS3Client() {
    if (this.s3Client) {
      return;
    }

    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: this.config.region || 'us-east-1',
        ...(this.config.accessKeyId && {
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        }),
      });
    } catch (error) {
      throw new Error('AWS SDK v3 not installed. Install @aws-sdk/client-s3');
    }
  }

  /**
   * Archive execution records to S3 with gzip compression
   * Organizes records by user_id and date for easy retrieval
   *
   * @param records - Array of execution records to archive
   * @param userId - User ID (used in S3 path)
   * @returns ArchivalResult with success status and metadata
   */
  async archiveExecutionRecords(records: any[], userId: string): Promise<ArchivalResult> {
    try {
      if (!records || records.length === 0) {
        return {
          success: true,
          recordCount: 0,
          error: 'No records to archive',
        };
      }

      await this.initializeS3Client();

      // Generate archive metadata
      const archiveDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `archive/${userId}/${archiveDate}/execution-history.json.gz`;

      // Prepare JSON data
      const jsonData = JSON.stringify(
        {
          version: '1.0',
          archiveDate: new Date().toISOString(),
          userId,
          recordCount: records.length,
          records,
        },
        null,
        2
      );

      const originalSize = Buffer.byteLength(jsonData, 'utf8');

      // Compress with gzip
      const compressedData = await gzip(jsonData);
      const compressedSize = compressedData.length;

      // Upload to S3 with encryption and metadata
      await this.uploadToS3(key, compressedData, originalSize, compressedSize);

      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      return {
        success: true,
        key,
        recordCount: records.length,
        originalSize,
        compressedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[S3 Archival] Failed to archive records for user ${userId}:`, error);

      return {
        success: false,
        recordCount: records.length,
        error: `S3 archival failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Archive audit logs to S3 with compression
   * Separate path from execution records for audit compliance
   */
  async archiveAuditLogs(logs: any[], userId: string): Promise<ArchivalResult> {
    try {
      if (!logs || logs.length === 0) {
        return {
          success: true,
          recordCount: 0,
          error: 'No audit logs to archive',
        };
      }

      await this.initializeS3Client();

      const archiveDate = new Date().toISOString().split('T')[0];
      const key = `archive/${userId}/${archiveDate}/audit-logs.json.gz`;

      const jsonData = JSON.stringify(
        {
          version: '1.0',
          archiveDate: new Date().toISOString(),
          userId,
          recordCount: logs.length,
          logs,
        },
        null,
        2
      );

      const originalSize = Buffer.byteLength(jsonData, 'utf8');
      const compressedData = await gzip(jsonData);
      const compressedSize = compressedData.length;

      await this.uploadToS3(key, compressedData, originalSize, compressedSize);

      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      return {
        success: true,
        key,
        recordCount: logs.length,
        originalSize,
        compressedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[S3 Archival] Failed to archive audit logs for user ${userId}:`, error);

      return {
        success: false,
        recordCount: logs.length,
        error: `Audit log archival failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Upload compressed data to S3 with encryption and metadata
   * @private
   */
  private async uploadToS3(
    key: string,
    data: Buffer,
    originalSize: number,
    compressedSize: number
  ): Promise<void> {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-size': originalSize.toString(),
          'compressed-size': compressedSize.toString(),
          'archived-date': new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      console.log(`[S3 Archival] Successfully uploaded ${key}`);
    } catch (error) {
      throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve archived records from S3
   * Automatically decompresses gzip content
   */
  async retrieveArchive(userId: string, archiveDate: string): Promise<any> {
    try {
      await this.initializeS3Client();

      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const key = `archive/${userId}/${archiveDate}/execution-history.json.gz`;
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const compressedData = await this.streamToBuffer(response.Body);
      const jsonData = await promisify(zlib.gunzip)(compressedData);

      return JSON.parse(jsonData.toString());
    } catch (error) {
      console.error(`[S3 Archival] Failed to retrieve archive:`, error);
      throw error;
    }
  }

  /**
   * List all archives for a user
   */
  async listArchives(userId: string): Promise<string[]> {
    try {
      await this.initializeS3Client();

      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: `archive/${userId}/`,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || []).map((obj) => obj.Key || '').filter(Boolean);
    } catch (error) {
      console.error(`[S3 Archival] Failed to list archives:`, error);
      return [];
    }
  }

  /**
   * Delete an archive from S3
   */
  async deleteArchive(userId: string, archiveDate: string): Promise<boolean> {
    try {
      await this.initializeS3Client();

      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      const key = `archive/${userId}/${archiveDate}/execution-history.json.gz`;
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`[S3 Archival] Deleted archive ${key}`);
      return true;
    } catch (error) {
      console.error(`[S3 Archival] Failed to delete archive:`, error);
      return false;
    }
  }

  /**
   * Calculate cost savings for archival
   * S3 storage: ~$0.023/GB/month
   * PostgreSQL storage: ~$1-5/GB/month
   * Savings: 50-200x cheaper with S3
   */
  static calculateCostSavings(
    recordCount: number,
    compressedSizeBytes: number,
    retentionYears: number = 7
  ): {
    compressedSizeGB: number;
    monthlyS3Cost: number;
    monthlyPostgreSQLCost: number;
    totalS3Cost: string;
    totalPostgreSQLCost: string;
    savingsRatio: string;
  } {
    const compressedSizeGB = compressedSizeBytes / (1024 * 1024 * 1024);
    const s3PricePerGB = 0.023; // Monthly
    const pgPricePerGB = 1.5; // Conservative mid-range estimate

    const monthlyS3Cost = compressedSizeGB * s3PricePerGB;
    const monthlyPostgreSQLCost = compressedSizeGB * pgPricePerGB;

    const months = retentionYears * 12;
    const totalS3Cost = (monthlyS3Cost * months).toFixed(2);
    const totalPostgreSQLCost = (monthlyPostgreSQLCost * months).toFixed(2);

    const savingsRatio = ((1 - monthlyS3Cost / monthlyPostgreSQLCost) * 100).toFixed(1);

    return {
      compressedSizeGB: Math.round(compressedSizeGB * 1000) / 1000,
      monthlyS3Cost: Math.round(monthlyS3Cost * 100) / 100,
      monthlyPostgreSQLCost: Math.round(monthlyPostgreSQLCost * 100) / 100,
      totalS3Cost,
      totalPostgreSQLCost,
      savingsRatio: `${savingsRatio}%`,
    };
  }

  /**
   * Stream to Buffer converter
   * @private
   */
  private async streamToBuffer(stream: stream.Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
