import type { Response } from 'express';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth.middleware';
import type {
  Card,
  Flow,
  FlowColumn,
  Task,
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from '../types/taskflow.types';

export type TaskflowErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

interface AuthAdminUser {
  id?: string;
  email?: string;
}

interface ControllerContext {
  email: string;
  userId: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;
const AUTH_PAGE_SIZE = 1000;
const AUTH_PAGE_LIMIT = 10;

export const TASK_PRIORITIES: readonly TaskPriority[] = ['P1', 'P2', 'P3'];
export const TASK_STATUSES: readonly TaskStatus[] = [
  'open',
  'in_progress',
  'done',
  'blocked',
];

export const DEFAULT_FLOW_COLUMNS = [
  { name: 'Backlog', color: '#6B7280', order_index: 0 },
  { name: 'A Fazer', color: '#3B82F6', order_index: 1 },
  { name: 'Em Progresso', color: '#F59E0B', order_index: 2 },
  { name: 'Finalizado', color: '#10B981', order_index: 3 },
] as const;

export function sendTaskflowError(
  res: Response,
  status: number,
  error: string,
  code: TaskflowErrorCode,
  details?: unknown
) {
  const body: Record<string, unknown> = { error, code };

  if (details !== undefined) {
    body.details = details;
  }

  return res.status(status).json(body);
}

export function sendTaskflowData<T>(
  res: Response,
  status: number,
  data: T
) {
  return res.status(status).json({ data });
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isValidColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value);
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isValidPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export function isValidStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function normalizeRequiredString(value: string): string {
  return value.trim();
}

export function normalizeNullableText(
  value: unknown
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

export function isValidRequiredText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 255;
}

export function isValidOptionalText(
  value: unknown,
  maxLength: number = 255
): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.length <= maxLength)
  );
}

export function isValidOrderIndex(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function clampOrderIndex(value: number, itemCount: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > itemCount) {
    return itemCount;
  }

  return value;
}

function getAuthAdmin() {
  const adminApi = (supabase as any)?.auth?.admin;

  if (!adminApi || typeof adminApi.listUsers !== 'function') {
    throw new Error('Supabase auth admin API is unavailable');
  }

  return adminApi;
}

function extractAuthUsers(payload: any): AuthAdminUser[] {
  if (Array.isArray(payload?.data?.users)) {
    return payload.data.users;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  return [];
}

export async function resolveSupabaseUserIdByEmail(
  email: string
): Promise<string | null> {
  const adminApi = getAuthAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= AUTH_PAGE_LIMIT; page += 1) {
    const result = await adminApi.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (result?.error) {
      throw result.error;
    }

    const users = extractAuthUsers(result);
    const match = users.find(
      (user) =>
        typeof user?.email === 'string' &&
        user.email.toLowerCase() === normalizedEmail
    );

    if (match?.id) {
      return match.id;
    }

    if (users.length < AUTH_PAGE_SIZE) {
      break;
    }
  }

  return null;
}

export async function validateSupabaseAuthUser(
  userId: string
): Promise<boolean> {
  const adminApi = getAuthAdmin();

  if (typeof adminApi.getUserById === 'function') {
    const result = await adminApi.getUserById(userId);

    if (result?.error) {
      return false;
    }

    const user = result?.data?.user ?? result?.data;
    return Boolean(user?.id);
  }

  for (let page = 1; page <= AUTH_PAGE_LIMIT; page += 1) {
    const result = await adminApi.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (result?.error) {
      return false;
    }

    const users = extractAuthUsers(result);

    if (users.some((user) => user?.id === userId)) {
      return true;
    }

    if (users.length < AUTH_PAGE_SIZE) {
      break;
    }
  }

  return false;
}

export async function resolveControllerContext(
  req: AuthRequest,
  res: Response
): Promise<ControllerContext | null> {
  if (!req.user?.email) {
    sendTaskflowError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    return null;
  }

  try {
    const userId = await resolveSupabaseUserIdByEmail(req.user.email);

    if (!userId) {
      sendTaskflowError(
        res,
        403,
        'Authenticated user not found in Supabase auth',
        'FORBIDDEN'
      );
      return null;
    }

    return {
      email: req.user.email,
      userId,
    };
  } catch (error) {
    console.error('[TaskFlow][auth-bridge]', error);
    sendTaskflowError(
      res,
      500,
      'Failed to resolve authenticated user',
      'INTERNAL_ERROR'
    );
    return null;
  }
}

function toFirstRow<T>(data: unknown): T | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as T) : null;
}

export async function fetchOwnedFlow(
  flowId: string,
  userId: string
): Promise<Flow | null> {
  const { data, error } = await (supabase as any)
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    throw error;
  }

  return toFirstRow<Flow>(data);
}

export async function fetchFlowColumn(
  flowId: string,
  columnId: string
): Promise<FlowColumn | null> {
  const { data, error } = await (supabase as any)
    .from('flow_columns')
    .select('*')
    .eq('id', columnId)
    .eq('flow_id', flowId)
    .limit(1);

  if (error) {
    throw error;
  }

  return toFirstRow<FlowColumn>(data);
}

export async function fetchCard(cardId: string): Promise<Card | null> {
  const { data, error } = await (supabase as any)
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .limit(1);

  if (error) {
    throw error;
  }

  return toFirstRow<Card>(data);
}

export async function fetchTask(taskId: string): Promise<Task | null> {
  const { data, error } = await (supabase as any)
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .limit(1);

  if (error) {
    throw error;
  }

  return toFirstRow<Task>(data);
}

export async function fetchCardSummaryMap(cardIds: string[]) {
  const summaries: Record<string, TaskSummary> = {};

  if (cardIds.length === 0) {
    return summaries;
  }

  const { data, error } = await (supabase as any)
    .from('tasks')
    .select('card_id, status')
    .in('card_id', cardIds);

  if (error) {
    throw error;
  }

  for (const row of Array.isArray(data) ? data : []) {
    const cardId = row.card_id as string;

    if (!summaries[cardId]) {
      summaries[cardId] = { total: 0, done: 0, open: 0 };
    }

    summaries[cardId].total += 1;

    if (row.status === 'done') {
      summaries[cardId].done += 1;
    } else {
      summaries[cardId].open += 1;
    }
  }

  return summaries;
}

export async function fetchCardsForColumn(columnId: string, excludeCardId?: string) {
  const { data, error } = await (supabase as any)
    .from('cards')
    .select('*')
    .eq('column_id', columnId)
    .order('order_index', { ascending: true });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []).filter(
    (card) => card.id !== excludeCardId
  ) as Card[];
}
