import { api } from './api';

export type FlowCardStatus = 'active' | 'completed' | 'blocked';

export interface FlowTag {
  id: number;
  name: string;
  color: string;
}

export interface FlowCardProgress {
  total: number;
  completed: number;
  percent: number;
}

export interface FlowCardTasksSummary {
  open: number;
  inProgress: number;
  completed: number;
  blocked: number;
}

export interface FlowCardItem {
  id: number;
  title: string;
  description: string | null;
  status: FlowCardStatus;
  rawStatus: string | null;
  responsible: string | null;
  progress: FlowCardProgress;
  tasksSummary: FlowCardTasksSummary;
  tags: FlowTag[];
  contacts: unknown[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FlowColumnItem {
  id: number;
  name: string;
  order: number;
  cards: FlowCardItem[];
}

export interface FlowIndicators {
  activeCards: number;
  completedCards: number;
  blockedCards: number;
  throughput: number;
}

export interface FlowListItem {
  id: number;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  columnsCount: number;
  cardsCount: number;
  indicators: FlowIndicators;
}

export interface FlowDetails {
  id: number;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  columns: FlowColumnItem[];
  indicators: FlowIndicators;
}

function withAuthorization(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function list(token: string): Promise<FlowListItem[]> {
  const response = await api.get('/api/flows', withAuthorization(token));
  return Array.isArray(response.data) ? (response.data as FlowListItem[]) : [];
}

async function getById(flowId: number, token: string): Promise<FlowDetails> {
  const response = await api.get(`/api/flows/${flowId}`, withAuthorization(token));
  return response.data as FlowDetails;
}

async function moveCard(cardId: number, toColumnId: number, token: string): Promise<void> {
  await api.patch(
    `/api/cards/${cardId}/move`,
    { toColumnId },
    withAuthorization(token)
  );
}

export const flowsService = {
  list,
  getById,
  moveCard,
};
