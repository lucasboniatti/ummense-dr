import React from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import type { Task, TaskPriority, UpdateTaskDTO } from '../types/taskflow';

interface TaskListProps {
  tasks: Task[];
  busyTaskId?: string | null;
  deletingTaskId?: string | null;
  onTaskStatusToggle?: (task: Task) => Promise<void> | void;
  onTaskUpdate?: (
    taskId: string,
    payload: UpdateTaskDTO
  ) => Promise<void> | void;
  onTaskDelete?: (task: Task) => Promise<void> | void;
}

type EditableField = 'title' | 'priority' | 'due_date';

const priorityOrder: Record<TaskPriority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
};

const priorityColors: Record<TaskPriority, string> = {
  P1: 'bg-red-100 text-red-800',
  P2: 'bg-yellow-100 text-yellow-800',
  P3: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<Task['status'], string> = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-rose-100 text-rose-700',
};

function formatDueDate(value: string | null) {
  if (!value) {
    return 'No due date';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export function TaskList({
  tasks,
  busyTaskId,
  deletingTaskId,
  onTaskStatusToggle,
  onTaskUpdate,
  onTaskDelete,
}: TaskListProps) {
  const [editingField, setEditingField] = React.useState<{
    taskId: string;
    field: EditableField;
  } | null>(null);
  const [draftValue, setDraftValue] = React.useState('');

  const startEditing = (task: Task, field: EditableField) => {
    setEditingField({ taskId: task.id, field });
    setDraftValue(
      field === 'due_date'
        ? task.due_date || ''
        : field === 'priority'
          ? task.priority
          : task.title
    );
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const commitEdit = async (task: Task) => {
    if (!editingField || editingField.taskId !== task.id || !onTaskUpdate) {
      cancelEditing();
      return;
    }

    if (editingField.field === 'title') {
      const nextTitle = draftValue.trim();

      if (!nextTitle || nextTitle === task.title) {
        cancelEditing();
        return;
      }

      await onTaskUpdate(task.id, { title: nextTitle });
      cancelEditing();
      return;
    }

    if (editingField.field === 'priority') {
      const nextPriority = draftValue as TaskPriority;

      if (nextPriority === task.priority) {
        cancelEditing();
        return;
      }

      await onTaskUpdate(task.id, { priority: nextPriority });
      cancelEditing();
      return;
    }

    const nextDueDate = draftValue || null;

    if (nextDueDate === task.due_date) {
      cancelEditing();
      return;
    }

    await onTaskUpdate(task.id, { due_date: nextDueDate });
    cancelEditing();
  };

  const handlePriorityChange = async (
    task: Task,
    nextPriority: TaskPriority
  ) => {
    if (!onTaskUpdate) {
      cancelEditing();
      return;
    }

    if (nextPriority === task.priority) {
      cancelEditing();
      return;
    }

    try {
      await onTaskUpdate(task.id, { priority: nextPriority });
      cancelEditing();
    } catch {
      // Toast state is owned by the parent modal.
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
  });

  return (
    <div className="space-y-2">
      {sortedTasks.map(task => (
        <div
          key={task.id}
          className="rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => {
                void Promise.resolve(onTaskStatusToggle?.(task)).catch(
                  () => undefined
                );
              }}
              className="mt-1"
              disabled={busyTaskId === task.id || deletingTaskId === task.id}
            />

            <div className="min-w-0 flex-1">
              {editingField?.taskId === task.id &&
              editingField.field === 'title' ? (
                <input
                  type="text"
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onBlur={() => {
                    void commitEdit(task).catch(() => undefined);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void commitEdit(task).catch(() => undefined);
                    }

                    if (event.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(task, 'title')}
                  className={`block text-left text-sm font-medium text-gray-900 hover:text-blue-700 ${
                    task.status === 'done' ? 'line-through text-gray-500' : ''
                  }`}
                >
                  {task.title}
                </button>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {editingField?.taskId === task.id &&
                editingField.field === 'priority' ? (
                  <select
                    value={draftValue}
                    onChange={(event) => {
                      const nextPriority = event.target.value as TaskPriority;
                      setDraftValue(nextPriority);
                      void handlePriorityChange(task, nextPriority);
                    }}
                    onBlur={cancelEditing}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    autoFocus
                  >
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(task, 'priority')}
                    className={`${priorityColors[task.priority]} rounded px-2 py-1 text-xs font-semibold`}
                  >
                    {task.priority}
                  </button>
                )}

                <span
                  className={`${statusColors[task.status]} rounded px-2 py-1 text-xs font-medium`}
                >
                  {task.status}
                </span>

                {editingField?.taskId === task.id &&
                editingField.field === 'due_date' ? (
                  <input
                    type="date"
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    onBlur={() => {
                      void commitEdit(task).catch(() => undefined);
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(task, 'due_date')}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <Calendar size={12} />
                    {formatDueDate(task.due_date)}
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (!onTaskDelete) {
                    return;
                  }

                  const confirmed = window.confirm(
                    `Delete task "${task.title}"?`
                  );

                  if (!confirmed) {
                    return;
                  }

                  try {
                    await onTaskDelete(task);
                  } catch {
                    // Toast state is owned by the parent modal.
                  }
                })();
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              disabled={busyTaskId === task.id || deletingTaskId === task.id}
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
