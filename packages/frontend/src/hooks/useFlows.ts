import { useEffect, useRef, useState } from 'react';
import {
  flowsApi,
  getTaskflowErrorMessage,
} from '../services/taskflow.api';
import type {
  CreateFlowDTO,
  FlowColumn,
  FlowListItem,
  FlowWithSeedColumns,
  UpdateFlowDTO,
} from '../types/taskflow';

interface UseFlowsResult {
  flows: FlowListItem[];
  loading: boolean;
  error: string | null;
  createFlow: (payload: CreateFlowDTO) => Promise<FlowWithSeedColumns>;
  updateFlow: (flowId: string, payload: UpdateFlowDTO) => Promise<FlowListItem>;
  deleteFlow: (flowId: string) => Promise<void>;
  refetch: () => Promise<FlowListItem[]>;
}

function countCards(columns: FlowColumn[]) {
  return columns.reduce((total, column) => {
    const cards = (column as FlowColumn & { cards?: unknown }).cards;
    return total + (Array.isArray(cards) ? cards.length : 0);
  }, 0);
}

function toFlowListItem(flow: FlowWithSeedColumns): FlowListItem {
  return {
    ...flow,
    column_count: flow.columns.length,
    card_count: countCards(flow.columns),
  };
}

export function useFlows(): UseFlowsResult {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchFlows = async (withLoading: boolean = true) => {
    if (withLoading && mountedRef.current) {
      setLoading(true);
    }

    if (mountedRef.current) {
      setError(null);
    }

    try {
      const response = await flowsApi.list();

      if (mountedRef.current) {
        setFlows(response.data);
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
    void fetchFlows().catch(() => undefined);
  }, []);

  const createFlow = async (payload: CreateFlowDTO) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await flowsApi.create(payload);

      if (mountedRef.current) {
        setFlows((currentFlows) => [toFlowListItem(response.data), ...currentFlows]);
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

  const updateFlow = async (flowId: string, payload: UpdateFlowDTO) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await flowsApi.update(flowId, payload);
      const existingFlow = flows.find((flow) => flow.id === flowId);
      const nextFlow: FlowListItem = existingFlow
        ? {
            ...existingFlow,
            ...response.data,
            column_count: existingFlow.column_count,
            card_count: existingFlow.card_count,
          }
        : {
            ...response.data,
            column_count: 0,
            card_count: 0,
          };

      if (mountedRef.current) {
        setFlows((currentFlows) =>
          currentFlows.map((flow) =>
            flow.id === flowId
              ? {
                  ...nextFlow,
                }
              : flow
          )
        );
      }

      return nextFlow;
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

  const deleteFlow = async (flowId: string) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      await flowsApi.delete(flowId);

      if (mountedRef.current) {
        setFlows((currentFlows) =>
          currentFlows.filter((flow) => flow.id !== flowId)
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
    flows,
    loading,
    error,
    createFlow,
    updateFlow,
    deleteFlow,
    refetch: () => fetchFlows(),
  };
}
