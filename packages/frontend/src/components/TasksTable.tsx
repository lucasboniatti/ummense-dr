import React from 'react';

interface Task {
  id: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  dueDate?: string;
  status: 'open' | 'completed';
}

interface TasksTableProps {
  tasks: Task[];
  onSort?: (column: string) => void;
  sortColumn?: string;
}

export function TasksTable({ tasks, onSort, sortColumn }: TasksTableProps) {
  const priorityColors: Record<string, string> = {
    P1: 'bg-red-100 text-red-800',
    P2: 'bg-yellow-100 text-yellow-800',
    P3: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => onSort?.('title')}
            >
              Title {sortColumn === 'title' && '↓'}
            </th>
            <th
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => onSort?.('priority')}
            >
              Priority {sortColumn === 'priority' && '↓'}
            </th>
            <th
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => onSort?.('dueDate')}
            >
              Due Date {sortColumn === 'dueDate' && '↓'}
            </th>
            <th className="border p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="border p-2">{task.title}</td>
              <td className="border p-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="border p-2">{task.dueDate || '-'}</td>
              <td className="border p-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {task.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
