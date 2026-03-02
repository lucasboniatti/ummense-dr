import React, { useState } from 'react';

interface TaskFormProps {
  cardId: number;
  onSubmit?: (task: {
    title: string;
    priority: string;
    dueDate?: string;
  }) => void;
}

export function TaskForm({ cardId, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P3');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit?.({ title, priority, dueDate });
      setTitle('');
      setDueDate('');
      setPriority('P3');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-50 rounded-lg">
      <div className="mb-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full px-2 py-1 text-sm border rounded"
          required
        />
      </div>
      <div className="flex gap-2 mb-2">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border rounded"
        >
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
          <option value="P3">P3 - Low</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border rounded"
        />
      </div>
      <button
        type="submit"
        className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Task
      </button>
    </form>
  );
}
