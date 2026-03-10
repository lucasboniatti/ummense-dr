import React, { useState } from 'react';

interface LogSearchFilters {
  ruleId?: string;
  webhookId?: string;
  status?: 'success' | 'failed' | 'pending';
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface LogsSearchInterfaceProps {
  onSearch?: (filters: LogSearchFilters) => void;
  isLoading?: boolean;
}

export const LogsSearchInterface: React.FC<LogsSearchInterfaceProps> = ({ onSearch, isLoading = false }) => {
  const [filters, setFilters] = useState<LogSearchFilters>({});

  const handleSearch = () => {
    onSearch?.(filters);
  };

  const handleReset = () => {
    setFilters({});
  };

  const handleChange = (key: keyof LogSearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  return (
    <div className="app-surface space-y-6 p-6">
      <div>
        <p className="app-kicker">Busca</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-neutral-900">Buscar logs</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Rule ID Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Rule ID</label>
          <input
            type="text"
            placeholder="Filter by rule..."
            value={filters.ruleId || ''}
            onChange={(e) => handleChange('ruleId', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          />
        </div>

        {/* Webhook ID Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Webhook ID</label>
          <input
            type="text"
            placeholder="Filter by webhook..."
            value={filters.webhookId || ''}
            onChange={(e) => handleChange('webhookId', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Date From Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">From Date</label>
          <input
            type="datetime-local"
            value={filters.dateFrom || ''}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">To Date</label>
          <input
            type="datetime-local"
            value={filters.dateTo || ''}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          />
        </div>

        {/* Search Term */}
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Search (error message, etc.)</label>
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleChange('searchTerm', e.target.value)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-neutral-400"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={handleReset}
          className="app-control h-11 rounded-[var(--radius-control)] px-4 text-sm font-medium text-neutral-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
