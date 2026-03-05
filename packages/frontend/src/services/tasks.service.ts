import { api } from './api';

export interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: string | null;
  cardId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface TaskTag {
  id: number;
  name: string;
  color: string;
  created_at?: string;
}

function withAuthorization(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function normalizeTask(raw: any): TaskItem {
  return {
    id: Number(raw?.id),
    title: String(raw?.title || ''),
    description: raw?.description || null,
    priority: String(raw?.priority || 'P3'),
    status: String(raw?.status || 'open'),
    dueDate: raw?.dueDate ?? raw?.due_date ?? null,
    assignedTo: raw?.assignedTo ?? raw?.assigned_to ?? null,
    cardId: Number(raw?.cardId ?? raw?.card_id ?? 0),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ''),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ''),
  };
}

async function listByCardId(cardId: number, token: string): Promise<TaskItem[]> {
  const response = await api.get(
    `/api/tasks?cardId=${cardId}&limit=200&offset=0`,
    withAuthorization(token)
  );
  const items = response.data?.items;
  return Array.isArray(items) ? items.map(normalizeTask) : [];
}

async function create(
  token: string,
  payload: {
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    assignedTo?: string | null;
    cardId: number;
  }
): Promise<TaskItem> {
  const response = await api.post('/api/tasks', payload, withAuthorization(token));
  return normalizeTask(response.data);
}

async function update(
  taskId: number,
  token: string,
  payload: {
    title?: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    assignedTo?: string | null;
  }
): Promise<TaskItem> {
  const response = await api.put(`/api/tasks/${taskId}`, payload, withAuthorization(token));
  return normalizeTask(response.data);
}

async function remove(taskId: number, token: string): Promise<void> {
  await api.delete(`/api/tasks/${taskId}`, withAuthorization(token));
}

async function getHistory(taskId: number, token: string): Promise<TaskHistoryItem[]> {
  const response = await api.get(
    `/api/tasks/${taskId}/history?limit=100&offset=0`,
    withAuthorization(token)
  );
  const items = response.data?.items;
  return Array.isArray(items) ? (items as TaskHistoryItem[]) : [];
}

async function getTags(taskId: number, token: string): Promise<TaskTag[]> {
  const response = await api.get(
    `/api/tags/tasks/${taskId}/tags`,
    withAuthorization(token)
  );
  return Array.isArray(response.data) ? (response.data as TaskTag[]) : [];
}

async function addTag(taskId: number, tagId: number, token: string): Promise<void> {
  await api.post(
    `/api/tags/tasks/${taskId}/tags/${tagId}`,
    {},
    withAuthorization(token)
  );
}

async function removeTag(taskId: number, tagId: number, token: string): Promise<void> {
  await api.delete(
    `/api/tags/tasks/${taskId}/tags/${tagId}`,
    withAuthorization(token)
  );
}

export const tasksService = {
  listByCardId,
  create,
  update,
  remove,
  getHistory,
  getTags,
  addTag,
  removeTag,
};
