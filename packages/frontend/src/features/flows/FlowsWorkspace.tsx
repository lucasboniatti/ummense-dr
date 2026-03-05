import { useCallback, useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '../../components/KanbanBoard';
import {
  KanbanCard,
  KanbanColumn,
  useKanban,
} from '../../hooks/useKanban';
import {
  FlowCardItem,
  FlowCardStatus,
  FlowDetails,
  FlowIndicators,
  FlowListItem,
  flowsService,
} from '../../services/flows.service';

type ViewMode = 'board' | 'table' | 'indicators';
type FilterStatus = 'all' | 'active' | 'completed' | 'blocked';

interface FlowsWorkspaceProps {
  initialFlowId?: number | null;
}

interface FlatCardRow extends FlowCardItem {
  columnId: number;
  columnName: string;
  effectiveStatus: FlowCardStatus;
}

interface FlowOption extends Pick<FlowListItem, 'id' | 'name'> {}

const FALLBACK_FLOW_ID = 1;

const fallbackFlow: FlowDetails = {
  id: FALLBACK_FLOW_ID,
  name: 'Gestão 2.0 (Local)',
  userId: 'local-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  indicators: {
    activeCards: 4,
    completedCards: 1,
    blockedCards: 1,
    throughput: 2,
  },
  columns: [
    {
      id: 101,
      name: 'Onboarding',
      order: 0,
      cards: [
        {
          id: 9001,
          title: 'Agrocenter Solar',
          description: 'Estratégia e copy de onboarding 2.0',
          status: 'active',
          rawStatus: 'active',
          responsible: 'Lucas Boniatti',
          progress: { total: 10, completed: 4, percent: 40 },
          tasksSummary: { open: 4, inProgress: 2, completed: 4, blocked: 0 },
          tags: [{ id: 1, name: 'ONBOARDING', color: '#6d28d9' }],
          contacts: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 9002,
          title: 'Skyvia Turismo',
          description: 'Coletar aprovação de kickoff comercial',
          status: 'blocked',
          rawStatus: 'blocked',
          responsible: 'Time Comercial',
          progress: { total: 8, completed: 3, percent: 38 },
          tasksSummary: { open: 3, inProgress: 1, completed: 3, blocked: 1 },
          tags: [{ id: 2, name: 'FLOW PLUS IA', color: '#059669' }],
          contacts: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 102,
      name: 'Ativo',
      order: 1,
      cards: [
        {
          id: 9003,
          title: 'Digital Rockets',
          description: 'Execução de entregas semanais do squad',
          status: 'active',
          rawStatus: 'active',
          responsible: 'Equipe Operações',
          progress: { total: 14, completed: 8, percent: 57 },
          tasksSummary: { open: 2, inProgress: 4, completed: 8, blocked: 0 },
          tags: [{ id: 3, name: 'GESTÃO', color: '#2563eb' }],
          contacts: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 9004,
          title: 'CVs Energy',
          description: 'Follow-up de pendências técnicas',
          status: 'active',
          rawStatus: 'active',
          responsible: 'Samuel Sousa',
          progress: { total: 6, completed: 2, percent: 33 },
          tasksSummary: { open: 3, inProgress: 1, completed: 2, blocked: 0 },
          tags: [{ id: 4, name: 'OPERAÇÃO', color: '#0ea5e9' }],
          contacts: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 103,
      name: 'Finalizado',
      order: 2,
      cards: [
        {
          id: 9005,
          title: 'Rinnovare Solar Engenharia',
          description: 'Entrega final publicada e validada',
          status: 'completed',
          rawStatus: 'completed',
          responsible: 'Lucas Ferreira',
          progress: { total: 12, completed: 12, percent: 100 },
          tasksSummary: { open: 0, inProgress: 0, completed: 12, blocked: 0 },
          tags: [{ id: 5, name: 'SITE', color: '#db2777' }],
          contacts: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  ],
};

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function resolveEffectiveStatus(
  status: string | null | undefined,
  columnName: string
): FlowCardStatus {
  const normalizedStatus = normalizeText(status);
  const normalizedColumn = normalizeText(columnName);

  if (normalizedStatus === 'blocked' || normalizedStatus === 'bloqueado') {
    return 'blocked';
  }

  if (
    normalizedStatus === 'completed' ||
    normalizedStatus === 'done' ||
    normalizedStatus === 'finalizado'
  ) {
    return 'completed';
  }

  if (
    normalizedColumn.includes('final') ||
    normalizedColumn.includes('conclu') ||
    normalizedColumn.includes('done')
  ) {
    return 'completed';
  }

  return 'active';
}

function computeIndicators(rows: FlatCardRow[]): FlowIndicators {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return rows.reduce(
    (acc, row) => {
      if (row.effectiveStatus === 'completed') {
        acc.completedCards += 1;
        const updatedAt = new Date(row.updatedAt).getTime();
        if (!Number.isNaN(updatedAt) && updatedAt >= threshold) {
          acc.throughput += 1;
        }
      } else if (row.effectiveStatus === 'blocked') {
        acc.blockedCards += 1;
      } else {
        acc.activeCards += 1;
      }

      return acc;
    },
    {
      activeCards: 0,
      completedCards: 0,
      blockedCards: 0,
      throughput: 0,
    }
  );
}

function mapFlowToKanbanColumns(flow: FlowDetails): KanbanColumn[] {
  return [...flow.columns]
    .sort((a, b) => a.order - b.order)
    .map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      cards: column.cards.map((card) => ({
        ...card,
        columnId: column.id,
        status: resolveEffectiveStatus(card.status, column.name),
      })),
    }));
}

function getStoredToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('devToken');
  const tokenFromStorage = window.localStorage.getItem('synkra_dev_token');
  const token = tokenFromUrl || tokenFromStorage || '';

  if (tokenFromUrl) {
    window.localStorage.setItem('synkra_dev_token', tokenFromUrl);
  }

  return token;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function FlowsWorkspace({ initialFlowId = null }: FlowsWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [devToken, setDevToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [flowOptions, setFlowOptions] = useState<FlowOption[]>([
    { id: fallbackFlow.id, name: fallbackFlow.name },
  ]);
  const [selectedFlowId, setSelectedFlowId] = useState<number>(
    initialFlowId || fallbackFlow.id
  );
  const [initialColumns, setInitialColumns] = useState<KanbanColumn[]>(
    mapFlowToKanbanColumns(fallbackFlow)
  );
  const [isFallbackMode, setIsFallbackMode] = useState(true);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [hint, setHint] = useState<string | null>(
    'Sem token JWT. Exibindo fluxo local de fallback para smoke/UAT.'
  );
  const [error, setError] = useState<string | null>(null);

  const {
    columns,
    cardsCount,
    lastMoveError,
    startDrag,
    clearDrag,
    dropOnColumn,
    isCardPending,
  } = useKanban({
    initialColumns,
    onMoveCard: async ({ cardId, toColumnId }) => {
      if (isFallbackMode || !devToken) {
        return;
      }
      await flowsService.moveCard(cardId, toColumnId, devToken);
    },
  });

  useEffect(() => {
    const token = getStoredToken();
    setDevToken(token);
    setTokenInput(token);
  }, []);

  useEffect(() => {
    if (!initialFlowId) {
      return;
    }
    setSelectedFlowId(initialFlowId);
  }, [initialFlowId]);

  const loadFlowOptions = useCallback(async () => {
    setLoadingFlows(true);

    if (!devToken) {
      setIsFallbackMode(true);
      setFlowOptions([{ id: fallbackFlow.id, name: fallbackFlow.name }]);
      setSelectedFlowId(initialFlowId || fallbackFlow.id);
      setHint('Sem token JWT. Exibindo fluxo local de fallback para smoke/UAT.');
      setError(null);
      setLoadingFlows(false);
      return;
    }

    try {
      const flows = await flowsService.list(devToken);

      if (flows.length === 0) {
        setIsFallbackMode(true);
        setFlowOptions([{ id: fallbackFlow.id, name: fallbackFlow.name }]);
        setSelectedFlowId(fallbackFlow.id);
        setHint(
          'Token válido, mas não há fluxos reais para este usuário. Exibindo fallback local.'
        );
        setError(null);
      } else {
        setIsFallbackMode(false);
        const options = flows.map((flow) => ({ id: flow.id, name: flow.name }));
        setFlowOptions(options);
        setHint(null);
        setError(null);
        setSelectedFlowId((previous) => {
          if (options.some((option) => option.id === previous)) {
            return previous;
          }

          if (initialFlowId && options.some((option) => option.id === initialFlowId)) {
            return initialFlowId;
          }

          return options[0].id;
        });
      }
    } catch (loadError) {
      setIsFallbackMode(true);
      setFlowOptions([{ id: fallbackFlow.id, name: fallbackFlow.name }]);
      setSelectedFlowId(fallbackFlow.id);
      setHint(
        'Falha ao carregar fluxos reais. Mantendo fallback local para continuidade do teste.'
      );
      setError(loadError instanceof Error ? loadError.message : 'Falha ao listar fluxos.');
    } finally {
      setLoadingFlows(false);
    }
  }, [devToken, initialFlowId]);

  const loadFlowDetail = useCallback(async () => {
    setLoadingDetails(true);

    if (isFallbackMode || !devToken) {
      const fallbackColumns = mapFlowToKanbanColumns({
        ...fallbackFlow,
        id: selectedFlowId,
      });
      setInitialColumns(fallbackColumns);
      setLoadingDetails(false);
      return;
    }

    try {
      const flow = await flowsService.getById(selectedFlowId, devToken);
      setInitialColumns(mapFlowToKanbanColumns(flow));
      setHint(null);
      setError(null);
    } catch (loadError) {
      setIsFallbackMode(true);
      setInitialColumns(mapFlowToKanbanColumns({ ...fallbackFlow, id: selectedFlowId }));
      setHint(
        'Falha ao carregar detalhes do fluxo real. Fallback local aplicado para não interromper operação.'
      );
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar fluxo.');
    } finally {
      setLoadingDetails(false);
    }
  }, [devToken, isFallbackMode, selectedFlowId]);

  useEffect(() => {
    void loadFlowOptions();
  }, [loadFlowOptions]);

  useEffect(() => {
    void loadFlowDetail();
  }, [loadFlowDetail]);

  const currentFlowName =
    flowOptions.find((option) => option.id === selectedFlowId)?.name ||
    'Fluxo sem nome';

  const normalizedSearch = useMemo(() => normalizeText(searchText), [searchText]);

  const matchCardFilter = useCallback(
    (card: KanbanCard, column: KanbanColumn): boolean => {
      const effectiveStatus = resolveEffectiveStatus(card.status, column.name);

      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
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

      return haystack.includes(normalizedSearch);
    },
    [normalizedSearch, statusFilter]
  );

  const filteredRows = useMemo<FlatCardRow[]>(() => {
    return columns.flatMap((column) =>
      column.cards
        .filter((card) => matchCardFilter(card, column))
        .map((card) => ({
          ...card,
          columnId: column.id,
          columnName: column.name,
          effectiveStatus: resolveEffectiveStatus(card.status, column.name),
        }))
    );
  }, [columns, matchCardFilter]);

  const indicators = useMemo(() => computeIndicators(filteredRows), [filteredRows]);

  const cardsByColumn = useMemo(() => {
    return columns.map((column) => ({
      id: column.id,
      name: column.name,
      total: column.cards.length,
      filtered: column.cards.filter((card) => matchCardFilter(card, column)).length,
    }));
  }, [columns, matchCardFilter]);

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  const applyToken = () => {
    const token = tokenInput.trim();
    setDevToken(token);

    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem('synkra_dev_token', token);
      } else {
        window.localStorage.removeItem('synkra_dev_token');
      }
    }
  };

  const clearToken = () => {
    setTokenInput('');
    setDevToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('synkra_dev_token');
    }
  };

  const onDropColumn = (columnId: number) => {
    void dropOnColumn(columnId);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Fluxos 2.0</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Quadro, tabela e indicadores compartilhando o mesmo dataset operacional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-neutral-700">Fluxo</label>
            <select
              value={selectedFlowId}
              onChange={(event) => setSelectedFlowId(Number(event.target.value))}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              {flowOptions.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              viewMode === 'board'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Quadro
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              viewMode === 'table'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('indicators')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              viewMode === 'indicators'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Indicadores
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_auto_auto]">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Filtrar por texto (card, descrição, responsável, tag...)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            <option value="all">Todos status</option>
            <option value="active">Ativo</option>
            <option value="completed">Concluído</option>
            <option value="blocked">Bloqueado</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={() => void loadFlowDetail()}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Recarregar
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Token de teste (opcional)</h2>
            <p className="text-sm text-neutral-600">
              Sem token, a página usa fallback local. Com token JWT, opera com dados reais do backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Cole aqui o token JWT"
              className="min-w-[320px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={applyToken}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Aplicar token
            </button>
            <button
              type="button"
              onClick={clearToken}
              className="rounded-lg bg-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-300"
            >
              Limpar token
            </button>
          </div>
        </div>
      </section>

      {hint && (
        <section className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-800">
          {hint}
        </section>
      )}

      {error && (
        <section className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
          {error}
        </section>
      )}

      {lastMoveError && (
        <section className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
          Falha ao mover card: {lastMoveError}
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <strong>Fluxo:</strong> {currentFlowName}
          </p>
          <p>
            <strong>Cards visíveis:</strong> {filteredRows.length} / {cardsCount}
          </p>
          <p>
            <strong>Modo:</strong> {isFallbackMode ? 'Fallback local' : 'Dados reais'}
          </p>
          <p>
            <strong>Loading:</strong>{' '}
            {loadingFlows || loadingDetails ? 'sincronizando...' : 'ok'}
          </p>
        </div>
      </section>

      {viewMode === 'board' && (
        <KanbanBoard
          columns={columns}
          isCardPending={isCardPending}
          onDragStart={(cardId, fromColumnId) => startDrag({ cardId, fromColumnId })}
          onDragEnd={clearDrag}
          onDropColumn={onDropColumn}
          filterCard={matchCardFilter}
        />
      )}

      {viewMode === 'table' && (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-neutral-200 bg-neutral-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Card</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Coluna</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Responsável</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Progresso</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-800">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-600">
                    Nenhum card encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-900">{row.title}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{row.columnName}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{row.effectiveStatus}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    {row.responsible || 'Não definido'}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{row.progress.percent}%</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {viewMode === 'indicators' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm font-semibold text-primary-700">Cards ativos</p>
              <p className="text-3xl font-bold text-primary-900">{indicators.activeCards}</p>
            </article>
            <article className="rounded-xl border border-success-200 bg-success-50 p-4">
              <p className="text-sm font-semibold text-success-700">Cards concluídos</p>
              <p className="text-3xl font-bold text-success-900">{indicators.completedCards}</p>
            </article>
            <article className="rounded-xl border border-error-200 bg-error-50 p-4">
              <p className="text-sm font-semibold text-error-700">Cards bloqueados</p>
              <p className="text-3xl font-bold text-error-900">{indicators.blockedCards}</p>
            </article>
            <article className="rounded-xl border border-neutral-300 bg-neutral-100 p-4">
              <p className="text-sm font-semibold text-neutral-700">Throughput (7 dias)</p>
              <p className="text-3xl font-bold text-neutral-900">{indicators.throughput}</p>
            </article>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-lg font-bold text-neutral-900">Distribuição por coluna</h3>
            <div className="space-y-2">
              {cardsByColumn.map((item) => (
                <div key={item.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-neutral-800">
                    <span>{item.name}</span>
                    <span>
                      {item.filtered}/{item.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-2 rounded-full bg-primary-600 transition-all"
                      style={{
                        width:
                          item.total > 0
                            ? `${Math.round((item.filtered / item.total) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
