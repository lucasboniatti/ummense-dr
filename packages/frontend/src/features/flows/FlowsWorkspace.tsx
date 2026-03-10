import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart3, Database, KeyRound, LayoutGrid, RefreshCw, Search, Table2 } from 'lucide-react';
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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { ProgressSegments } from '../../components/ui/ProgressSegments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';

type ViewMode = 'board' | 'table' | 'indicators';
type FilterStatus = 'all' | 'active' | 'completed' | 'blocked';
type VisualStatus = 'active' | 'completed' | 'blocked' | 'inactive';

interface FlowsWorkspaceProps {
  initialFlowId?: number | null;
}

interface FlatCardRow extends FlowCardItem {
  columnId: number;
  columnName: string;
  effectiveStatus: FlowCardStatus;
}

interface FlowOption extends Pick<FlowListItem, 'id' | 'name'> { }

const FALLBACK_FLOW_ID = 1;

const VIEW_OPTIONS = [
  { value: 'board' as const, label: 'Quadro', icon: LayoutGrid },
  { value: 'table' as const, label: 'Tabela', icon: Table2 },
  { value: 'indicators' as const, label: 'Indicadores', icon: BarChart3 },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'active' as const, label: 'Ativos' },
  { value: 'completed' as const, label: 'Concluídos' },
  { value: 'blocked' as const, label: 'Bloqueados' },
];

