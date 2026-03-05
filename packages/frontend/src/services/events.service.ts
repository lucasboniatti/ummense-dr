import { api } from './api';

export interface EventItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  card_id: number | null;
  task_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function withAuthorization(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function list(
  token: string,
  query?: {
    startDate?: string;
    endDate?: string;
    cardId?: number;
    taskId?: number;
    limit?: number;
    offset?: number;
  }
): Promise<EventItem[]> {
  const params = new URLSearchParams();

  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  if (query?.cardId) params.set('cardId', String(query.cardId));
  if (query?.taskId) params.set('taskId', String(query.taskId));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.offset) params.set('offset', String(query.offset));

  const search = params.toString();
  const url = `/api/events${search ? `?${search}` : ''}`;
  const response = await api.get(url, withAuthorization(token));
  const items = response.data?.items;
  return Array.isArray(items) ? (items as EventItem[]) : [];
}

async function create(
  token: string,
  payload: {
    title: string;
    description?: string | null;
    startsAt: string;
    endsAt?: string | null;
    cardId?: number | null;
    taskId?: number | null;
    metadata?: Record<string, unknown>;
  }
): Promise<EventItem> {
  const response = await api.post('/api/events', payload, withAuthorization(token));
  return response.data as EventItem;
}

async function update(
  eventId: string,
  token: string,
  payload: {
    title?: string;
    description?: string | null;
    startsAt?: string;
    endsAt?: string | null;
    cardId?: number | null;
    taskId?: number | null;
    metadata?: Record<string, unknown>;
  }
): Promise<EventItem> {
  const response = await api.patch(`/api/events/${eventId}`, payload, withAuthorization(token));
  return response.data as EventItem;
}

async function remove(eventId: string, token: string): Promise<void> {
  await api.delete(`/api/events/${eventId}`, withAuthorization(token));
}

export const eventsService = {
  list,
  create,
  update,
  remove,
};
