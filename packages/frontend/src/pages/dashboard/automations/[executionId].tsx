import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { automationService } from '../../../services/automation.service';
import { ExecutionDetailModal } from '../../../components/ExecutionDetailModal';
import { PageLoader } from '../../../components/ui/PageLoader';

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
    return <div className="app-page"><PageLoader message="Carregando detalhes da execução..." /></div>;
  }

  if (!detail) {
    return <div className="app-inline-banner app-inline-banner-error"><strong>Execução</strong>Execução não encontrada</div>;
  }

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-heading">
          <p className="app-kicker">Automacoes</p>
          <h1 className="app-page-title">Detalhes da execução</h1>
          <p className="app-page-copy">Rastro da execução, condições avaliadas, ações e detalhes de erro.</p>
        </div>
      </section>

      {error && <div className="app-inline-banner app-inline-banner-error"><strong>Execução</strong>{error}</div>}

      {detail && <ExecutionDetailModal execution={detail} onClose={() => router.back()} />}
    </div>
  );
}
