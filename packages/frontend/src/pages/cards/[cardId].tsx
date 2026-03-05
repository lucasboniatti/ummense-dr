import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TaskModal from '../../components/TaskModal';
import { api } from '../../services/api';
import { cardsService, CardDetails, CardTimelineEvent } from '../../services/cards.service';
import { FlowTag } from '../../services/flows.service';
import { TaskItem, tasksService } from '../../services/tasks.service';

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

function safeJsonParse(value: string): Record<string, unknown> | null {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
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
  return parsed.toLocaleString('pt-BR');
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Concluído';
  if (status === 'blocked') return 'Bloqueado';
  return 'Ativo';
}

function resolveContactName(contact: unknown): string | null {
  if (!contact) {
    return null;
  }

  if (typeof contact === 'string') {
    const normalized = contact.trim();
    return normalized || null;
  }

  if (typeof contact === 'object') {
    const rawName = (contact as Record<string, unknown>).name;
    const rawEmail = (contact as Record<string, unknown>).email;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    return name || email || null;
  }

  return null;
}

interface CardFormState {
  title: string;
  description: string;
  status: string;
  contactsJson: string;
  customFieldsJson: string;
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
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>('Cole um JWT para habilitar edição real do card.');

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
      setError(null);
      setHint('Sem token JWT. Card Workspace requer autenticação para dados reais.');
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
        window.localStorage.setItem('synkra_dev_token', token);
      } else {
        window.localStorage.removeItem('synkra_dev_token');
      }
    }
  };

  const onSaveCard = async () => {
    if (!card || !devToken) {
      return;
    }

    const contactsParsed = safeJsonParse(form.contactsJson);
    if (contactsParsed === null) {
      setError('JSON de contatos inválido.');
      return;
    }

    const customFieldsParsed = safeJsonParse(form.customFieldsJson);
    if (customFieldsParsed === null) {
      setError('JSON de campos customizados inválido.');
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

    try {
      await cardsService.addTimelineNote(card.id, devToken, newNote.trim());
      setNewNote('');
      await loadWorkspace();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Falha ao adicionar nota.');
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

  const leadershipSnapshot = useMemo(() => {
    const contactNames = (card?.contacts || [])
      .map(resolveContactName)
      .filter((value): value is string => Boolean(value));

    const assignedNames = tasks
      .map((task) => (task.assignedTo || '').trim())
      .filter((value) => value.length > 0);

    const uniqueTeam = Array.from(new Set([...contactNames, ...assignedNames]));
    const leader = uniqueTeam[0] || 'Não definido';

    return {
      leader,
      teamCount: uniqueTeam.length,
      teamNames: uniqueTeam,
    };
  }, [card?.contacts, tasks]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Card Workspace 2.0</h1>
            <p className="text-sm text-neutral-600">Card #{cardId || '-'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Cole token JWT de teste"
              className="min-w-[260px] rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={onApplyToken}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Aplicar token
            </button>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
            >
              Recarregar
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

      {loading && (
        <section className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-600">
          Carregando workspace...
        </section>
      )}

      {!loading && card && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
          <article className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{card.title}</h2>
                <p className="text-sm text-neutral-600">
                  Status: <strong>{statusLabel(card.status)}</strong>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                    Líder: {leadershipSnapshot.leader}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                    Equipe: {leadershipSnapshot.teamCount}
                  </span>
                </div>
                {leadershipSnapshot.teamNames.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-600">
                    {leadershipSnapshot.teamNames.join(' • ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onSaveCard()}
                disabled={savingCard}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingCard ? 'Salvando...' : 'Salvar card'}
              </button>
            </header>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Título
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  className="h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, status: event.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                  <option value="blocked">blocked</option>
                </select>
              </div>
            </div>

            <section className="rounded-lg border border-neutral-200 p-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                Tags
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => void onRemoveTagFromCard(tag.id)}
                      className="rounded bg-white/20 px-1"
                    >
                      x
                    </button>
                  </span>
                ))}
                {card.tags.length === 0 && (
                  <span className="text-sm text-neutral-600">Sem tags no card.</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar tag existente</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void onAddTagToCard()}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
                >
                  Vincular tag
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="Nova tag"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  className="h-10 w-12 rounded border border-neutral-300"
                />
                <button
                  type="button"
                  onClick={() => void onCreateTag()}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
                >
                  Criar tag
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Contatos (JSON)
                </label>
                <textarea
                  value={form.contactsJson}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, contactsJson: event.target.value }))
                  }
                  className="h-32 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Campos customizados (JSON)
                </label>
                <textarea
                  value={form.customFieldsJson}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, customFieldsJson: event.target.value }))
                  }
                  className="h-32 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
                />
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                  Tarefas do card
                </h3>
                <button
                  type="button"
                  onClick={onOpenNewTask}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Nova tarefa
                </button>
              </div>
              <p className="mb-3 text-xs font-semibold text-neutral-600">
                Progresso: {card.progress.percent}% ({card.progress.completed}/{card.progress.total})
              </p>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left hover:bg-neutral-100"
                  >
                    <p className="text-sm font-semibold text-neutral-900">{task.title}</p>
                    <p className="text-xs text-neutral-600">
                      {task.status} • {task.priority} • {task.assignedTo || 'Sem responsável'}
                    </p>
                  </button>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-neutral-600">Nenhuma tarefa neste card.</p>
                )}
              </div>
            </section>
          </article>

          <aside className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                Timeline
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Adicionar nota..."
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void onSubmitNote()}
                  className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Enviar
                </button>
              </div>
            </section>

            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {timeline.map((event) => (
                <article
                  key={event.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-neutral-900">{event.action}</p>
                  <p className="text-xs text-neutral-600">{formatDateTime(event.created_at)}</p>
                  {event.details?.note && (
                    <p className="mt-1 text-sm text-neutral-700">
                      {String(event.details.note)}
                    </p>
                  )}
                </article>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-neutral-600">Sem eventos na timeline.</p>
              )}
            </div>
          </aside>
        </section>
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
