export type TaskPriority = 'P1' | 'P2' | 'P3';

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'blocked';

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
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFlowDTO {
  name: string;
  description?: string | null;
}

export interface UpdateFlowDTO {
  name?: string;
  description?: string | null;
}

export interface CreateFlowColumnDTO {
  name: string;
  color?: string;
}

export interface UpdateFlowColumnDTO {
  name?: string;
  color?: string;
}

export interface ReorderColumnsDTO {
  column_ids: string[];
}

export interface CreateCardDTO {
  flow_id: string;
  column_id: string;
  title: string;
  description?: string | null;
}

export interface UpdateCardDTO {
  title?: string;
  description?: string | null;
  column_id?: string;
  order_index?: number;
}

export interface MoveCardDTO {
  card_id: string;
  column_id: string;
  order_index: number;
}

export interface ReorderCardsDTO {
  moves: MoveCardDTO[];
}

export interface CreateTaskDTO {
  card_id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  assigned_to?: string | null;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  assigned_to?: string | null;
}

export interface TaskSummary {
  total: number;
  done: number;
  open: number;
}

export interface CardWithSummary extends Card {
  column_name?: string | null;
  task_summary: TaskSummary;
}

export interface CardWithTasks extends Card {
  column_name: string;
  flow_name: string;
  tasks: Task[];
}

export interface FlowColumnWithCards extends FlowColumn {
  cards: CardWithSummary[];
}

export interface FlowWithColumns extends Flow {
  columns: FlowColumnWithCards[];
}
