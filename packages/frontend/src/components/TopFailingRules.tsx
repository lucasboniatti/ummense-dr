import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './composite/Table';

interface Rule {
  rule_id: string;
  name: string;
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: string;
}

interface TopFailingRulesProps {
  rules: Rule[];
}

export const TopFailingRules: React.FC<TopFailingRulesProps> = ({ rules }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Failures (24h)</TableHead>
            <TableHead>Failure Rate</TableHead>
            <TableHead>Last Failure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.rule_id}>
              <TableCell className="font-medium text-neutral-900">{rule.name}</TableCell>
              <TableCell className="text-neutral-700">{rule.failures}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-error-500 rounded-full transition-all"
                      style={{ width: `${Math.min(rule.failureRate, 100)}%` }}
                    />
                  </div>
                  <span className="text-error-600 font-semibold min-w-12">
                    {rule.failureRate.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-neutral-600">
                {formatDateTime(rule.lastFailure)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
