import React from 'react';
import { ArrowDown, CheckCircle2 } from 'lucide-react';
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

  const sortIcon = (column: string) =>
    sortColumn === column ? <ArrowDown className="h-4 w-4" aria-hidden="true" /> : null;

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('title')}
            >
              <span className="inline-flex items-center gap-1">
                Titulo
                {sortIcon('title')}
              </span>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('priority')}
            >
              <span className="inline-flex items-center gap-1">
                Prioridade
                {sortIcon('priority')}
              </span>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100"
              onClick={() => onSort?.('dueDate')}
            >
              <span className="inline-flex items-center gap-1">
                Prazo
                {sortIcon('dueDate')}
              </span>
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
                  <span className="inline-flex items-center gap-1.5">
                    {task.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {task.status === 'completed' ? 'Concluida' : 'Aberta'}
                  </span>
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
