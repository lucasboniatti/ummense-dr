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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-4">Search Logs</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Rule ID Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID</label>
          <input
            type="text"
            placeholder="Filter by rule..."
            value={filters.ruleId || ''}
            onChange={(e) => handleChange('ruleId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Webhook ID Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Webhook ID</label>
          <input
            type="text"
            placeholder="Filter by webhook..."
            value={filters.webhookId || ''}
            onChange={(e) => handleChange('webhookId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Date From Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="datetime-local"
            value={filters.dateFrom || ''}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="datetime-local"
            value={filters.dateTo || ''}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Search Term */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search (error message, etc.)</label>
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleChange('searchTerm', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
