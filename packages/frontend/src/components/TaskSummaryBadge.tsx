import React from 'react';
import type { TaskSummary } from '../types/taskflow';

interface TaskSummaryBadgeProps {
  summary: TaskSummary;
}

export function TaskSummaryBadge({ summary }: TaskSummaryBadgeProps) {
  const label =
    summary.total > 0
      ? `${summary.done}/${summary.total} done`
      : '0/0 done';

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      {label}
    </span>
  );
}
