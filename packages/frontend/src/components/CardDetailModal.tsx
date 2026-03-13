import React, { useEffect, useMemo, useState } from 'react';
import { PencilLine, X } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { cardsApi, getTaskflowErrorMessage } from '../services/taskflow.api';
import type { CardWithTasks, Task } from '../types/taskflow';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { Toast } from './Toast';

interface CardDetailModalProps {
  isOpen: boolean;
  cardId: string;
  cardTitle?: string;
  onClose: () => void;
  onCardUpdated?: () => void;
}

function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`task-skeleton-${index}`}
          className="rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function normalizeDescription(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function CardDetailModal({
  isOpen,
  cardId,
  cardTitle,
  onClose,
  onCardUpdated,
}: CardDetailModalProps) {
  const [card, setCard] = useState<CardWithTasks | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [cardError, setCardError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'error' | 'success'>('error');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks(isOpen ? cardId : null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !cardId) {
      return;
    }

    let active = true;

    async function loadCard() {
      setCardLoading(true);
      setCardError(null);
      setEditingTitle(false);
      setEditingDescription(false);

      try {
        const response = await cardsApi.get(cardId);

        if (active) {
          setCard(response.data);
          setTitleDraft(response.data.title);
          setDescriptionDraft(response.data.description || '');
        }
      } catch (error) {
        if (active) {
          setCardError(getTaskflowErrorMessage(error));
        }
      } finally {
        if (active) {
          setCardLoading(false);
        }
      }
    }

    void loadCard();

    return () => {
      active = false;
    };
  }, [cardId, isOpen]);

  useEffect(() => {
    if (!tasksError) {
      return;
    }

    setToastTone('error');
    setToastMessage(tasksError);
  }, [tasksError]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const resolvedTasks = useMemo(() => {
    if (tasks.length > 0) {
      return tasks;
    }

    if (tasksLoading) {
      return card?.tasks || [];
    }

    if (tasksError && card?.tasks && card.tasks.length > 0) {
      return card.tasks;
    }

    return tasks;
  }, [card, tasks, tasksError, tasksLoading]);

  const handleCardSave = async (payload: {
    title?: string;
    description?: string | null;
  }) => {
    if (!cardId) {
      return;
    }

    setSavingCard(true);

    try {
      const response = await cardsApi.update(cardId, payload);

      setCard((currentCard) =>
        currentCard
          ? {
              ...currentCard,
              ...response.data,
            }
          : currentCard
      );

      if (payload.title !== undefined) {
        setTitleDraft(response.data.title);
        setEditingTitle(false);
      }

      if (payload.description !== undefined) {
        setDescriptionDraft(response.data.description || '');
        setEditingDescription(false);
      }

      onCardUpdated?.();
      setToastTone('success');
      setToastMessage('Card updated');
    } catch (error) {
      setToastTone('error');
      setToastMessage(getTaskflowErrorMessage(error));
    } finally {
      setSavingCard(false);
    }
  };

  const handleTitleCommit = async () => {
    if (!card) {
      setEditingTitle(false);
      return;
    }

    const nextTitle = titleDraft.trim();

    if (!nextTitle || nextTitle === card.title) {
      setTitleDraft(card.title);
      setEditingTitle(false);
      return;
    }

    await handleCardSave({ title: nextTitle });
  };

  const handleDescriptionCommit = async () => {
    if (!card) {
      setEditingDescription(false);
      return;
    }

    const nextDescription = normalizeDescription(descriptionDraft);

    if (nextDescription === card.description) {
      setDescriptionDraft(card.description || '');
      setEditingDescription(false);
      return;
    }

    await handleCardSave({ description: nextDescription });
  };

  const handleTaskStatusToggle = async (task: Task) => {
    setBusyTaskId(task.id);

    try {
      await updateTask(task.id, {
        status: task.status === 'done' ? 'open' : 'done',
      });
      onCardUpdated?.();
    } catch (error) {
      setToastTone('error');
      setToastMessage(getTaskflowErrorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleTaskCreate = async (payload: {
    title: string;
    priority: Task['priority'];
    due_date?: string | null;
  }) => {
    setCreatingTask(true);

    try {
      await createTask(payload);
      onCardUpdated?.();
      setToastTone('success');
      setToastMessage('Task created');
    } catch (error) {
      setToastTone('error');
      setToastMessage(getTaskflowErrorMessage(error));
      throw error;
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskUpdate = async (
    taskId: string,
    payload: Partial<Pick<Task, 'title' | 'priority' | 'due_date'>>
  ) => {
    setBusyTaskId(taskId);

    try {
      await updateTask(taskId, payload);
      onCardUpdated?.();
    } catch (error) {
      setToastTone('error');
      setToastMessage(getTaskflowErrorMessage(error));
      throw error;
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleTaskDelete = async (task: Task) => {
    setDeletingTaskId(task.id);

    try {
      await deleteTask(task.id);
      onCardUpdated?.();
      setToastTone('success');
      setToastMessage(`Task "${task.title}" deleted`);
    } catch (error) {
      setToastTone('error');
      setToastMessage(getTaskflowErrorMessage(error));
      throw error;
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                Card Detail
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                {card?.title || cardTitle || 'Card detail'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close card detail"
            >
              <X size={18} />
            </button>
          </div>

          {cardLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-24 animate-pulse rounded bg-gray-100" />
              <TaskListSkeleton />
            </div>
          ) : cardError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Failed to load card: {cardError}
            </div>
          ) : card ? (
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 md:grid-cols-[1.7fr,1fr]">
                  <div>
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Title
                      </label>
                      {editingTitle ? (
                        <input
                          type="text"
                          value={titleDraft}
                          onChange={(event) => setTitleDraft(event.target.value)}
                          onBlur={() => void handleTitleCommit()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleTitleCommit();
                            }

                            if (event.key === 'Escape') {
                              setTitleDraft(card.title);
                              setEditingTitle(false);
                            }
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                          disabled={savingCard}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingTitle(true)}
                          className="inline-flex items-center gap-2 text-left text-lg font-semibold text-gray-900 hover:text-blue-700"
                        >
                          <span>{card.title}</span>
                          <PencilLine size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Description
                      </label>
                      {editingDescription ? (
                        <textarea
                          value={descriptionDraft}
                          onChange={(event) => setDescriptionDraft(event.target.value)}
                          onBlur={() => void handleDescriptionCommit()}
                          className="min-h-[6rem] w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                          disabled={savingCard}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingDescription(true)}
                          className="w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 text-left text-sm text-gray-600 hover:border-blue-400 hover:text-blue-700"
                        >
                          {card.description || 'Click to add a description'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-white bg-white p-4 shadow-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Current Column
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {card.column_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Flow
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {card.flow_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Card ID
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-gray-500">
                        {card.id}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Tasks
                    </h3>
                    <p className="text-sm text-gray-500">
                      View, complete, edit and delete tasks for this card.
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {resolvedTasks.length} tasks
                  </span>
                </div>

                {tasksLoading && resolvedTasks.length === 0 ? (
                  <TaskListSkeleton />
                ) : resolvedTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    No tasks yet. Add the first task below.
                  </div>
                ) : (
                  <TaskList
                    tasks={resolvedTasks}
                    busyTaskId={busyTaskId}
                    deletingTaskId={deletingTaskId}
                    onTaskStatusToggle={handleTaskStatusToggle}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskDelete={handleTaskDelete}
                  />
                )}

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Add Task
                  </h4>
                  <TaskForm
                    onSubmit={handleTaskCreate}
                    submitting={creatingTask}
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Card not found.
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          tone={toastTone}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
