import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Database,
  KeyRound,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Tag as TagIcon,
  UserRound,
} from 'lucide-react';
import TaskModal from '../../components/TaskModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
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
import { TaskItem as UiTaskItem } from '../../components/ui/TaskItem';
import { api } from '../../services/api';
import { CardDetails, CardTimelineEvent, cardsService } from '../../services/cards.service';
import { FlowTag } from '../../services/flows.service';
import { TaskItem as CardTaskItem, tasksService } from '../../services/tasks.service';

type JsonValue = Record<string, unknown> | unknown[];

interface InterpretedContact {
  name: string;
  email?: string;
  role?: string;
}

interface CardFormState {
  title: string;
  description: string;
  status: string;
  contactsJson: string;
  customFieldsJson: string;
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

function safeJsonParse(value: string): JsonValue | null {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as JsonValue;
    }
    return null;
  } catch {
    return null;
  }
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Concluído';
  if (status === 'blocked') return 'Bloqueado';
  return 'Ativo';
}

function taskStatusLabel(status: string): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'todo') return 'A iniciar';
  if (status === 'blocked') return 'Bloqueada';
  return 'Aberta';
}

function timelineActionLabel(action: string): string {
  if (action === 'note.added') return 'Nota adicionada';
  if (action === 'event.linked') return 'Evento vinculado';

  const normalized = action.replace(/[._-]+/g, ' ').trim();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Atualização';
}

function formatCompactValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '0 itens' : `${value.length} itens`;
  }

  if (typeof value === 'object') {
    return `${Object.keys(value as Record<string, unknown>).length} campos`;
  }

  return String(value);
}

function extractTimelineDescription(event: CardTimelineEvent): string | null {
  if (typeof event.details?.note === 'string' && event.details.note.trim()) {
    return event.details.note.trim();
  }

  if (typeof event.details?.title === 'string' && event.details.title.trim()) {
    return event.details.title.trim();
  }

  if (
    typeof event.details?.description === 'string' &&
    event.details.description.trim()
  ) {
    return event.details.description.trim();
  }

  return null;
}

function extractTimelineMeta(event: CardTimelineEvent): string[] {
  const meta: string[] = [];

  if (typeof event.details?.startsAt === 'string' && event.details.startsAt) {
    meta.push(`Início ${formatDateTime(event.details.startsAt)}`);
  }

  if (typeof event.details?.endsAt === 'string' && event.details.endsAt) {
    meta.push(`Fim ${formatDateTime(event.details.endsAt)}`);
  }

  return meta;
}

function interpretContact(contact: unknown): InterpretedContact | null {
  if (!contact) {
    return null;
  }

  if (typeof contact === 'string') {
    const normalized = contact.trim();
    return normalized ? { name: normalized } : null;
  }

  if (typeof contact === 'object') {
    const source = contact as Record<string, unknown>;
    const rawName = source.name;
    const rawEmail = source.email;
    const rawRole = source.role ?? source.position;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    const role = typeof rawRole === 'string' ? rawRole.trim() : '';

    if (!name && !email) {
      return null;
    }

    return {
      name: name || email,
      email: email || undefined,
      role: role || undefined,
    };
  }

  return null;
}

