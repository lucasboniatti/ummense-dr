import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './composite/Table';
import { Badge } from './ui/Badge';

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
  const priorityVariant = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'destructive';
      case 'P2':
        return 'warning';
      case 'P3':
        return 'default';
      default:
        return 'default';
    }
  };

  const sortIcon = (column: string) => sortColumn === column ? ' ↓' : '';

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('title')}
            >
              Title{sortIcon('title')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('priority')}
            >
              Priority{sortIcon('priority')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('dueDate')}
            >
              Due Date{sortIcon('dueDate')}
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-semibold">{task.title}</TableCell>
              <TableCell>
                <Badge variant={priorityVariant(task.priority)}>
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-neutral-600">{task.dueDate || '-'}</TableCell>
              <TableCell>
                <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                  {task.status === 'completed' ? '✓ Done' : 'Open'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
