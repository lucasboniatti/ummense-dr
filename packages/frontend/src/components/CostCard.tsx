'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';

interface CostCardProps {
  dbCost: number;
  s3Cost: number;
  monthlySavings: number;
  sevenYearProjection: number;
  trend?: 'up' | 'down' | 'stable';
}

export function CostCard({
  dbCost,
  s3Cost,
  monthlySavings,
  sevenYearProjection,
  trend = 'stable',
}: CostCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cost Analysis</span>
          <Badge variant={trend === 'up' ? 'error' : trend === 'down' ? 'success' : 'default'}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-600">DB Cost</p>
            <p className="text-lg font-bold">{formatCurrency(dbCost)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-600">S3 Cost</p>
            <p className="text-lg font-bold text-success-600">{formatCurrency(s3Cost)}</p>
          </div>
        </div>
        <div className="border-t border-neutral-200 pt-4">
          <p className="text-xs text-neutral-600">Monthly Savings</p>
          <p className="text-2xl font-bold text-success-600">{formatCurrency(monthlySavings)}</p>
        </div>
        <div className="bg-primary-50 p-3 rounded-md">
          <p className="text-xs text-primary-700">7-Year Projection</p>
          <p className="text-lg font-bold text-primary-900">{formatCurrency(sevenYearProjection)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
