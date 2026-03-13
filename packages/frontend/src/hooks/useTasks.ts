import { useEffect, useRef, useState } from 'react';
import {
  getTaskflowErrorMessage,
  tasksApi,
} from '../services/taskflow.api';
import type {
  CreateTaskDTO,
  Task,
  TaskPriority,
  UpdateTaskDTO,
} from '../types/taskflow';

interface CreateTaskInput extends Omit<CreateTaskDTO, 'card_id'> {
  card_id?: string;
}

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (payload: CreateTaskInput) => Promise<Task>;
  updateTask: (taskId: string, payload: UpdateTaskDTO) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  refetch: () => Promise<Task[]>;
}

function sortTasks(tasks: Task[]) {
  const priorityOrder: Record<TaskPriority, number> = {
    P1: 0,
    P2: 1,
    P3: 2,
  };

  return [...tasks].sort((left, right) => {
    const priorityDiff = priorityOrder[left.priority] - priorityOrder[right.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dueDateLeft = left.due_date || '9999-12-31';
    const dueDateRight = right.due_date || '9999-12-31';
    const dueDateDiff = dueDateLeft.localeCompare(dueDateRight);

    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

export function useTasks(cardId?: string | null): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTasks = async (withLoading: boolean = true) => {
    if (!cardId) {
      if (mountedRef.current) {
        setTasks([]);
        setError(null);
        setLoading(false);
      }

      return [];
    }

    if (withLoading && mountedRef.current) {
      setLoading(true);
    }

    if (mountedRef.current) {
      setError(null);
    }

    try {
      const response = await tasksApi.list(cardId);

      if (mountedRef.current) {
        setTasks(sortTasks(response.data));
      }

      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (withLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchTasks().catch(() => undefined);
  }, [cardId]);

  const createTask = async (payload: CreateTaskInput) => {
    const resolvedCardId = payload.card_id || cardId;

    if (!resolvedCardId) {
      const localError = new Error('cardId is required to create a task');

      if (mountedRef.current) {
        setError(localError.message);
      }

      throw localError;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await tasksApi.create({
        ...payload,
        card_id: resolvedCardId,
      });

      if (mountedRef.current) {
        setTasks((currentTasks) =>
          sortTasks([...currentTasks, response.data])
        );
      }

      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const updateTask = async (taskId: string, payload: UpdateTaskDTO) => {
    const previousTasks = tasks;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const targetTask = previousTasks.find((task) => task.id === taskId);

      if (mountedRef.current && targetTask) {
        setTasks(
          sortTasks(
            previousTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    ...payload,
                    due_date:
                      payload.due_date === undefined
                        ? task.due_date
                        : payload.due_date,
                  }
                : task
            )
          )
        );
      }

      const response = await tasksApi.update(taskId, payload);

      if (mountedRef.current) {
        setTasks((currentTasks) =>
          sortTasks(
            currentTasks.map((task) =>
              task.id === taskId ? response.data : task
            )
          )
        );
      }

      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setTasks(previousTasks);
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      await tasksApi.delete(taskId);

      if (mountedRef.current) {
        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== taskId)
        );
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refetch: () => fetchTasks(),
  };
}
