# TaskFlow — Full-Stack Architecture

**Author:** Aria (Architect)
**Date:** 2026-03-12
**Status:** Draft → Pending Review
**Handoff:** `.aios/handoffs/taskflow-implementation-handoff.yaml`

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ useFlows │  │ useCards  │  │ useTasks │  React Hooks  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       └──────────────┼─────────────┘                    │
│                      ▼                                  │
│              apiClient (fetch)                          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (REST)
┌──────────────────────▼──────────────────────────────────┐
│                  Backend (Express.js)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ flow.ctrl  │  │ card.ctrl  │  │ task.ctrl  │ Ctrls   │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        └────────────────┼───────────────┘               │
│                         ▼                               │
│                supabase client (service role)            │
└─────────────────────────┬───────────────────────────────┘
                          │ PostgreSQL
┌─────────────────────────▼───────────────────────────────┐
│                   Supabase (PostgreSQL)                  │
│  ┌────────┐ ┌──────────────┐ ┌───────┐ ┌───────┐       │
│  │ flows  │ │ flow_columns │ │ cards │ │ tasks │  + RLS │
│  └────────┘ └──────────────┘ └───────┘ └───────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐
│   flows     │──1:N──│  flow_columns    │
│             │       │                  │
│ id (PK)     │       │ id (PK)          │
│ user_id(FK) │       │ flow_id (FK)     │
│ name        │       │ name             │
│ description │       │ color            │
│ created_at  │       │ order_index      │
│ updated_at  │       │ created_at       │
└─────────────┘       └────────┬─────────┘
                               │
                              1:N
                               │
                      ┌────────▼─────────┐
                      │     cards        │
                      │                  │
                      │ id (PK)          │
                      │ flow_id (FK)     │
                      │ column_id (FK)   │
                      │ title            │
                      │ description      │
                      │ order_index      │
                      │ created_by (FK)  │
                      │ created_at       │
                      │ updated_at       │
                      └────────┬─────────┘
                               │
                              1:N
                               │
                      ┌────────▼─────────┐
                      │     tasks        │
                      │                  │
                      │ id (PK)          │
                      │ card_id (FK)     │
                      │ title            │
                      │ description      │
                      │ priority         │
                      │ status           │
                      │ due_date         │
                      │ assigned_to (FK) │
                      │ created_by (FK)  │
                      │ created_at       │
                      │ updated_at       │
                      └──────────────────┘
```

### 2.2 DDL (Supabase Migration)

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_taskflow_tables.sql`

