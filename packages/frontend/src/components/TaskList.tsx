import React from 'react';
import { TaskItem } from './ui/TaskItem';

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
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { P1: 0, P2: 1, P3: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  const mapPriority = (priority: Task['priority']) => {
    if (priority === 'P1') return 'urgent';
    if (priority === 'P2') return 'high';
    return 'none';
  };

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => (
        <TaskItem
          key={task.id}
          title={task.title}
          category={task.priority}
          date={task.dueDate}
          isUrgent={task.priority === 'P1'}
          isCompleted={task.status === 'completed'}
          priority={mapPriority(task.priority)}
          assigneeFallback={`C${task.cardId}`}
          onToggle={() => onTaskComplete?.(task.id)}
          onClick={() => onTaskClick?.(task)}
        />
      ))}
    </div>
  );
}
