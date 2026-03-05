import { useRouter } from 'next/router';
import { useMemo } from 'react';
import FlowsWorkspace from '../../features/flows/FlowsWorkspace';

export default function FlowByIdPage() {
  const router = useRouter();

  const flowId = useMemo(() => {
    const raw = router.query.flowId;
    if (typeof raw !== 'string') {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [router.query.flowId]);

  return <FlowsWorkspace initialFlowId={flowId} />;
}
