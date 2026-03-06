import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { KanbanBoard } from '../components/KanbanBoard';
import { KanbanCard, KanbanColumn } from '../hooks/useKanban';

type FilterStatus = 'all' | 'active' | 'completed' | 'blocked';

function percentile95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function buildDataset(totalCards = 500, columnsCount = 5): KanbanColumn[] {
  const columns: KanbanColumn[] = [];
  const statuses: Array<'active' | 'completed' | 'blocked'> = ['active', 'completed', 'blocked'];

  for (let columnIndex = 0; columnIndex < columnsCount; columnIndex += 1) {
    const cards: KanbanCard[] = [];

    for (let cardIndex = 0; cardIndex < Math.floor(totalCards / columnsCount); cardIndex += 1) {
      const id = columnIndex * 1000 + cardIndex + 1;
      const status = statuses[id % statuses.length];
      cards.push({
        id,
        title: `Card ${id} Operacao`,
        description: `Descricao ${id} para benchmark`,
        status,
        rawStatus: status,
        responsible: `Responsavel ${id % 20}`,
        progress: {
          total: 10,
          completed: status === 'completed' ? 10 : status === 'active' ? 5 : 2,
          percent: status === 'completed' ? 100 : status === 'active' ? 50 : 20,
        },
        tasksSummary: {
          open: 3,
          inProgress: 4,
          completed: 3,
          blocked: status === 'blocked' ? 1 : 0,
        },
        tags: [
          { id: id * 10, name: `TAG-${id % 10}`, color: '#2563eb' },
          { id: id * 10 + 1, name: 'OPS', color: '#059669' },
        ],
        contacts: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        columnId: columnIndex + 1,
      });
    }

    columns.push({
      id: columnIndex + 1,
      name: `Coluna ${columnIndex + 1}`,
      order: columnIndex,
      cards,
    });
  }

  return columns;
}

function filterCard(card: KanbanCard, column: KanbanColumn, search: string, status: FilterStatus): boolean {
  if (status !== 'all' && card.status !== status) {
    return false;
  }

  if (!search) {
    return true;
  }

  const haystack = [
    card.title,
    card.description || '',
    card.responsible || '',
    column.name,
    card.tags?.map((tag) => tag.name).join(' ') || '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

test('performance: board initial render p95 <= 2000ms with 500 cards', () => {
  const columns = buildDataset(500, 5);
  const durations: number[] = [];

  for (let iteration = 0; iteration < 15; iteration += 1) {
    const start = performance.now();
    renderToString(
      <KanbanBoard
        columns={columns}
        isCardPending={() => false}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDropColumn={() => {}}
      />
    );
    durations.push(performance.now() - start);
  }

  const p95 = percentile95(durations);
  assert.ok(p95 <= 2000, `expected p95 <= 2000ms, received ${p95.toFixed(2)}ms`);
});

test('performance: filter pipeline p95 <= 300ms with 500 cards across views', () => {
  const columns = buildDataset(500, 5);
  const durations: number[] = [];
  const searches = ['card 1', 'ops', 'responsavel 3', 'coluna 2', 'nao-encontra'];
  const statuses: FilterStatus[] = ['all', 'active', 'completed', 'blocked'];

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const search = normalizeText(searches[iteration % searches.length]);
    const status = statuses[iteration % statuses.length];
    const start = performance.now();

    // Board view filter
    const boardFiltered = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => filterCard(card, column, search, status)),
    }));

    // Table view rows
    const tableRows = boardFiltered.flatMap((column) => column.cards.map((card) => ({ ...card, column })));

    // Indicators view aggregation
    tableRows.reduce(
      (acc, row) => {
        if (row.status === 'completed') acc.completed += 1;
        else if (row.status === 'blocked') acc.blocked += 1;
        else acc.active += 1;
        return acc;
      },
      { active: 0, completed: 0, blocked: 0 }
    );

    durations.push(performance.now() - start);
  }

  const p95 = percentile95(durations);
  assert.ok(p95 <= 300, `expected p95 <= 300ms, received ${p95.toFixed(2)}ms`);
});
