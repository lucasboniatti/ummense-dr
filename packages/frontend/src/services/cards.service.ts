import { api } from './api';
import { FlowTag } from './flows.service';

export interface CardProgress {
  total: number;
  completed: number;
  percent: number;
}

export interface CardTask {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardTimelineEvent {
  id: number | string;
  card_id: number;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CardDetails {
  id: number;
  title: string;
  description: string | null;
  columnId: number;
  userId: string;
  status: string;
  contacts: unknown[];
  customFields: Record<string, unknown>;
  progress: CardProgress;
  tasks: CardTask[];
  tags: FlowTag[];
  createdAt: string;
  updatedAt: string;
}

function withAuthorization(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function getById(cardId: number, token: string): Promise<CardDetails> {
  const response = await api.get(`/api/cards/${cardId}`, withAuthorization(token));
  return response.data as CardDetails;
}

async function update(
  cardId: number,
  token: string,
  payload: {
    title?: string;
    description?: string | null;
    status?: string;
    contacts?: unknown[];
    customFields?: Record<string, unknown>;
  }
): Promise<CardDetails> {
  const response = await api.put(`/api/cards/${cardId}`, payload, withAuthorization(token));
  return response.data as CardDetails;
}

async function getTimeline(cardId: number, token: string): Promise<CardTimelineEvent[]> {
  const response = await api.get(`/api/cards/${cardId}/timeline?limit=100&offset=0`, withAuthorization(token));
  const items = response.data?.items;
  return Array.isArray(items) ? (items as CardTimelineEvent[]) : [];
}

async function addTimelineNote(
  cardId: number,
  token: string,
  note: string
): Promise<CardTimelineEvent> {
  const response = await api.post(
    `/api/cards/${cardId}/timeline`,
    {
      action: 'note.added',
      details: { note },
    },
    withAuthorization(token)
  );

  return response.data as CardTimelineEvent;
}

export const cardsService = {
  getById,
  update,
  getTimeline,
  addTimelineNote,
};
