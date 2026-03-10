# Feedback Patterns

## Objective

Padronizar loading, empty state, erro e sucesso nas superfícies operacionais mais usadas do frontend.

## Patterns

### Loading

- Use `Skeleton*` para listas, cards e tabelas quando a estrutura final já é conhecida.
- Use `PageLoader` para carregamento de página inteira ou estados iniciais sem layout definido.
- Use `Spinner` apenas dentro de ações pontuais, botões ou loaders compactos.

### Empty State

- Use `EmptyState` com título claro e descrição curta.
- Sempre que possível, inclua uma ação primária útil.
- Prefira `variant="compact"` dentro de cards e shells já existentes.

### Error

- Use `ErrorBanner` para falhas recuperáveis dentro do fluxo atual.
- Use `Toast` para confirmação rápida ou falha curta após ação do usuário.
- Use `ErrorBoundary` para falhas inesperadas e não recuperáveis no render.

### Destructive Actions

- Use `ConfirmDialog` antes de exclusão, limpeza em lote, cancelamento irreversível ou pausa com impacto operacional.
- Prefira copy objetiva em PT-BR com `confirmLabel` explícito para a ação final.
- Reuse o mesmo padrão em `TaskModal`, `DLQTable`, `PauseResumeControls` e páginas de webhooks.

### Success

- Use `Toast` para confirmar criação, atualização, exclusão ou testes bem-sucedidos.
- Mensagens devem ser curtas, específicas e em PT-BR.

## Rollout atual do Epic 10

- `TasksPanel` usa `SkeletonList` para loading estrutural.
- `DLQTable` usa `ErrorBanner`, `ConfirmDialog` e filtros padronizados.
- `WebhookForm`, `TaskForm` e `SignupForm` seguem `react-hook-form` + Zod.
- `AppShell` concentra busca global, atalhos e breadcrumbs dinâmicos.
