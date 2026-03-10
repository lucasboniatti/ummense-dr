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
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { CardDetails, CardTimelineEvent, cardsService } from '../../services/cards.service';
import { FlowTag } from '../../services/flows.service';
import { TaskItem, tasksService } from '../../services/tasks.service';

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

function statusTone(status: string): string {
  if (status === 'completed') return 'bg-success-50 text-success-700';
  if (status === 'blocked') return 'bg-error-50 text-error-700';
  return 'bg-primary-50 text-primary-700';
}

function priorityTone(priority: string): string {
  if (priority === 'P1') return 'bg-error-50 text-error-700';
  if (priority === 'P2') return 'bg-warning-50 text-warning-700';
  return 'bg-primary-50 text-primary-700';
}

function taskStatusLabel(status: string): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'todo') return 'A iniciar';
  if (status === 'blocked') return 'Bloqueada';
  return 'Aberta';
}

function taskStatusTone(status: string): string {
  if (status === 'completed') return 'bg-success-50 text-success-700';
  if (status === 'in_progress') return 'bg-primary-50 text-primary-700';
  if (status === 'blocked') return 'bg-error-50 text-error-700';
  return 'bg-neutral-100 text-neutral-700';
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
    'Dados reais do card dependem de autenticação. O acesso técnico fica em uma superfície secundária.'
  );
  const [technicalModeOpen, setTechnicalModeOpen] = useState(false);

  const [card, setCard] = useState<CardDetails | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
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
  const [newTagColor, setNewTagColor] = useState('#2563eb');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

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
        'Sem token JWT. A jornada principal permanece limpa; abra o modo técnico apenas se precisar autenticar a sessão.'
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

  const onOpenTask = (task: TaskItem) => {
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

  const mainEmptyState = !loading && !card;

  return (
    <div data-testid="card-workspace" className="space-y-4">
      <section className="app-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
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
              <h1 className="mt-2 text-[1.9rem] font-bold tracking-[-0.04em] text-neutral-900">
                {card ? form.title || card.title : 'Card Workspace 2.0'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Card #{cardId || '-'} com contexto, tarefas e timeline em uma superfície de produto, sem expor controles técnicos na jornada principal.
              </p>
            </div>

            {card && (
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(
                    form.status || card.status
                  )}`}
                >
                  {statusLabel(form.status || card.status)}
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  Líder: {leadershipSnapshot.leader}
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  Equipe: {leadershipSnapshot.teamCount}
                </span>
                <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
                  {completedTasks}/{tasks.length} tarefas concluídas
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  Atualizado {formatDate(card.updatedAt)}
                </span>
              </div>
            )}
          </div>

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
      </section>

      {hint && (
        <section className="rounded-[22px] border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-800">
          {hint}
        </section>
      )}

      {error && (
        <section className="rounded-[22px] border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
          {error}
        </section>
      )}

      {loading && (
        <section className="app-surface-muted px-4 py-4 text-sm font-medium text-neutral-700">
          Carregando contexto, tarefas e timeline do card...
        </section>
      )}

      {mainEmptyState && (
        <section className="app-surface p-6">
          <EmptyState
            icon={<Sparkles size={48} />}
            title="Workspace pronto para operar"
            description="Para carregar dados reais deste card, abra o modo técnico e autentique a sessão. A jornada principal permanece limpa para o operador."
            variant="compact"
          />
        </section>
      )}

      {!loading && card && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-4">
            <article data-testid="card-primary-details" className="app-surface p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Detalhes do card</p>
                  <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
                    Contexto principal
                  </h2>
                </div>
                <div className="rounded-[18px] bg-neutral-50/90 px-3 py-2 text-xs font-medium text-neutral-600">
                  Card #{card.id}
                </div>
              </header>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
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
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
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
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, status: event.target.value }))
                      }
                      className="app-control h-11 w-full bg-white px-3.5 text-sm text-neutral-900"
                    >
                      <option value="active">Ativo</option>
                      <option value="completed">Concluído</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>

                  <div className="app-surface-muted p-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                      <span>Progresso do card</span>
                      <span>{card.progress.percent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-2 rounded-full bg-primary-600 transition-all"
                        style={{ width: `${card.progress.percent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-neutral-600">
                      <span>{card.progress.completed} entregas concluídas</span>
                      <span>de {card.progress.total} previstas</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article data-testid="card-team-context" className="app-surface p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Equipe e contexto</p>
                  <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
                    Pessoas e sinais do card
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
                    Líder {leadershipSnapshot.leader}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                    {leadershipSnapshot.teamCount} pessoas no contexto
                  </span>
                </div>
              </header>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <UserRound size={16} className="text-primary-700" />
                    Contatos e equipe
                  </div>

                  {contacts.length > 0 ? (
                    <div className="grid gap-2">
                      {contacts.map((contact, index) => (
                        <div
                          key={`${contact.name}-${contact.email || 'sem-email'}-${index}`}
                          className="rounded-[18px] border border-[color:var(--border-subtle)] bg-white/85 px-3 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700">
                              {initials(contact.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{contact.name}</p>
                              <p className="text-xs text-neutral-500">
                                {contact.role || contact.email || 'Contato relacionado ao card'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-4 py-5 text-sm text-neutral-500">
                      Nenhum contato estruturado disponível neste card.
                    </div>
                  )}

                  {leadershipSnapshot.teamNames.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {leadershipSnapshot.teamNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <Layers3 size={16} className="text-primary-700" />
                    Campos customizados
                  </div>

                  {customFieldEntries.length > 0 ? (
                    <div className="grid gap-2">
                      {customFieldEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-[18px] border border-[color:var(--border-subtle)] bg-white/85 px-3 py-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                            {key}
                          </p>
                          <p className="mt-1 text-sm text-neutral-800">{formatCompactValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-4 py-5 text-sm text-neutral-500">
                      Nenhum campo customizado foi preenchido ainda.
                    </div>
                  )}
                </section>
              </div>
            </article>

            <article data-testid="card-tags-panel" className="app-surface p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Taxonomia</p>
                  <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
                    Tags do card
                  </h2>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  {card.tags.length} vinculadas
                </span>
              </header>

              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    <TagIcon size={12} />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => void onRemoveTagFromCard(tag.id)}
                      className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]"
                      aria-label={`Remover tag ${tag.name}`}
                    >
                      x
                    </button>
                  </span>
                ))}

                {card.tags.length === 0 && (
                  <span className="text-sm text-neutral-500">Sem tags vinculadas neste card.</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <select
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  className="app-control h-11 bg-white px-3.5 text-sm text-neutral-900"
                >
                  <option value="">Selecionar tag existente</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
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

            <article data-testid="card-tasks-panel" className="app-surface p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Execução</p>
                  <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
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
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                  <span>Progresso integrado</span>
                  <span>{card.progress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all"
                    style={{ width: `${card.progress.percent}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-neutral-600">
                  <span>{completedTasks} concluídas</span>
                  <span>{tasks.length} totais</span>
                  <span>
                    {card.progress.completed}/{card.progress.total} no progresso do card
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="group w-full rounded-[22px] border border-[color:var(--border-subtle)] bg-white/94 p-4 text-left shadow-[0_20px_34px_-30px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-[0.98rem] font-semibold text-neutral-900">{task.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${taskStatusTone(
                              task.status
                            )}`}
                          >
                            {taskStatusLabel(task.status)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityTone(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-medium text-neutral-600">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1.5">
                          {task.assignedTo || 'Sem responsável'}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1.5">
                          Prazo {formatDueDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}

                {tasks.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-4 py-6 text-sm text-neutral-500">
                    Nenhuma tarefa foi vinculada a este card ainda.
                  </div>
                )}
              </div>
            </article>
          </div>

          <aside className="space-y-4">
            <article data-testid="card-timeline-panel" className="app-surface p-5">
              <header className="mb-4">
                <p className="app-kicker">Timeline</p>
                <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
                  Histórico colaborativo
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Adicione notas e acompanhe os eventos vinculados ao card em uma trilha cronológica legível.
                </p>
              </header>

              <div className="rounded-[22px] border border-[color:var(--border-subtle)] bg-white/88 p-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
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
                      className="relative rounded-[22px] border border-[color:var(--border-subtle)] bg-white/94 p-4 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.42)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                          <Clock3 size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900">
                              {timelineActionLabel(event.action)}
                            </p>
                            <span className="text-xs font-medium text-neutral-500">
                              {formatDateTime(event.created_at)}
                            </span>
                          </div>

                          {description && (
                            <p className="mt-2 text-sm leading-6 text-neutral-700">
                              {description}
                            </p>
                          )}

                          {meta.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {meta.map((item, index) => (
                                <span
                                  key={`${item}-${index}`}
                                  className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700"
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
                  <div className="rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-4 py-6 text-sm text-neutral-500">
                    Nenhum evento registrado ainda. Use o composer acima para abrir o histórico deste card.
                  </div>
                )}
              </div>
            </article>

            <article className="app-surface p-5">
              <header className="mb-4">
                <p className="app-kicker">Resumo operacional</p>
                <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.03em] text-neutral-900">
                  Visão rápida
                </h2>
              </header>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[20px] border border-[color:var(--border-subtle)] bg-neutral-50/85 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                    <CalendarDays size={15} className="text-primary-700" />
                    Criado em
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">{formatDate(card.createdAt)}</p>
                </div>
                <div className="rounded-[20px] border border-[color:var(--border-subtle)] bg-neutral-50/85 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                    <Database size={15} className="text-primary-700" />
                    Dados disponíveis
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">
                    {contacts.length} contatos · {customFieldEntries.length} campos customizados
                  </p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      )}

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
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-primary-700 shadow-sm">
                <KeyRound size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Modo técnico</p>
                <p className="text-xs text-neutral-500">
                  JWT, contatos em JSON e campos customizados ficam isolados aqui.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-600">
              {technicalModeOpen ? 'Ocultar' : 'Abrir'}
            </span>
          </div>
        </summary>

        <div className="border-t border-[color:var(--border-subtle)] px-5 py-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                Token JWT
              </label>
              <Input
                type="text"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Cole o token JWT de suporte"
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

            <div className="rounded-[18px] border border-[color:var(--border-subtle)] bg-white/85 p-4 text-sm leading-6 text-neutral-600">
              Use esta superfície apenas para autenticação de suporte e edição avançada de payloads. Ela fica fechada por padrão e fora da primeira leitura do operador.
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
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
