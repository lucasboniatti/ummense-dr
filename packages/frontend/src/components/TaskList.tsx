import React from 'react';

interface Task {
  id: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  dueDate?: string;
  status: 'open' | 'completed';
  cardId: number;
}

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskComplete?: (taskId: number) => void;
}

export function TaskList({ tasks, onTaskClick, onTaskComplete }: TaskListProps) {
  const priorityColors: Record<string, string> = {
    P1: 'bg-red-100 text-red-800',
    P2: 'bg-yellow-100 text-warning-800',
    P3: 'bg-blue-100 text-blue-800',
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { P1: 0, P2: 1, P3: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  return (
    <div className="space-y-2">
      {sortedTasks.map(task => (
        <div
          key={task.id}
          className="flex items-center p-3 bg-white rounded-lg border border-neutral-200 hover:border-neutral-400 cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={e => {
              e.stopPropagation();
              onTaskComplete?.(task.id);
            }}
            className="mr-3"
          />
          <span className={`${priorityColors[task.priority]} px-2 py-1 rounded text-xs font-semibold mr-3`}>
            {task.priority}
          </span>
          <span className={task.status === 'completed' ? 'line-through text-neutral-500' : ''}>
            {task.title}
          </span>
          {task.dueDate && (
            <span className="ml-auto text-sm text-neutral-600">{task.dueDate}</span>
          )}
        </div>
      ))}
    </div>
  );
}
