# UAT Checklist - Epic 10 UX Design System Excellence

Data de execucao: `2026-03-10`
Responsavel: `@qa`
Ambiente: `Workspace local com frontend/backend e parity em modo smoke-only`

## 1. Fundacao
- [x] Validar toggle de dark mode no sidebar com persistencia apos reload.
- [x] Validar breadcrumbs no shell das rotas alvo do Epic 10.
- [x] Validar iconografia operacional sem reintroducao de emojis nas superficies auditadas.
- [x] Validar alinhamento de tokens sem regressao em `globals.css`, Tailwind e source semantico.

## 2. Primitives e Componentes
- [x] Validar rollout de `Select` em filtros e formularios prioritarios.
- [x] Validar rollout de `Checkbox` em listas e formularios prioritarios.
- [x] Validar rollout de `RadioGroup` em `TriggerTypeSelector`.
- [x] Validar rollout de `Tabs` em `/dashboard/integrations`.
- [x] Validar `Breadcrumb`, `Skeleton` e `ConfirmDialog` consolidados no shell e nas superficies operacionais.

## 3. Padroes UX
- [x] Validar `TaskForm`, `WebhookForm` e `SignupForm` com `react-hook-form` + Zod.
- [x] Validar padrao de feedback para `loading`, `error`, `empty` e `success`.
- [x] Validar confirmacoes para acoes destrutivas em tarefa, DLQ, webhooks e controles operacionais.

## 4. Navegacao Avancada
- [x] Validar busca global via `Cmd/Ctrl+K`.
- [x] Validar help modal de atalhos e shortcuts do shell.
- [x] Validar breadcrumbs dinamicos nas rotas estaticas e dinamicas do recorte.

## 5. Polimento Visual
- [x] Validar utilitarios de motion e reduced motion.
- [x] Validar micro-interacoes nos primitives compartilhados.
- [x] Validar niveis semanticos de elevacao nos componentes principais.

## 6. Quality Gates
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:e2e:parity`
  - Resultado no ambiente atual: `PASS (5 passed, 15 skipped)`
  - Observacao: suite executada em `smoke-only parity` por indisponibilidade de fixtures cloud/local

## 7. Evidencias
- [x] Evidencias smoke salvas em `docs/qa/evidence/epic-10/`
- [x] Gate das stories `10.1` a `10.3` consolidado em `docs/qa/gates/story-10.1-10.3-qa-gate-second-pass.md`
- [x] Gate das stories `10.4` a `10.19` consolidado em `docs/qa/gates/story-10.4-10.19-qa-gate-second-pass.md`
- [x] Relatorio UAT consolidado em `docs/qa/uat-epic-10-report.md`
