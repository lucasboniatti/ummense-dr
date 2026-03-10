# UMMENSE DR

## Frontend Theme

- O toggle de tema fica no rodape do sidebar.
- A preferencia e persistida em `localStorage` nas chaves `tasksflow_theme` e `theme` (fallback legado).
- Sem preferencia salva, o frontend respeita `prefers-color-scheme`.
- O dark mode e aplicado via `data-theme="dark"` no documento.

## Design Tokens

- `src/tokens/tokens.yaml` e a fonte semantica de verdade para os tokens compartilhados.
- `src/tokens/index.ts`, `packages/frontend/tailwind.config.js` e `packages/frontend/src/styles/globals.css` devem permanecer alinhados a esse source.
- Nenhuma automacao nova de geracao foi introduzida nesta fase; o alinhamento segue manual ate uma migracao dedicada ser aprovada.

## Frontend UX

- Busca global: `Cmd/Ctrl + K`
- Nova tarefa: `Cmd/Ctrl + N`
- Alternar sidebar: `Cmd/Ctrl + /`
- Ajuda de atalhos: `Shift + ?`
- Os padrões de feedback ficam documentados em `docs/guides/feedback-patterns.md`.

## Frontend Primitives

- `Select`, `Checkbox`, `RadioGroup` e `Tabs` ficam em `packages/frontend/src/components/ui/`.
- O rollout atual cobre `TaskForm`, `WebhookForm`, `TriggerTypeSelector`, `AppTopbar` e `dashboard/integrations`.
- `ConfirmDialog`, `Breadcrumb` e `Skeleton` seguem como assets consolidados do shell e dos fluxos operacionais.

## Frontend Forms

- O padrão preferencial do frontend é `react-hook-form` + `zodResolver`.
- Schemas compartilhados ficam em `packages/frontend/src/schemas/index.ts`.
- Inputs headless ou Radix devem ser integrados via `Controller` para manter validação e acessibilidade consistentes.

## Motion And Elevation

- Tokens semânticos de motion e elevação vivem em `src/tokens/tokens.yaml` e `src/tokens/index.ts`.
- Utilitários de animação, micro-interação, `prefers-reduced-motion` e elevação ficam em `packages/frontend/src/styles/animations.css`.
- Componentes interativos devem preferir classes compartilhadas como `motion-fade-in`, `hover-lift`, `pressable` e `elevation-*`.

## Quality Gates

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