```sql
-- ============================================================
-- TaskFlow Core Tables
-- ============================================================

-- 1. Flows (Kanban Boards)
CREATE TABLE public.flows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flows_user_id ON public.flows(user_id);

-- 2. Flow Columns (Status Columns)
CREATE TABLE public.flow_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id     UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  color       VARCHAR(7) DEFAULT '#6B7280',  -- hex color
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_columns_flow_id ON public.flow_columns(flow_id);
CREATE INDEX idx_flow_columns_order ON public.flow_columns(flow_id, order_index);

-- 3. Cards (Clients/Entities)
CREATE TABLE public.cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id     UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  column_id   UUID NOT NULL REFERENCES public.flow_columns(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_flow_id ON public.cards(flow_id);
CREATE INDEX idx_cards_column_id ON public.cards(column_id);
CREATE INDEX idx_cards_column_order ON public.cards(column_id, order_index);

-- 4. Tasks (within Cards)
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  priority    VARCHAR(2) NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3')),
  status      VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','blocked')),
  due_date    DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_card_id ON public.tasks(card_id);
CREATE INDEX idx_tasks_status ON public.tasks(card_id, status);
CREATE INDEX idx_tasks_priority ON public.tasks(card_id, priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RLS Policies (Row Level Security)
-- ============================================================
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Flows: user can only see/modify their own flows
CREATE POLICY flows_select ON public.flows FOR SELECT USING (user_id = auth.uid());
CREATE POLICY flows_insert ON public.flows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY flows_update ON public.flows FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY flows_delete ON public.flows FOR DELETE USING (user_id = auth.uid());

-- Flow Columns: accessible if user owns the parent flow
CREATE POLICY flow_columns_select ON public.flow_columns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY flow_columns_insert ON public.flow_columns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY flow_columns_update ON public.flow_columns FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY flow_columns_delete ON public.flow_columns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));

-- Cards: accessible if user owns the parent flow
CREATE POLICY cards_select ON public.cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY cards_insert ON public.cards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY cards_update ON public.cards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));
CREATE POLICY cards_delete ON public.cards FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.flows WHERE id = flow_id AND user_id = auth.uid()));

-- Tasks: accessible if user owns the parent flow (via card → flow)
CREATE POLICY tasks_select ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cards c
    JOIN public.flows f ON f.id = c.flow_id
    WHERE c.id = card_id AND f.user_id = auth.uid()
  ));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cards c
    JOIN public.flows f ON f.id = c.flow_id
    WHERE c.id = card_id AND f.user_id = auth.uid()
  ));
CREATE POLICY tasks_update ON public.tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cards c
    JOIN public.flows f ON f.id = c.flow_id
    WHERE c.id = card_id AND f.user_id = auth.uid()
  ));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cards c
    JOIN public.flows f ON f.id = c.flow_id
    WHERE c.id = card_id AND f.user_id = auth.uid()
  ));
```

### 2.3 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PK type | UUID | Supabase default, no sequential leaks |
| Soft delete | **No** | Simplicidade. CASCADE deletes. Backups via Supabase |
| Timestamps | TIMESTAMPTZ | Timezone-safe |
| `order_index` | INTEGER | Simples reordering. Gap strategy (10, 20, 30...) |
| RLS | Via `flows.user_id` | Single ownership chain: flow → columns → cards → tasks |
| Priority enum | CHECK constraint | Simples, sem tabela extra. P1/P2/P3 |
| Status enum | CHECK constraint | open/in_progress/done/blocked |

### 2.4 Index Strategy

| Index | Purpose | Query Pattern |
|-------|---------|---------------|
| `idx_flows_user_id` | List user's flows | `GET /api/flows` |
| `idx_flow_columns_order` | Ordered columns | `GET /api/flows/:id` with columns |
| `idx_cards_column_order` | Cards in column order | Kanban render |
| `idx_tasks_card_id` | Tasks per card | Card detail view |
| `idx_tasks_status` | Filter tasks by status | Task filtering |
| `idx_tasks_due_date` | Upcoming due dates | Dashboard/alerts (partial index) |

---

## 3. API Architecture

### 3.1 Route Mounting (app.ts changes)

```typescript
// Add to packages/backend/src/app.ts
import flowRoutes from './routes/flows';
import cardRoutes from './routes/cards';
import taskRoutes from './routes/tasks';

app.use('/api/flows', flowRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/tasks', taskRoutes);
```

### 3.2 Flows API

#### `GET /api/flows`
List all flows for authenticated user.

```typescript
// Request
GET /api/flows
Authorization: Bearer <token>

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Pipeline de Vendas",
      "description": "Fluxo principal",
      "column_count": 4,
      "card_count": 12,
      "created_at": "2026-03-12T00:00:00Z",
      "updated_at": "2026-03-12T00:00:00Z"
    }
  ]
}
```

#### `POST /api/flows`
Create flow with default columns.

