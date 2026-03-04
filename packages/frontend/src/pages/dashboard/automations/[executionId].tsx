import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { automationService } from '../../../services/automation.service';
import { ExecutionDetailModal } from '../../../components/ExecutionDetailModal';

export default function ExecutionDetailPage() {
  const router = useRouter();
  const { executionId } = router.query;
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (executionId) {
      loadDetail();
    }
  }, [executionId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const d = await automationService.getExecutionDetail(executionId as string);
      setDetail(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading execution details...</div>;
  }

  if (!detail) {
    return <div className="p-6">Execution not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Execution Details</h1>
        <p className="text-neutral-600 mt-1">Rule execution trace, conditions, actions, and error details</p>
      </div>

      {error && <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">{error}</div>}

      {detail && <ExecutionDetailModal execution={detail} onClose={() => router.back()} />}
    </div>
  );
}
