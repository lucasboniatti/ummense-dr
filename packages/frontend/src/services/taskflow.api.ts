import type {
  Card,
  CardWithSummary,
  CardWithTasks,
  CreateCardDTO,
  CreateFlowColumnDTO,
  CreateFlowDTO,
  CreateTaskDTO,
  Flow,
  FlowColumn,
  FlowListItem,
  FlowWithColumns,
  FlowWithSeedColumns,
  ReorderCardsDTO,
  ReorderCardsResult,
  ReorderColumnsResult,
  Task,
  TaskListFilters,
  TaskflowApiErrorCode,
  TaskflowApiErrorPayload,
  TaskflowApiResponse,
  UpdateCardDTO,
  UpdateFlowColumnDTO,
  UpdateFlowDTO,
  UpdateTaskDTO,
} from '../types/taskflow';

const DEFAULT_API_BASE = 'http://localhost:3001';

function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, '').replace(/\/api$/, '');
}

const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_URL ||
    process.env.REACT_APP_API_URL ||
    DEFAULT_API_BASE
);

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export class TaskflowApiError extends Error {
  status: number;
  code: TaskflowApiErrorCode;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: TaskflowApiErrorCode = 'HTTP_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'TaskflowApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getTaskflowErrorMessage(error: unknown) {
  if (error instanceof TaskflowApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Request failed';
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const payload = await parseJson<TaskflowApiErrorPayload>(response).catch(
      () => null
    );
    const message = payload?.error || `HTTP ${response.status}`;

    throw new TaskflowApiError(
      message,
      response.status,
      payload?.code || 'HTTP_ERROR',
      payload?.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJson<T>(response);
  return (payload ?? undefined) as T;
}

function buildQueryString(
  values: Record<string, string | undefined>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const flowsApi = {
  list() {
    return request<TaskflowApiResponse<FlowListItem[]>>('/api/flows');
  },

  get(flowId: string) {
    return request<TaskflowApiResponse<FlowWithColumns>>(`/api/flows/${flowId}`);
  },

  create(payload: CreateFlowDTO) {
    return request<TaskflowApiResponse<FlowWithSeedColumns>>('/api/flows', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(flowId: string, payload: UpdateFlowDTO) {
    return request<TaskflowApiResponse<Flow>>(`/api/flows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(flowId: string) {
    return request<void>(`/api/flows/${flowId}`, {
      method: 'DELETE',
    });
  },

  addColumn(flowId: string, payload: CreateFlowColumnDTO) {
    return request<TaskflowApiResponse<FlowColumn>>(
      `/api/flows/${flowId}/columns`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  updateColumn(
    flowId: string,
    columnId: string,
    payload: UpdateFlowColumnDTO
  ) {
    return request<TaskflowApiResponse<FlowColumn>>(
      `/api/flows/${flowId}/columns/${columnId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  deleteColumn(flowId: string, columnId: string) {
    return request<void>(`/api/flows/${flowId}/columns/${columnId}`, {
      method: 'DELETE',
    });
  },

  reorderColumns(flowId: string, columnIds: string[]) {
    return request<TaskflowApiResponse<ReorderColumnsResult>>(
      `/api/flows/${flowId}/columns/reorder`,
      {
        method: 'PUT',
        body: JSON.stringify({ column_ids: columnIds }),
      }
    );
  },
};

export const cardsApi = {
  list(flowId: string) {
    return request<TaskflowApiResponse<CardWithSummary[]>>(
      `/api/cards${buildQueryString({ flowId })}`
    );
  },

  get(cardId: string) {
    return request<TaskflowApiResponse<CardWithTasks>>(`/api/cards/${cardId}`);
  },

  create(payload: CreateCardDTO) {
    return request<TaskflowApiResponse<Card>>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(cardId: string, payload: UpdateCardDTO) {
    return request<TaskflowApiResponse<Card>>(`/api/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  reorder(payload: ReorderCardsDTO) {
    return request<TaskflowApiResponse<ReorderCardsResult>>('/api/cards/reorder', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(cardId: string) {
    return request<void>(`/api/cards/${cardId}`, {
      method: 'DELETE',
    });
  },
};

export const tasksApi = {
  list(cardId: string, filters: TaskListFilters = {}) {
    return request<TaskflowApiResponse<Task[]>>(
      `/api/tasks${buildQueryString({
        cardId,
        status: filters.status,
        priority: filters.priority,
      })}`
    );
  },

  create(payload: CreateTaskDTO) {
    return request<TaskflowApiResponse<Task>>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(taskId: string, payload: UpdateTaskDTO) {
    return request<TaskflowApiResponse<Task>>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(taskId: string) {
    return request<void>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
};