```typescript
// Request
POST /api/flows
{ "name": "Pipeline de Vendas", "description": "..." }

// Response 201
{
  "data": {
    "id": "uuid",
    "name": "Pipeline de Vendas",
    "description": "...",
    "columns": [
      { "id": "uuid", "name": "Backlog", "color": "#6B7280", "order_index": 0 },
      { "id": "uuid", "name": "A Fazer", "color": "#3B82F6", "order_index": 1 },
      { "id": "uuid", "name": "Em Progresso", "color": "#F59E0B", "order_index": 2 },
      { "id": "uuid", "name": "Finalizado", "color": "#10B981", "order_index": 3 }
    ],
    "created_at": "2026-03-12T00:00:00Z"
  }
}
```

**Behavior:** Auto-creates 4 default columns on flow creation (single transaction).

#### `GET /api/flows/:flowId`
Get flow with columns and cards (full Kanban state).

```typescript
// Response 200
{
  "data": {
    "id": "uuid",
    "name": "Pipeline de Vendas",
    "columns": [
      {
        "id": "uuid",
        "name": "Backlog",
        "color": "#6B7280",
        "order_index": 0,
        "cards": [
          {
            "id": "uuid",
            "title": "Cliente ABC",
            "description": "...",
            "order_index": 0,
            "task_summary": { "total": 5, "done": 2, "open": 3 },
            "created_at": "2026-03-12T00:00:00Z"
          }
        ]
      }
    ]
  }
}
```

**Note:** `task_summary` is computed server-side via subquery count.

#### `PUT /api/flows/:flowId`
Update flow name/description.

```typescript
// Request
PUT /api/flows/:flowId
{ "name": "Novo Nome" }

// Response 200
{ "data": { "id": "uuid", "name": "Novo Nome", ... } }
```

#### `DELETE /api/flows/:flowId`
Delete flow (CASCADE: columns, cards, tasks).

```typescript
// Response 204 (no body)
```

#### `POST /api/flows/:flowId/columns`
Add column to flow.

```typescript
// Request
POST /api/flows/:flowId/columns
{ "name": "Em Review", "color": "#8B5CF6" }

// Response 201
{ "data": { "id": "uuid", "name": "Em Review", "color": "#8B5CF6", "order_index": 4 } }
```

**Behavior:** `order_index` auto-set to `MAX(order_index) + 1`.

#### `PUT /api/flows/:flowId/columns/:columnId`
Update column (name, color, order).

```typescript
// Request
PUT /api/flows/:flowId/columns/:columnId
{ "name": "Revisão", "color": "#EC4899" }
```

#### `PUT /api/flows/:flowId/columns/reorder`
Reorder all columns.

```typescript
// Request
PUT /api/flows/:flowId/columns/reorder
{ "column_ids": ["uuid-1", "uuid-3", "uuid-2", "uuid-4"] }

// Response 200
{ "data": { "columns": [...] } }
```

#### `DELETE /api/flows/:flowId/columns/:columnId`
Delete column. Fails if column has cards (must move cards first).

```typescript
// Response 204 (no body)
// Response 409 if column has cards
{ "error": "Cannot delete column with cards. Move cards first." }
```

---

### 3.3 Cards API

#### `GET /api/cards?flowId=X`
List cards for a flow.

```typescript
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "flow_id": "uuid",
      "column_id": "uuid",
      "column_name": "Backlog",
      "title": "Cliente ABC",
      "description": "...",
      "order_index": 0,
      "task_summary": { "total": 5, "done": 2, "open": 3 },
      "created_at": "2026-03-12T00:00:00Z"
    }
  ]
}
```

#### `POST /api/cards`
Create card in a column.

```typescript
// Request
POST /api/cards
{
  "flow_id": "uuid",
  "column_id": "uuid",
  "title": "Novo Cliente",
  "description": "Descrição opcional"
}

// Response 201
{ "data": { "id": "uuid", "title": "Novo Cliente", "order_index": 0, ... } }
```

**Behavior:** `order_index` auto-set to `MAX(order_index) + 1` within column.

#### `GET /api/cards/:cardId`
Get card with all tasks.

