import React, { useState } from 'react';
import type { TaskPriority } from '../types/taskflow';

interface TaskFormProps {
  onSubmit?: (task: {
    title: string;
    priority: TaskPriority;
    due_date?: string | null;
  }) => Promise<void> | void;
  submitting?: boolean;
}

export function TaskForm({ onSubmit, submitting = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P3');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await onSubmit?.({
        title: title.trim(),
        priority,
        due_date: dueDate || null,
      });
      setTitle('');
      setDueDate('');
      setPriority('P3');
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
          disabled={submitting}
        />
      </div>
      <div className="mb-3 flex gap-2">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as TaskPriority)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={submitting}
        >
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
          <option value="P3">P3 - Low</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={submitting}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
      >
        {submitting ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}
