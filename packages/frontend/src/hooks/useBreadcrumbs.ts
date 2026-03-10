import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { resolveBreadcrumbs } from '@/utils/breadcrumbs';
import { cardsService } from '@/services/cards.service';
import { flowsService } from '@/services/flows.service';
import { webhookService } from '@/services/webhook.service';
import { automationService } from '@/services/automation.service';

function getStoredToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    window.localStorage.getItem('tasksflow_dev_token') ||
    window.localStorage.getItem('token') ||
    ''
  );
}

export function useBreadcrumbs() {
  const router = useRouter();
  const [dynamicLabels, setDynamicLabels] = useState<{
    cardTitle?: string;
    flowTitle?: string;
    webhookTitle?: string;
    executionTitle?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;

    async function loadDynamicLabels() {
      const nextLabels: typeof dynamicLabels = {};
      const token = getStoredToken();

      try {
        if (router.pathname === '/cards/[cardId]' && token && typeof router.query.cardId === 'string') {
          const card = await cardsService.getById(Number(router.query.cardId), token);
          nextLabels.cardTitle = card.title;
        }

        if (router.pathname === '/flows/[flowId]' && token && typeof router.query.flowId === 'string') {
          const flow = await flowsService.getById(Number(router.query.flowId), token);
          nextLabels.flowTitle = flow.name;
        }

        if (
          router.pathname === '/dashboard/webhooks/[id]' &&
          typeof router.query.id === 'string'
        ) {
          const webhook = await webhookService.getWebhookDetail(router.query.id);
          nextLabels.webhookTitle = webhook.description || webhook.url;
        }

        if (
          (router.pathname === '/dashboard/automations/[executionId]' ||
            router.pathname === '/automations/history/[executionId]') &&
          typeof router.query.executionId === 'string'
        ) {
          const execution = await automationService.getExecutionDetail(router.query.executionId);
          nextLabels.executionTitle = execution.rule_name || `Execução ${router.query.executionId}`;
        }
      } catch {
        // Fallback labels are resolved in the util.
      }

      if (!cancelled) {
        setDynamicLabels(nextLabels);
      }
    }

    void loadDynamicLabels();

    return () => {
      cancelled = true;
    };
  }, [router.pathname, router.query]);

  return useMemo(
    () => resolveBreadcrumbs(router.pathname, router.query, dynamicLabels),
    [dynamicLabels, router.pathname, router.query]
  );
}