```typescript
// Response 200
{
  "data": {
    "id": "uuid",
    "title": "Cliente ABC",
    "description": "...",
    "column_id": "uuid",
    "column_name": "Em Progresso",
    "flow_id": "uuid",
    "flow_name": "Pipeline de Vendas",
    "tasks": [
      {
        "id": "uuid",
        "title": "Enviar proposta",
        "priority": "P1",
        "status": "open",
        "due_date": "2026-03-15",
        "assigned_to": null
      }
    ],
    "created_at": "2026-03-12T00:00:00Z"
  }
}
```

#### `PUT /api/cards/:cardId`
Update card (title, description, move to another column).

```typescript
// Move card to different column
PUT /api/cards/:cardId
{ "column_id": "new-column-uuid", "order_index": 2 }
```

**Behavior on column move:** Recompute `order_index` of affected cards in both old and new columns.

#### `PUT /api/cards/reorder`
Batch reorder cards (drag-drop result).

```typescript
// Request
PUT /api/cards/reorder
{
  "moves": [
    { "card_id": "uuid-1", "column_id": "uuid-col", "order_index": 0 },
    { "card_id": "uuid-2", "column_id": "uuid-col", "order_index": 1 }
  ]
}
```

**Behavior:** Single transaction updating all affected cards.

#### `DELETE /api/cards/:cardId`
Delete card (CASCADE: tasks).

```typescript
// Response 204
```

---

### 3.4 Tasks API

#### `GET /api/tasks?cardId=X`
List tasks for a card.

```typescript
// Query params: cardId (required), status (optional), priority (optional)
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "card_id": "uuid",
      "title": "Enviar proposta",
      "priority": "P1",
      "status": "open",
      "due_date": "2026-03-15",
      "assigned_to": null,
      "created_at": "2026-03-12T00:00:00Z"
    }
  ]
}
```

#### `POST /api/tasks`
Create task.

```typescript
// Request
POST /api/tasks
{
  "card_id": "uuid",
  "title": "Enviar proposta",
  "priority": "P1",
  "due_date": "2026-03-15"
}

// Response 201
{ "data": { "id": "uuid", "title": "Enviar proposta", "status": "open", ... } }
```

#### `PUT /api/tasks/:taskId`
Update task.

```typescript
// Request
PUT /api/tasks/:taskId
{ "status": "done", "priority": "P2" }

// Response 200
{ "data": { "id": "uuid", "status": "done", ... } }
```

#### `DELETE /api/tasks/:taskId`
Delete task.

```typescript
// Response 204
```

---

### 3.5 Error Handling Pattern

Consistent error format across all endpoints:

```typescript
// Error response structure
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INTERNAL_ERROR",
  "details": {}  // optional, validation errors
}

// HTTP Status mapping
// 400 → VALIDATION_ERROR (missing/invalid fields)
// 401 → UNAUTHORIZED (no/invalid token)
// 403 → FORBIDDEN (not owner)
// 404 → NOT_FOUND (resource doesn't exist)
// 409 → CONFLICT (e.g., delete column with cards)
// 500 → INTERNAL_ERROR (unexpected)
```

### 3.6 Validation Rules

| Endpoint | Field | Rule |
|----------|-------|------|
| POST /flows | name | Required, 1-255 chars |
| POST /columns | name | Required, 1-255 chars |
| POST /cards | title | Required, 1-255 chars |
| POST /cards | flow_id | Required, valid UUID |
| POST /cards | column_id | Required, valid UUID, must belong to flow |
| POST /tasks | title | Required, 1-255 chars |
| POST /tasks | card_id | Required, valid UUID |
| POST /tasks | priority | Optional, one of: P1, P2, P3 |
| POST /tasks | status | Optional, one of: open, in_progress, done, blocked |
| POST /tasks | due_date | Optional, valid ISO date |

---

## 4. Backend Architecture

### 4.1 File Structure