const fallbackFlow: FlowDetails = {
  id: FALLBACK_FLOW_ID,
  name: 'Gestão operacional',
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

function resolveVisualStatus(
  status: string | null | undefined,
  rawStatus: string | null | undefined,
  columnName: string
): VisualStatus {
  const normalizedRawStatus = normalizeText(rawStatus);

  if (
    normalizedRawStatus === 'paused' ||
    normalizedRawStatus === 'pausado' ||
    normalizedRawStatus === 'canceled' ||
    normalizedRawStatus === 'cancelled' ||
    normalizedRawStatus === 'cancelado' ||
    normalizedRawStatus === 'inactive' ||
    normalizedRawStatus === 'inativo'
  ) {
    return 'inactive';
  }

  const effectiveStatus = resolveEffectiveStatus(status, columnName);

  if (effectiveStatus === 'completed') {
    return 'completed';
  }

  if (effectiveStatus === 'blocked') {
    return 'blocked';
  }

  return 'active';
}

function visualStatusLabel(status: VisualStatus): string {
  if (status === 'completed') return 'Concluído';
  if (status === 'blocked') return 'Bloqueado';
  if (status === 'inactive') return 'Inativo';
  return 'Ativo';
}

function visualStatusBadgeTone(status: VisualStatus): 'success' | 'error' | 'warning' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'blocked') return 'error';
  if (status === 'inactive') return 'warning';
  return 'info';
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
  const tokenFromStorage = window.localStorage.getItem('tasksflow_dev_token');
  const token = tokenFromUrl || tokenFromStorage || '';

  if (tokenFromUrl) {
    window.localStorage.setItem('tasksflow_dev_token', tokenFromUrl);
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
  const router = useRouter();
  const flowSelectId = 'selected-flow';
  const flowSearchId = 'flow-search';
  const flowTokenInputId = 'flow-token-input';
  const supportModeEnabled = router.query.support === '1';
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
    'Preparando a leitura operacional do fluxo.'
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
      setHint('A sincronização completa ainda não ficou disponível nesta sessão. Mantivemos uma visão guiada para preservar a leitura do pipeline.');
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
          'Ainda não há fluxos ativos publicados para esta conta. Assim que a operação entrar em andamento, o quadro aparece aqui.'
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
        'A sincronização dos fluxos ficou indisponível agora. Mantivemos uma visão guiada para você seguir com a leitura da operação.'
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
        'Não foi possível atualizar os detalhes deste fluxo agora. A leitura principal segue disponível enquanto a sincronização é retomada.'
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
  const isLoading = loadingFlows || loadingDetails;

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

  const visibilityPercent = cardsCount > 0 ? Math.round((filteredRows.length / cardsCount) * 100) : 0;
  const visibilitySegments = filteredRows.length > 0 ? Math.max(1, Math.round((visibilityPercent / 100) * 4)) : 0;
  const sourceLabel = isFallbackMode ? 'Leitura guiada' : 'Dados sincronizados';
  const sourceTone = isFallbackMode ? 'neutral' : 'success';
  const syncLabel = isLoading ? 'Atualização em curso' : 'Em dia';

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  const applyToken = () => {
    const token = tokenInput.trim();
    setDevToken(token);

    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem('tasksflow_dev_token', token);
      } else {
        window.localStorage.removeItem('tasksflow_dev_token');
      }
    }
  };

  const clearToken = () => {
    setTokenInput('');
    setDevToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tasksflow_dev_token');
    }
  };

  const onDropColumn = (columnId: number) => {
    void dropOnColumn(columnId);
  };

  const openCardWorkspace = (cardId: number) => {
    void router.push(`/cards/${cardId}`);
  };

  return (
    <div className="space-y-4">
      <section className="app-surface p-5 md:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div>
                <p className="app-kicker">Fluxos operacionais</p>
                <h1 className="mt-2 font-display text-[2rem] font-bold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  Fluxos 2.0
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
                  Centralize cards, throughput e gargalos na mesma superfície. O foco aqui é triagem rápida, acompanhamento diário e acesso direto às contas prioritárias.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{filteredRows.length}/{cardsCount} cards visíveis</Badge>
                <Badge tone="success">{indicators.completedCards} concluídos</Badge>
                <Badge tone="error">{indicators.blockedCards} bloqueados</Badge>
                <Badge tone={sourceTone}>{sourceLabel}</Badge>
                <Badge tone={isLoading ? 'warning' : 'info'}>{syncLabel}</Badge>
              </div>
            </div>

            <div className="grid min-w-[320px] gap-3 lg:grid-cols-2 2xl:w-[32rem]">
              <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Frente principal
                    </p>
                    <p className="mt-2 text-lg font-bold text-[color:var(--text-strong)]">
                      {currentFlowName}
                    </p>
                  </div>
                  <Badge tone={sourceTone}>{sourceLabel}</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  <label htmlFor={flowSelectId} className="sr-only">
                    Fluxo ativo
                  </label>
                  <Select
                    value={String(selectedFlowId)}
                    onValueChange={(value) => setSelectedFlowId(Number(value))}
                  >
                    <SelectTrigger id={flowSelectId} className="w-full">
                      <SelectValue placeholder="Selecione um fluxo" />
                    </SelectTrigger>
                    <SelectContent>
                      {flowOptions.map((flow) => (
                        <SelectItem key={flow.id} value={String(flow.id)}>
                          {flow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={() => void loadFlowDetail()}
                    size="sm"
                    disabled={isLoading}
                    className="h-11"
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Atualizar fluxo
                  </Button>
                </div>
              </article>

              <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  <span>Pulso do fluxo</span>
                  <span>{visibilityPercent}%</span>
                </div>
                <ProgressSegments
                  filled={visibilitySegments}
                  total={4}
                  color={visibilityPercent >= 75 ? 'success' : visibilityPercent >= 40 ? 'primary' : 'warning'}
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Em operação
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                      {indicators.activeCards}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Throughput 7d
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                      {indicators.throughput}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = viewMode === option.value;

              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(option.value)}
                  className="h-10"
                >
                  <Icon size={14} className="mr-2" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          <div className="app-toolbar p-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                  aria-hidden="true"
                />
                <label htmlFor={flowSearchId} className="sr-only">
                  Filtrar por card, descrição, responsável ou tag
                </label>
                <Input
                  id={flowSearchId}
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar por card, descrição, responsável ou tag"
                  aria-label="Filtrar por card, descrição, responsável ou tag"
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={statusFilter === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(option.value)}
                    className="h-10"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10"
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {supportModeEnabled && (
      <details className="app-surface-muted overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-card)] text-[color:var(--text-accent)] shadow-[var(--shadow-soft)]">
                <KeyRound size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-strong)]">Painel de suporte</p>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Autenticação avançada e origem dos dados, isoladas da leitura principal do board.
                </p>
              </div>
            </div>

            <Badge tone={sourceTone}>
              <Database size={12} />
              {sourceLabel}
            </Badge>
          </div>
        </summary>

        <div className="border-t border-[color:var(--border-default)] px-4 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label htmlFor={flowTokenInputId} className="sr-only">
              Token de suporte
            </label>
            <Input
              id={flowTokenInputId}
              type="text"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Cole um token de suporte"
              aria-label="Token de suporte"
            />
            <Button type="button" onClick={applyToken} size="sm" className="h-11">
              Aplicar token
            </Button>
            <Button type="button" onClick={clearToken} variant="outline" size="sm" className="h-11">
              Limpar token
            </Button>
          </div>
        </div>
      </details>
      )}

      {hint && (
        <section className="app-inline-banner app-inline-banner-warning">
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

      {isLoading && (
        <section className="app-surface-muted rounded-xl px-4 py-3 text-sm font-medium text-[color:var(--text-secondary)]">
          Sincronizando fluxos e colunas para refletir o dataset mais recente.
        </section>
      )}

      {viewMode === 'board' && (
        <KanbanBoard
          columns={columns}
          isCardPending={isCardPending}
          onDragStart={(cardId, fromColumnId) => startDrag({ cardId, fromColumnId })}
          onDragEnd={clearDrag}
          onDropColumn={onDropColumn}
          onCardClick={openCardWorkspace}
          filterCard={matchCardFilter}
        />
      )}

      {viewMode === 'table' && (
        <section className="app-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
            <thead className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]/90">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Card</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Coluna</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Responsável</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Progresso</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Atualizado</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-subtle)]">
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8">
                    <EmptyState
                      icon={<LayoutGrid size={48} />}
                      title="Nenhum card encontrado"
                      description="Ajuste os filtros ou crie um novo card para visualizar os dados."
                      variant="compact"
                    />
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-[color:var(--surface-muted)]/65">
                  <td className="px-4 py-3 text-sm font-semibold text-[color:var(--text-strong)]">
                    <button
                      type="button"
                      onClick={() => openCardWorkspace(row.id)}
                      className="inline-flex items-center gap-2 text-left text-primary-700 hover:underline"
                    >
                      {row.title}
                      <LayoutGrid size={13} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">{row.columnName}</td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                    <Badge tone={visualStatusBadgeTone(resolveVisualStatus(row.status, row.rawStatus, row.columnName))}>
                      {visualStatusLabel(
                        resolveVisualStatus(row.status, row.rawStatus, row.columnName)
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                    {row.responsible || 'Não definido'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                    <div className="min-w-[140px]">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                        <span>Andamento</span>
                        <span>{row.progress.percent}%</span>
                      </div>
                      <ProgressSegments
                        filled={Math.max(1, Math.round(row.progress.percent / 25))}
                        total={4}
                        color={row.effectiveStatus === 'completed' ? 'success' : row.effectiveStatus === 'blocked' ? 'error' : 'primary'}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                    <Button
                      type="button"
                      onClick={() => void router.push(`/cards/${row.id}?newTask=1`)}
                      variant="outline"
                      size="sm"
                    >
                      Nova tarefa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {viewMode === 'indicators' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Cards ativos</p>
              <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">{indicators.activeCards}</p>
              <div className="mt-3">
                <ProgressSegments filled={Math.max(1, Math.round((indicators.activeCards / Math.max(filteredRows.length, 1)) * 4))} total={4} color="primary" />
              </div>
            </article>
            <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Concluídos</p>
              <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">{indicators.completedCards}</p>
              <div className="mt-3">
                <ProgressSegments filled={Math.max(1, Math.round((indicators.completedCards / Math.max(filteredRows.length, 1)) * 4))} total={4} color="success" />
              </div>
            </article>
            <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Bloqueados</p>
              <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">{indicators.blockedCards}</p>
              <div className="mt-3">
                <ProgressSegments filled={Math.max(1, Math.round((indicators.blockedCards / Math.max(filteredRows.length, 1)) * 4))} total={4} color="error" />
              </div>
            </article>
            <article className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Throughput (7 dias)</p>
              <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">{indicators.throughput}</p>
              <div className="mt-3">
                <ProgressSegments filled={Math.max(1, Math.min(4, indicators.throughput))} total={4} color="info" />
              </div>
            </article>
          </div>

          <div className="app-surface p-4">
            <h3 className="mb-3 text-lg font-bold text-[color:var(--text-strong)]">Distribuição por coluna</h3>
            <div className="space-y-2">
              {cardsByColumn.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[color:var(--text-strong)]">
                    <span>{item.name}</span>
                    <span>
                      {item.filtered}/{item.total}
                    </span>
                  </div>
                  <ProgressSegments
                    filled={
                      item.total > 0
                        ? Math.max(1, Math.round((item.filtered / item.total) * 4))
                        : 0
                    }
                    total={4}
                    color={item.filtered === item.total && item.total > 0 ? 'success' : 'primary'}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
