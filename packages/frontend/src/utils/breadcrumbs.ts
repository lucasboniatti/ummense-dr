import type { ParsedUrlQuery } from 'querystring';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface DynamicBreadcrumbLabels {
  cardTitle?: string;
  flowTitle?: string;
  webhookTitle?: string;
  executionTitle?: string;
}

function readId(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return undefined;
}

export function resolveBreadcrumbs(
  pathname: string,
  query: ParsedUrlQuery,
  dynamicLabels: DynamicBreadcrumbLabels = {}
): BreadcrumbItem[] {
  const cardId = readId(query.cardId as string | string[] | undefined);
  const flowId = readId((query.flowId || query.id) as string | string[] | undefined);
  const webhookId = readId(query.id as string | string[] | undefined);
  const executionId = readId(query.executionId as string | string[] | undefined);

  if (pathname === '/' || pathname === '/dashboard') {
    return [{ label: 'Painel', current: true }];
  }

  if (pathname === '/dashboard/automations') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Fluxos', current: true },
    ];
  }

  if (pathname === '/flows/[flowId]') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Fluxos', href: '/dashboard/automations' },
      { label: dynamicLabels.flowTitle || `Fluxo ${flowId || ''}`.trim(), current: true },
    ];
  }

  if (pathname === '/dashboard/webhooks') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Webhooks', current: true },
    ];
  }

  if (pathname === '/dashboard/webhooks/[id]') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Webhooks', href: '/dashboard/webhooks' },
      { label: dynamicLabels.webhookTitle || `Webhook ${webhookId || ''}`.trim(), current: true },
    ];
  }

  if (pathname === '/dashboard/integrations') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Integrações', current: true },
    ];
  }

  if (pathname === '/cards/[cardId]') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Cards', href: '/dashboard/automations' },
      { label: dynamicLabels.cardTitle || `Card ${cardId || ''}`.trim(), current: true },
    ];
  }

  if (pathname === '/automations/history') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Histórico', current: true },
    ];
  }

  if (pathname === '/automations/history/[executionId]') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Histórico', href: '/automations/history' },
      { label: dynamicLabels.executionTitle || `Execução ${executionId || ''}`.trim(), current: true },
    ];
  }

  if (pathname === '/dashboard/automations/[executionId]') {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Fluxos', href: '/dashboard/automations' },
      { label: dynamicLabels.executionTitle || `Execução ${executionId || ''}`.trim(), current: true },
    ];
  }

  if (pathname.startsWith('/admin')) {
    return [
      { label: 'Painel', href: '/dashboard' },
      { label: 'Configurações', current: true },
    ];
  }

  return [{ label: 'Workspace', current: true }];
}
