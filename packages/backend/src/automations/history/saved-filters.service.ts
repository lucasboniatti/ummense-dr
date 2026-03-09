import { AppError } from '../../utils/errors';

const MAX_CUSTOM_PRESETS_PER_USER = 20;

export interface SavedFilterPayload {
  name: string;
  description?: string;
  filter_json: SavedFilterDefinition;
}

export interface SavedFilterDefinition {
  automationId?: string;
  status?: 'success' | 'failed' | 'skipped';
  dateRange?: '24h' | '7d' | '30d';
  searchTerm?: string;
  sortBy?: 'timestamp' | 'status' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface SavedFilterRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  filter_json: SavedFilterDefinition;
  is_default: boolean;
  created_at: string;
  deleted_at: string | null;
}

type SupabaseClientLike = {
  from: (table: string) => any;
};

const DEFAULT_PRESETS: Array<{
  name: string;
  description: string;
  filter_json: SavedFilterDefinition;
}> = [
  {
    name: 'Failed Executions (24h)',
    description: 'Todas as execucoes com falha nas ultimas 24 horas.',
    filter_json: {
      status: 'failed',
      dateRange: '24h',
      sortBy: 'timestamp',
      sortOrder: 'desc',
    },
  },
  {
    name: 'Timeout Errors',
    description: 'Falhas recentes filtradas pelo termo timeout.',
    filter_json: {
      searchTerm: 'timeout',
      status: 'failed',
      sortBy: 'timestamp',
      sortOrder: 'desc',
    },
  },
  {
    name: 'Recent Executions',
    description: 'Visao padrao das execucoes mais recentes da ultima semana.',
    filter_json: {
      dateRange: '7d',
      sortBy: 'timestamp',
      sortOrder: 'desc',
    },
  },
];

export class SavedFiltersService {
  constructor(private readonly db: SupabaseClientLike) {}

  async listSavedFilters(userId: string): Promise<SavedFilterRecord[]> {
    await this.ensureDefaultPresets(userId);

    const { data, error } = await this.db
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((record: SavedFilterRecord) => this.mapRecord(record));
  }

  async createSavedFilter(userId: string, payload: SavedFilterPayload): Promise<SavedFilterRecord> {
    await this.ensureDefaultPresets(userId);

    const name = normalizeName(payload.name);
    const description = normalizeDescription(payload.description);
    const filterJson = sanitizeFilterJson(payload.filter_json);

    const activeCustomPresetCount = await this.countActiveCustomPresets(userId);
    if (activeCustomPresetCount >= MAX_CUSTOM_PRESETS_PER_USER) {
      throw new AppError(
        `Maximo de ${MAX_CUSTOM_PRESETS_PER_USER} presets personalizados por usuario atingido`,
        409
      );
    }

    const duplicateName = await this.findActivePresetByName(userId, name);
    if (duplicateName) {
      throw new AppError('Ja existe um preset ativo com esse nome', 409);
    }

    const { data, error } = await this.db
      .from('user_saved_filters')
      .insert({
        user_id: userId,
        name,
        description,
        filter_json: filterJson,
        is_default: false,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Ja existe um preset ativo com esse nome', 409);
      }

      throw error;
    }

    return this.mapRecord(data);
  }

  async deleteSavedFilter(userId: string, presetId: string): Promise<void> {
    const { data, error } = await this.db
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', userId)
      .eq('id', presetId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.deleted_at) {
      throw new AppError('Preset nao encontrado', 404);
    }

    if (data.is_default) {
      throw new AppError('Presets padrao nao podem ser removidos', 400);
    }

    const { error: updateError } = await this.db
      .from('user_saved_filters')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('id', presetId)
      .is('deleted_at', null);

    if (updateError) {
      throw updateError;
    }
  }

  private async ensureDefaultPresets(userId: string): Promise<void> {
    const { data, error } = await this.db
      .from('user_saved_filters')
      .select('name')
      .eq('user_id', userId)
      .eq('is_default', true)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    const activeDefaultNames = new Set((data || []).map((preset: { name: string }) => preset.name));
    const missingDefaults = DEFAULT_PRESETS.filter((preset) => !activeDefaultNames.has(preset.name));

    if (missingDefaults.length === 0) {
      return;
    }

    const { error: insertError } = await this.db.from('user_saved_filters').insert(
      missingDefaults.map((preset) => ({
        user_id: userId,
        name: preset.name,
        description: preset.description,
        filter_json: preset.filter_json,
        is_default: true,
      }))
    );

    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }
  }

  private async countActiveCustomPresets(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('user_saved_filters')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_default', false)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  private async findActivePresetByName(userId: string, name: string): Promise<SavedFilterRecord | null> {
    const { data, error } = await this.db
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .ilike('name', name)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.mapRecord(data) : null;
  }

  private mapRecord(record: SavedFilterRecord): SavedFilterRecord {
    return {
      id: record.id,
      user_id: record.user_id,
      name: record.name,
      description: record.description || null,
      filter_json: sanitizeFilterJson(record.filter_json),
      is_default: Boolean(record.is_default),
      created_at: record.created_at,
      deleted_at: record.deleted_at || null,
    };
  }
}

function normalizeName(name: string): string {
  const normalized = String(name || '').trim();

  if (!normalized) {
    throw new AppError('Nome do preset e obrigatorio', 400);
  }

  if (normalized.length > 100) {
    throw new AppError('Nome do preset deve ter no maximo 100 caracteres', 400);
  }

  return normalized;
}

function normalizeDescription(description?: string): string | null {
  if (!description) {
    return null;
  }

  const normalized = String(description).trim();
  if (normalized.length > 500) {
    throw new AppError('Descricao deve ter no maximo 500 caracteres', 400);
  }

  return normalized || null;
}

function sanitizeFilterJson(raw: unknown): SavedFilterDefinition {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError('filter_json precisa ser um objeto valido', 400);
  }

  const input = raw as Record<string, unknown>;
  const sanitized: SavedFilterDefinition = {};

  if (typeof input.automationId === 'string' && input.automationId.trim()) {
    sanitized.automationId = input.automationId.trim();
  }

  if (
    input.status === 'success' ||
    input.status === 'failed' ||
    input.status === 'skipped'
  ) {
    sanitized.status = input.status;
  }

  if (input.dateRange === '24h' || input.dateRange === '7d' || input.dateRange === '30d') {
    sanitized.dateRange = input.dateRange;
  }

  if (typeof input.searchTerm === 'string' && input.searchTerm.trim()) {
    sanitized.searchTerm = input.searchTerm.trim().slice(0, 200);
  }

  if (
    input.sortBy === 'timestamp' ||
    input.sortBy === 'status' ||
    input.sortBy === 'duration'
  ) {
    sanitized.sortBy = input.sortBy;
  }

  if (input.sortOrder === 'asc' || input.sortOrder === 'desc') {
    sanitized.sortOrder = input.sortOrder;
  }

  return sanitized;
}
