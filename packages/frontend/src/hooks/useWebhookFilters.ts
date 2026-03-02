import { useState, useCallback } from 'react';

interface Filters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const useWebhookFilters = (initialFilters: Filters = {}) => {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const updateFilter = useCallback((key: keyof Filters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setOffset(0); // Reset pagination on filter change
  }, []);

  const updateStatus = useCallback((status?: string) => {
    updateFilter('status', status);
  }, [updateFilter]);

  const updateSearch = useCallback((search?: string) => {
    updateFilter('search', search);
  }, [updateFilter]);

  const updateDateRange = useCallback(
    (startDate?: string, endDate?: string) => {
      setFilters((prev) => ({
        ...prev,
        startDate,
        endDate,
      }));
      setOffset(0);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setOffset(0);
  }, []);

  const hasActiveFilters = useCallback(() => {
    return Object.values(filters).some((v) => v !== undefined && v !== '');
  }, [filters]);

  const setQuickDateRange = useCallback((range: 'last24h' | 'last7d' | 'last30d') => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = endDate;

    switch (range) {
      case 'last24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'last7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'last30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
    }

    updateDateRange(startDate, endDate);
  }, [updateDateRange]);

  return {
    filters,
    limit,
    offset,
    setOffset,
    updateFilter,
    updateStatus,
    updateSearch,
    updateDateRange,
    setQuickDateRange,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
};
