import React, { useState } from 'react';

interface Task {
  id: number;
  title: string;
  card: string;
  priority: 'P1' | 'P2' | 'P3';
  dueDate?: string;
  status: 'open' | 'completed';
}

export function Dashboard() {
  const [tasks] = useState<Task[]>([
    {
      id: 1,
      title: 'Setup database',
      card: 'Project A',
      priority: 'P1',
      dueDate: '2026-03-05',
      status: 'open',
    },
    {
      id: 2,
      title: 'Configure API',
      card: 'Project A',
      priority: 'P1',
      dueDate: '2026-03-10',
      status: 'open',
    },
    {
      id: 3,
      title: 'Write documentation',
      card: 'Project B',
      priority: 'P2',
      dueDate: '2026-03-15',
      status: 'open',
    },
  ]);

  const [filterPriority, setFilterPriority] = useState<string>('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const filteredTasks = tasks.filter(task => {
    if (filterPriority && task.priority !== filterPriority) return false;
    if (dateRange.from && task.dueDate && task.dueDate < dateRange.from)
      return false;
    if (dateRange.to && task.dueDate && task.dueDate > dateRange.to)
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All Priorities</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Medium</option>
            <option value="P3">P3 - Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">From Date</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={e =>
              setDateRange({ ...dateRange, from: e.target.value })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">To Date</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Card</th>
              <th className="border p-2 text-left">Priority</th>
              <th className="border p-2 text-left">Due Date</th>
              <th className="border p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border p-2">{task.title}</td>
                <td className="border p-2">{task.card}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      task.priority === 'P1'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'P2'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
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
    </div>
  );
}

export default Dashboard;