```
packages/backend/src/
├── routes/
│   ├── flows.ts          # Route definitions (replace mocks)
│   ├── cards.ts           # Route definitions (replace mocks)
│   └── tasks.ts           # Route definitions (replace mocks)
├── controllers/
│   ├── flow.controller.ts  # NEW: Request handling + validation
│   ├── card.controller.ts  # NEW: Request handling + validation
│   └── task.controller.ts  # NEW: Request handling + validation
├── lib/
│   └── supabase.ts        # EXISTING: Supabase client
├── middleware/
│   └── auth.middleware.ts  # EXISTING: JWT auth
└── types/
    └── taskflow.types.ts   # NEW: Shared TypeScript types
```

### 4.2 Controller Pattern

Follow existing `webhook.service.ts` pattern — direct Supabase queries in controllers (no service layer needed at this scale).

```typescript
// Example: flow.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

export async function listFlows(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('flows')
    .select(`
      id, name, description, created_at, updated_at,
      flow_columns(count),
      cards(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }

  return res.json({ data });
}
```

### 4.3 TypeScript Types

```typescript
// packages/backend/src/types/taskflow.types.ts

export interface Flow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlowColumn {
  id: string;
  flow_id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

export interface Card {
  id: string;
  flow_id: string;
  column_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  card_id: string;
  title: string;
  description: string | null;
  priority: 'P1' | 'P2' | 'P3';
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Request DTOs
export interface CreateFlowDTO {
  name: string;
  description?: string;
}

export interface CreateCardDTO {
  flow_id: string;
  column_id: string;
  title: string;
  description?: string;
}

export interface CreateTaskDTO {
  card_id: string;
  title: string;
  description?: string;
  priority?: 'P1' | 'P2' | 'P3';
  due_date?: string;
}

export interface MoveCardDTO {
  column_id: string;
  order_index: number;
}

export interface ReorderCardsDTO {
  moves: Array<{ card_id: string; column_id: string; order_index: number }>;
}

// Response enrichments
export interface TaskSummary {
  total: number;
  done: number;
  open: number;
}

export interface CardWithSummary extends Card {
  task_summary: TaskSummary;
}

export interface FlowWithColumns extends Flow {
  columns: (FlowColumn & { cards: CardWithSummary[] })[];
}
```

---

## 5. Frontend Architecture

### 5.1 File Structure

```
packages/frontend/src/
├── hooks/
│   ├── useFlows.ts        # NEW: Flow CRUD + state
│   ├── useCards.ts         # NEW: Card CRUD + drag-drop
│   ├── useTasks.ts         # NEW: Task CRUD
│   └── useKanban.ts        # EXISTING: Adapt to use useCards
├── services/
│   └── taskflow.api.ts     # NEW: API client (fetch wrapper)
├── components/
│   ├── KanbanBoard.tsx     # EXISTING: Refactor to use hooks
│   ├── Card.tsx            # EXISTING: Adapt props
│   ├── Column.tsx          # EXISTING: Adapt props
│   ├── CardDetailModal.tsx # NEW: Card detail with tasks
│   ├── TaskList.tsx         # EXISTING: Connect to API
│   ├── TaskForm.tsx         # EXISTING: Connect to API
│   ├── FlowSidebar.tsx     # NEW (Phase 3): Flow navigation
│   └── ListView.tsx         # NEW (Phase 3): List view
├── types/
│   └── taskflow.ts         # NEW: Frontend types (mirror backend)
└── pages/ (or app/)
    └── flows/
        ├── index.tsx        # NEW: Flow list / default flow
        └── [flowId].tsx     # NEW: Flow detail (Kanban/List)
```

### 5.2 API Client

```typescript
// packages/frontend/src/services/taskflow.api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',  // send cookies (JWT)
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const flowsApi = {
  list: () => request<{ data: Flow[] }>('/api/flows'),
  get: (id: string) => request<{ data: FlowWithColumns }>(`/api/flows/${id}`),
  create: (dto: CreateFlowDTO) => request<{ data: Flow }>('/api/flows', {
    method: 'POST', body: JSON.stringify(dto)
  }),
  update: (id: string, dto: Partial<Flow>) => request<{ data: Flow }>(`/api/flows/${id}`, {
    method: 'PUT', body: JSON.stringify(dto)
  }),
  delete: (id: string) => request<void>(`/api/flows/${id}`, { method: 'DELETE' }),
  addColumn: (flowId: string, dto: { name: string; color?: string }) =>
    request<{ data: FlowColumn }>(`/api/flows/${flowId}/columns`, {
      method: 'POST', body: JSON.stringify(dto)
    }),
  reorderColumns: (flowId: string, columnIds: string[]) =>
    request(`/api/flows/${flowId}/columns/reorder`, {
      method: 'PUT', body: JSON.stringify({ column_ids: columnIds })
    }),
};

export const cardsApi = {
  list: (flowId: string) => request<{ data: Card[] }>(`/api/cards?flowId=${flowId}`),
  get: (id: string) => request<{ data: CardWithTasks }>(`/api/cards/${id}`),
  create: (dto: CreateCardDTO) => request<{ data: Card }>('/api/cards', {
    method: 'POST', body: JSON.stringify(dto)
  }),
  update: (id: string, dto: Partial<Card>) => request<{ data: Card }>(`/api/cards/${id}`, {
    method: 'PUT', body: JSON.stringify(dto)
  }),
  reorder: (moves: ReorderCardsDTO) => request('/api/cards/reorder', {
    method: 'PUT', body: JSON.stringify(moves)
  }),
  delete: (id: string) => request<void>(`/api/cards/${id}`, { method: 'DELETE' }),
};

export const tasksApi = {
  list: (cardId: string) => request<{ data: Task[] }>(`/api/tasks?cardId=${cardId}`),
  create: (dto: CreateTaskDTO) => request<{ data: Task }>('/api/tasks', {
    method: 'POST', body: JSON.stringify(dto)
  }),
  update: (id: string, dto: Partial<Task>) => request<{ data: Task }>(`/api/tasks/${id}`, {
    method: 'PUT', body: JSON.stringify(dto)
  }),
  delete: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
};
```

### 5.3 React Hooks

#### `useFlows`

```typescript
// packages/frontend/src/hooks/useFlows.ts
export function useFlows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetchFlows, createFlow, updateFlow, deleteFlow
  // Returns: { flows, loading, error, createFlow, updateFlow, deleteFlow, refetch }
}
```

#### `useCards`

```typescript
// packages/frontend/src/hooks/useCards.ts
export function useCards(flowId: string) {
  // Manages cards state for a specific flow
  // Handles drag-drop via reorder API
  // Returns: { cards, loading, error, createCard, updateCard, deleteCard, moveCard, refetch }
}
```

#### `useTasks`

```typescript
// packages/frontend/src/hooks/useTasks.ts
export function useTasks(cardId: string) {
  // Manages tasks for a specific card
  // Returns: { tasks, loading, error, createTask, updateTask, deleteTask, refetch }
}
```

### 5.4 Component Hierarchy

```
App
├── FlowSidebar (Phase 3)
│   └── FlowListItem (click → navigate to flow)
│
└── FlowPage (flows/[flowId].tsx)
    ├── FlowHeader (name, description, view toggle)
    │
    ├── KanbanView (default)
    │   └── KanbanBoard
    │       └── Column (per flow_column)
    │           └── Card (draggable)
    │               └── TaskSummaryBadge (3/5 done)
    │
    ├── ListView (Phase 3, toggle)
    │   └── CardRow (per card)
    │       └── TaskInlineList
    │
    └── CardDetailModal (on card click)
        ├── CardInfo (title, description, column)
        ├── TaskList (all tasks)
        ├── TaskForm (add task)
        └── CommentSection (existing, Phase 4)
```

### 5.5 State Management

**Approach:** Local state via hooks. No global store needed.

```
FlowPage
  ├── useFlows()      → flow list (sidebar)
  ├── useCards(flowId) → cards for current flow (kanban/list)
  └── useTasks(cardId) → tasks (loaded on card click, inside modal)
```

**Optimistic updates for drag-drop:**
1. User drops card → Update local state immediately
2. Call `cardsApi.reorder()` in background
3. On error → Revert local state + show toast

---

## 6. Integration Points

### 6.1 Authentication

- **Existing:** `authMiddleware` in `packages/backend/src/middleware/auth.middleware.ts`
- **Pattern:** JWT in cookie or `Authorization: Bearer` header
- **User object:** `req.user = { id: number, email: string }`
- **Action needed:** All TaskFlow routes must use `authMiddleware`

```typescript
// Route mounting
router.get('/', authMiddleware, listFlows);
router.post('/', authMiddleware, createFlow);
```

**Note:** Current auth uses `id: number`. DB schema uses `UUID REFERENCES auth.users(id)`. The controller must bridge this — either:
1. Use Supabase service role client (bypasses RLS, filter by user_id manually), or
2. Map JWT user ID to Supabase auth.users UUID

**Recommendation:** Option 1 (service role + manual filter) — matches existing webhook.service.ts pattern.

### 6.2 Supabase Client

- **Existing:** `packages/backend/src/lib/supabase.ts`
- **Client:** `supabase` (service role, bypasses RLS)
- **Pattern:** Direct queries, `if (error) throw error`

### 6.3 WebSocket (Phase 4 — Optional)

- **Existing:** `useWebSocket.ts` hook with reconnect logic
- **Pattern:** Subscribe to channels, `window.dispatchEvent`
- **Future use:** Real-time card movements, task updates
- **Not needed for MVP**

---

## 7. Known Issues to Fix

| Issue | Location | Fix |
|-------|----------|-----|
| Routes not mounted in app.ts | `app.ts` | Add `app.use('/api/flows', ...)` |
| `types/user.ts` deleted | git status | Recreate or inline types |
| Auth import inconsistency | Some route files import `../middleware/auth` | Standardize to `auth.middleware` |
| Mock routes | `routes/flows.ts`, `cards.ts`, `tasks.ts` | Replace with real controllers |

---

## 8. Implementation Phases (Stories)

| Story | Scope | Depends On | Deliverable |
|-------|-------|------------|-------------|
| **S1: DB Schema** | Create 4 tables + RLS + indexes | — | Migration SQL applied |
| **S2: Types + Controllers** | Backend types + flow/card/task controllers | S1 | Working API endpoints |
| **S3: Route Wiring** | Mount routes in app.ts, fix auth imports | S2 | API accessible via HTTP |
| **S4: Frontend API Client** | `taskflow.api.ts` + hooks | S3 | Hooks fetching real data |
| **S5: Kanban Integration** | Connect KanbanBoard to hooks + drag-drop | S4 | Working Kanban with real data |
| **S6: Card Detail + Tasks** | CardDetailModal + task CRUD | S4 | Card detail with tasks |
| **S7: Multi-View + Nav** | ListView + FlowSidebar + view toggle | S5, S6 | Complete navigation |

---

## 9. Non-Functional Requirements

| NFR | Target | How |
|-----|--------|-----|
| **Response time** | < 200ms for list operations | Indexed queries, no N+1 |
| **Drag-drop latency** | < 100ms perceived | Optimistic updates |
| **Max cards/flow** | 500 | Pagination if exceeded (Phase 4) |
| **Max tasks/card** | 100 | Reasonable for client management |
| **Concurrent users** | 10-50 | Supabase handles this |
| **Data isolation** | Per user | RLS policies + service role filter |

---

*— Aria, arquitetando o futuro 🏗️*