function initials(name: string): string {
  const safe = name.trim();
  if (!safe) {
    return '--';
  }

  return safe
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'Sem prazo';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export default function CardWorkspacePage() {
  const router = useRouter();
  const supportModeEnabled = router.query.support === '1';

  const cardId = useMemo(() => {
    const raw = router.query.cardId;
    if (typeof raw !== 'string') return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [router.query.cardId]);

  const initialTaskIdFromQuery = useMemo(() => {
    const raw = router.query.taskId;
    if (typeof raw !== 'string') return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [router.query.taskId]);

  const shouldOpenNewTask = useMemo(() => {
    const raw = router.query.newTask;
    return raw === '1' || raw === 'true';
  }, [router.query.newTask]);

  const [devToken, setDevToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingCard, setSavingCard] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(
    'Preparando a leitura detalhada da conta.'
  );
  const [technicalModeOpen, setTechnicalModeOpen] = useState(false);

  const [card, setCard] = useState<CardDetails | null>(null);
  const [tasks, setTasks] = useState<CardTaskItem[]>([]);
  const [timeline, setTimeline] = useState<CardTimelineEvent[]>([]);
  const [availableTags, setAvailableTags] = useState<FlowTag[]>([]);
  const [form, setForm] = useState<CardFormState>({
    title: '',
    description: '',
    status: 'active',
    contactsJson: '[]',
    customFieldsJson: '{}',
  });
  const [newNote, setNewNote] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0d60b8');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<CardTaskItem | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!cardId) {
      setLoading(false);
      setError('Card inválido.');
      return;
    }

    if (!devToken) {
      setLoading(false);
      setCard(null);
      setTasks([]);
      setTimeline([]);
      setError(null);
      setHint(
        'Os dados detalhados desta conta ainda não ficaram disponíveis nesta sessão. Reabra o card a partir do fluxo principal ou atualize o painel.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [cardData, timelineData, taskData, tagsResponse] = await Promise.all([
        cardsService.getById(cardId, devToken),
        cardsService.getTimeline(cardId, devToken),
        tasksService.listByCardId(cardId, devToken),
        api.get('/api/tags', {
          headers: {
            Authorization: `Bearer ${devToken}`,
          },
        }),
      ]);

      const tags = Array.isArray(tagsResponse.data) ? (tagsResponse.data as FlowTag[]) : [];

      setCard(cardData);
      setTimeline(timelineData);
      setTasks(taskData);
      setAvailableTags(tags);
      setForm({
        title: cardData.title || '',
        description: cardData.description || '',
        status: cardData.status || 'active',
        contactsJson: JSON.stringify(cardData.contacts || [], null, 2),
        customFieldsJson: JSON.stringify(cardData.customFields || {}, null, 2),
      });
      setHint(null);
    } catch (workspaceError) {
      setError(
        workspaceError instanceof Error
          ? workspaceError.message
          : 'Falha ao carregar card workspace.'
      );
    } finally {
      setLoading(false);
    }
  }, [cardId, devToken]);

  useEffect(() => {
    const token = getStoredToken();
    setDevToken(token);
    setTokenInput(token);
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!initialTaskIdFromQuery || tasks.length === 0) {
      return;
    }

    const targetTask = tasks.find((task) => task.id === initialTaskIdFromQuery);
    if (!targetTask) {
      return;
    }

    setActiveTask(targetTask);
    setTaskModalOpen(true);
  }, [initialTaskIdFromQuery, tasks]);

  useEffect(() => {
    if (!shouldOpenNewTask) {
      return;
    }

    setActiveTask(null);
    setTaskModalOpen(true);
  }, [shouldOpenNewTask]);

  const onApplyToken = () => {
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

  const onClearToken = () => {
    setTokenInput('');
    setDevToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tasksflow_dev_token');
    }
  };

  const onSaveCard = async () => {
    if (!card || !devToken) {
      return;
    }

    const contactsParsed = safeJsonParse(form.contactsJson);
    if (contactsParsed === null) {
      setError('JSON de contatos inválido.');
      setTechnicalModeOpen(true);
      return;
    }

    const customFieldsParsed = safeJsonParse(form.customFieldsJson);
    if (customFieldsParsed === null || Array.isArray(customFieldsParsed)) {
      setError('JSON de campos customizados inválido.');
      setTechnicalModeOpen(true);
      return;
    }

    setSavingCard(true);
    setError(null);

    try {
      await cardsService.update(card.id, devToken, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        contacts: Array.isArray(contactsParsed) ? contactsParsed : [],
        customFields: customFieldsParsed,
      });

      await loadWorkspace();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar card.');
    } finally {
      setSavingCard(false);
    }
  };

  const onAddTagToCard = async () => {
    if (!selectedTagId || !devToken || !card) {
      return;
    }

    try {
      await api.post(
        `/api/tags/cards/${card.id}/tags/${selectedTagId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
          },
        }
      );
      setSelectedTagId('');
      await loadWorkspace();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Falha ao vincular tag.');
    }
  };

  const onRemoveTagFromCard = async (tagId: number) => {
    if (!devToken || !card) {
      return;
    }

    try {
      await api.delete(`/api/tags/cards/${card.id}/tags/${tagId}`, {
        headers: {
          Authorization: `Bearer ${devToken}`,
        },
      });
      await loadWorkspace();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Falha ao remover tag.');
    }
  };

  const onCreateTag = async () => {
    if (!devToken || !newTagName.trim()) {
      return;
    }

    try {
      await api.post(
        '/api/tags',
        {
          name: newTagName.trim(),
          color: newTagColor,
        },
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
          },
        }
      );
      setNewTagName('');
      await loadWorkspace();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Falha ao criar tag.');
    }
  };

  const onSubmitNote = async () => {
    if (!card || !devToken || !newNote.trim()) {
      return;
    }

    setSubmittingNote(true);
    setError(null);

    try {
      await cardsService.addTimelineNote(card.id, devToken, newNote.trim());
      setNewNote('');
      await loadWorkspace();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Falha ao adicionar nota.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const onOpenNewTask = () => {
    setActiveTask(null);
    setTaskModalOpen(true);
  };

  const onOpenTask = (task: CardTaskItem) => {
    setActiveTask(task);
    setTaskModalOpen(true);
  };

  const contacts = useMemo(
    () =>
      (card?.contacts || [])
        .map(interpretContact)
        .filter((value): value is InterpretedContact => Boolean(value)),
    [card?.contacts]
  );

  const leadershipSnapshot = useMemo(() => {
    const assignedNames = tasks
      .map((task) => (task.assignedTo || '').trim())
      .filter((value) => value.length > 0);

    const uniqueTeam = Array.from(
      new Set([...contacts.map((contact) => contact.name), ...assignedNames])
    );
    const leader = uniqueTeam[0] || 'Não definido';

    return {
      leader,
      teamCount: uniqueTeam.length,
      teamNames: uniqueTeam,
    };
  }, [contacts, tasks]);

  const customFieldEntries = useMemo(
    () => Object.entries(card?.customFields || {}),
    [card?.customFields]
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'completed').length,
    [tasks]
  );
  const taskProgressFilled = tasks.length > 0 ? Math.max(1, Math.round((completedTasks / tasks.length) * 4)) : 0;

  const mainEmptyState = !loading && !card;

  return (
    <div data-testid="card-workspace" className="space-y-4">
      <section className="app-surface p-4 sm:p-5 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Cards', href: '/dashboard/automations' },
                { label: card ? form.title || card.title : `Card #${cardId || '-'}`, current: true },
              ]}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void router.back()}
              className="h-9 self-start px-0"
            >
              <ArrowLeft size={14} className="mr-2" />
              Voltar
            </Button>

            <div>
              <p className="app-kicker">Workspace colaborativo</p>
              <h1 className="font-display mt-2 text-[1.7rem] font-bold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-[1.9rem]">
                {card ? form.title || card.title : 'Card Workspace 2.0'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                Card #{cardId || '-'} com contexto, tarefas e timeline em uma superfície de produto, sem expor controles técnicos na jornada principal.
              </p>
            </div>

            {card && (
              <div className="flex flex-wrap gap-2">
                <Badge tone={form.status === 'blocked' ? 'error' : form.status === 'completed' ? 'success' : 'info'}>
                  {statusLabel(form.status || card.status)}
                </Badge>
                <Badge tone="neutral" className="hidden sm:inline-flex">
                  Líder: {leadershipSnapshot.leader}
                </Badge>
                <Badge tone="neutral" className="hidden md:inline-flex">
                  Equipe: {leadershipSnapshot.teamCount}
                </Badge>
                <Badge tone="info">
                  {completedTasks}/{tasks.length} tarefas concluídas
                </Badge>
                <Badge tone="neutral" className="hidden lg:inline-flex">
                  Atualizado {formatDate(card.updatedAt)}
                </Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadWorkspace()}
                disabled={loading}
                className="h-11"
              >
                <RefreshCw size={14} className="mr-2" />
                Recarregar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenNewTask}
                disabled={!devToken}
                className="h-11"
              >
                <Plus size={14} className="mr-2" />
                Nova tarefa
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSaveCard()}
                disabled={!card || savingCard || !devToken}
                className="h-11"
              >
                <Save size={14} className="mr-2" />
                {savingCard ? 'Salvando...' : 'Salvar card'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="app-note-card">
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                <span>Ritmo do card</span>
                <span>{card ? `${card.progress.percent}%` : '--'}</span>
              </div>
              <ProgressSegments
                filled={
                  card ? Math.max(1, Math.round(card.progress.percent / 25)) : 1
                }
                total={4}
                color={
                  !card
                    ? 'primary'
                    : form.status === 'completed'
                      ? 'success'
                      : form.status === 'blocked'
                        ? 'error'
                        : 'primary'
                }
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="info">{completedTasks}/{tasks.length} tarefas</Badge>
                <Badge tone="neutral">{leadershipSnapshot.teamCount} pessoas</Badge>
                <Badge tone={devToken ? 'success' : 'warning'}>
                  {devToken ? 'dados ao vivo' : 'sincronização pendente'}
                </Badge>
              </div>
            </div>
            <div className="app-note-card flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
              <div>
                <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                  Leitura executiva
                </h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  {card
                    ? `${card.progress.completed} entregas foram concluídas e ${card.progress.total - card.progress.completed} ainda seguem em curso nesta frente.`
                    : 'Este card fica pronto para leitura premium assim que a sessão autenticada carregar os dados reais.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {hint && (
        <section className="app-inline-banner app-inline-banner-warning">
          {hint}
        </section>
      )}

      {error && (
        <section className="app-inline-banner app-inline-banner-error">
          {error}
        </section>
      )}

      {loading && (
        <section className="app-surface-muted px-4 py-4 text-sm font-medium text-[color:var(--text-secondary)]">
          Carregando contexto, tarefas e timeline do card...
        </section>
      )}

      {mainEmptyState && (
        <section className="app-surface p-6">
          <EmptyState
            icon={<Sparkles size={48} />}
            title="Detalhe da conta indisponível no momento"
            description="A leitura detalhada deste card não ficou disponível agora. Volte ao fluxo principal e tente novamente em seguida."
            variant="compact"
          />
        </section>
      )}

      {!loading && card && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <article data-testid="card-primary-details" className="app-surface p-4 sm:p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Detalhes do card</p>
                  <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                    Contexto principal
                  </h2>
                </div>
                <div className="app-status-pill app-status-pill-neutral normal-case tracking-normal">
                  Card #{card.id}
                </div>
              </header>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    Título
                  </label>
                  <Input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Ex.: Coletar aprovação da estratégia"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    Descrição
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, description: event.target.value }))
                    }
                    className="app-control min-h-[148px] w-full resize-y px-3.5 py-3 text-sm leading-6"
                    placeholder="Descreva o objetivo, contexto e próximos passos do card."
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      Status
                    </label>
                    <Select
                      value={form.status}
                      onValueChange={(status) =>
                        setForm((previous) => ({ ...previous, status }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="app-surface-muted p-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      <span>Progresso do card</span>
                      <span>{card.progress.percent}%</span>
                    </div>
                    <ProgressSegments
                      filled={Math.max(1, Math.round(card.progress.percent / 25))}
                      total={4}
                      color={card.status === 'completed' ? 'success' : card.status === 'blocked' ? 'error' : 'primary'}
                    />
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[color:var(--text-secondary)]">
                      <span>{card.progress.completed} entregas concluídas</span>
                      <span>de {card.progress.total} previstas</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article data-testid="card-team-context" className="app-surface p-4 sm:p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Equipe e contexto</p>
                  <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                    Pessoas e sinais do card
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="app-status-pill app-status-pill-info">
                    Líder {leadershipSnapshot.leader}
                  </span>
                  <span className="app-status-pill app-status-pill-neutral">
                    {leadershipSnapshot.teamCount} pessoas no contexto
                  </span>
                </div>
              </header>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <UserRound size={16} className="text-primary" />
                    Contatos e equipe
                  </div>

                  {contacts.length > 0 ? (
                    <div className="grid gap-2">
                      {contacts.map((contact, index) => (
                        <div
                          key={`${contact.name}-${contact.email || 'sem-email'}-${index}`}
                          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-3 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent-soft)] font-bold text-[color:var(--accent-strong)]">
                              {initials(contact.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--text-strong)]">{contact.name}</p>
                              <p className="text-xs text-[color:var(--text-muted)]">
                                {contact.role || contact.email || 'Contato relacionado ao card'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]/65 px-4 py-5 text-sm text-[color:var(--text-muted)]">
                      Nenhum contato estruturado disponível neste card.
                    </div>
                  )}

                  {leadershipSnapshot.teamNames.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {leadershipSnapshot.teamNames.map((name) => (
                        <span
                          key={name}
                          className="app-status-pill app-status-pill-neutral"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <Layers3 size={16} className="text-primary" />
                    Campos customizados
                  </div>

                  {customFieldEntries.length > 0 ? (
                    <div className="grid gap-2">
                      {customFieldEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-3 py-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                            {key}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--text-strong)]">{formatCompactValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]/65 px-4 py-5 text-sm text-[color:var(--text-muted)]">
                      Nenhum campo customizado foi preenchido ainda.
                    </div>
                  )}
                </section>
              </div>
            </article>

            <article data-testid="card-tags-panel" className="app-surface p-4 sm:p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Taxonomia</p>
                  <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                    Tags do card
                  </h2>
                </div>
                <span className="app-status-pill app-status-pill-neutral">
                  {card.tags.length} vinculadas
                </span>
              </header>

              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => void onRemoveTagFromCard(tag.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-semibold transition hover:border-[color:var(--border-accent)]"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}16` : undefined,
                      color: tag.color || 'var(--text-secondary)',
                    }}
                  >
                    <TagIcon size={12} />
                    {tag.name}
                  </button>
                ))}

                {card.tags.length === 0 && (
                  <span className="text-sm text-[color:var(--text-muted)]">Sem tags vinculadas neste card.</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <Select
                  value={selectedTagId}
                  onValueChange={setSelectedTagId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tag existente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag.id} value={String(tag.id)}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onAddTagToCard()}
                  disabled={!selectedTagId || !devToken}
                  className="h-11"
                >
                  Vincular tag
                </Button>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_120px_auto]">
                <Input
                  type="text"
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="Criar nova tag"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  className="app-control h-11 w-full cursor-pointer rounded-[var(--radius-control)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onCreateTag()}
                  disabled={!newTagName.trim() || !devToken}
                  className="h-11"
                >
                  Criar tag
                </Button>
              </div>
            </article>

            <article data-testid="card-tasks-panel" className="app-surface p-4 sm:p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Execução</p>
                  <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                    Tarefas do card
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onOpenNewTask}
                  disabled={!devToken}
                  className="h-10"
                >
                  <Plus size={14} className="mr-2" />
                  Nova tarefa
                </Button>
              </header>

              <div className="app-surface-muted mb-4 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  <span>Progresso integrado</span>
                  <span>{card.progress.percent}%</span>
                </div>
                <ProgressSegments
                  filled={taskProgressFilled}
                  total={4}
                  color={completedTasks === tasks.length && tasks.length > 0 ? 'success' : completedTasks > 0 ? 'primary' : 'warning'}
                />
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-[color:var(--text-secondary)]">
                  <span>{completedTasks} concluídas</span>
                  <span>{tasks.length} totais</span>
                  <span>
                    {card.progress.completed}/{card.progress.total} no progresso do card
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenTask(task);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-3 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]"
                  >
                    <div className="space-y-3">
                      <UiTaskItem
                        title={task.title}
                        category={`Card #${task.cardId}`}
                        date={formatDueDate(task.dueDate)}
                        isUrgent={task.priority === 'P1'}
                        isCompleted={task.status === 'completed'}
                        priority={task.priority === 'P1' ? 'urgent' : task.priority === 'P2' ? 'high' : 'none'}
                        assigneeFallback={task.assignedTo ? initials(task.assignedTo) : undefined}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={task.status === 'completed' ? 'success' : task.status === 'blocked' ? 'error' : task.status === 'in_progress' ? 'info' : 'neutral'}>
                          {taskStatusLabel(task.status)}
                        </Badge>
                        <Badge tone={task.priority === 'P1' ? 'error' : task.priority === 'P2' ? 'warning' : 'info'}>
                          {task.priority}
                        </Badge>
                        <Badge tone="neutral">
                          {task.assignedTo || 'Sem responsável'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]/65 px-4 py-6 text-sm text-[color:var(--text-muted)]">
                    Nenhuma tarefa foi vinculada a este card ainda.
                  </div>
                )}
              </div>
            </article>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start xl:border-l xl:border-[color:var(--border-default)] xl:pl-4">
            <article data-testid="card-timeline-panel" className="app-surface p-4 sm:p-5">
              <header className="mb-4">
                <p className="app-kicker">Timeline</p>
                <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                  Histórico colaborativo
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                  Adicione notas e acompanhe os eventos vinculados ao card em uma trilha cronológica legível.
                </p>
              </header>

              <div className="rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)]/88 p-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  Nova nota
                </label>
                <textarea
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Escreva uma atualização relevante para o time."
                  className="app-control min-h-[120px] w-full resize-y px-3.5 py-3 text-sm leading-6"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onSubmitNote()}
                    disabled={!newNote.trim() || submittingNote || !devToken}
                    className="h-10"
                  >
                    {submittingNote ? 'Enviando...' : 'Publicar nota'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {timeline.map((event) => {
                  const description = extractTimelineDescription(event);
                  const meta = extractTimelineMeta(event);

                  return (
                    <article
                      key={event.id}
                      className="relative rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)]/94 p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                          <Clock3 size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                              {timelineActionLabel(event.action)}
                            </p>
                            <span className="text-xs font-medium text-[color:var(--text-muted)]">
                              {formatDateTime(event.created_at)}
                            </span>
                          </div>

                          {description && (
                            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                              {description}
                            </p>
                          )}

                          {meta.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {meta.map((item, index) => (
                                <span
                                  key={`${item}-${index}`}
                                  className="app-status-pill app-status-pill-neutral"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {timeline.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]/65 px-4 py-6 text-sm text-[color:var(--text-muted)]">
                    Nenhum evento registrado ainda. Use o composer acima para abrir o histórico deste card.
                  </div>
                )}
              </div>
            </article>

            <article className="app-surface p-4 sm:p-5">
              <header className="mb-4">
                <p className="app-kicker">Resumo operacional</p>
                <h2 className="font-display mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
                  Visão rápida
                </h2>
              </header>

              <div className="grid gap-3">
                <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <CalendarDays size={15} className="text-primary" />
                    Criado em
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{formatDate(card.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <Database size={15} className="text-primary" />
                    Dados disponíveis
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                    {contacts.length} contatos · {customFieldEntries.length} campos customizados
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <UserRound size={15} className="text-primary" />
                    Liderança e equipe
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                    {leadershipSnapshot.leader}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {leadershipSnapshot.teamNames.join(' • ') || 'Sem pessoas vinculadas'}
                  </p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      )}

      {supportModeEnabled && (
      <details
        data-testid="technical-mode"
        className="app-surface-muted overflow-hidden"
        open={technicalModeOpen}
        onToggle={(event) =>
          setTechnicalModeOpen((event.target as HTMLDetailsElement).open)
        }
      >
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color:var(--surface-raised)] text-primary shadow-sm">
                <KeyRound size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-strong)]">Painel de suporte</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Token, contatos em JSON e campos customizados ficam isolados aqui.
                </p>
              </div>
            </div>
            <span className="app-status-pill app-status-pill-neutral">
              {technicalModeOpen ? 'Ocultar' : 'Abrir'}
            </span>
          </div>
        </summary>

        <div className="border-t border-[color:var(--border-subtle)] px-5 py-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Token de suporte
              </label>
              <Input
                type="text"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Cole o token de suporte"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={onApplyToken} className="h-10">
                  Aplicar token
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearToken}
                  className="h-10"
                >
                  Limpar token
                </Button>
              </div>
            </div>

            <div className="rounded-[18px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)]/85 p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
              Use esta superfície apenas para autenticação de suporte e edição avançada de payloads. Ela fica fechada por padrão e fora da primeira leitura do operador.
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Contatos (JSON)
              </label>
              <textarea
                value={form.contactsJson}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, contactsJson: event.target.value }))
                }
                className="app-control min-h-[220px] w-full resize-y px-3.5 py-3 font-mono text-xs leading-6"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Campos customizados (JSON)
              </label>
              <textarea
                value={form.customFieldsJson}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, customFieldsJson: event.target.value }))
                }
                className="app-control min-h-[220px] w-full resize-y px-3.5 py-3 font-mono text-xs leading-6"
              />
            </div>
          </div>
        </div>
      </details>
      )}

      <TaskModal
        open={taskModalOpen}
        token={devToken}
        cardId={cardId}
        task={activeTask}
        availableTags={availableTags}
        onClose={() => setTaskModalOpen(false)}
        onSaved={async () => {
          await loadWorkspace();
        }}
      />
    </div>
  );
}
