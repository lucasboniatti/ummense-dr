# UAT Checklist - Epic 8 UX/UI Visual Parity

Data de execução: `2026-03-09`
Responsável: `@qa`
Ambiente: `Homologação local integrada (infra + backend + frontend + worktree before/after)`

## 1. Shell e Fundação Visual
- [x] Validar shell before/after em desktop.
- [x] Validar shell before/after em mobile.
- [x] Validar ausência de overflow horizontal em `375px`, `768px` e `1440px`.
- [x] Validar foco/teclado nos controles principais do shell.
- [x] Validar smoke visual de `/`, `/dashboard/automations`, `/cards/[cardId]` e `/auth/login`.

## 2. Home Operacional
- [x] Validar before/after da home em desktop e mobile.
- [x] Validar `TasksPanel` com estados `loading`, `empty` e `error`.
- [x] Validar `CalendarPanel` com estados `loading`, `empty` e `error`.
- [x] Validar navegação de tarefa para `/cards/[cardId]`.
- [x] Validar consumo real de `/api/tasks`, `/api/events`, `/api/panel/overview` e `/api/cards/:id`.

## 3. Fluxos 2.0
- [x] Validar before/after do board em desktop e mobile.
- [x] Validar before/after de coluna e card.
- [x] Validar drag-and-drop com persistência após refresh.
- [x] Validar estados `loading`, `error` e `empty/filter`.
- [x] Validar alternância `Quadro`, `Tabela` e `Indicadores`.

## 4. Card Workspace 2.0
- [x] Validar before/after da tela completa em desktop e mobile.
- [x] Validar before/after de header e timeline.
- [x] Validar ausência de JWT no fluxo principal.
- [x] Validar `Modo técnico` colapsado com JWT/JSON apenas em superfície secundária.
- [x] Validar salvar título no fluxo principal.
- [x] Validar publicação de nota na timeline.
- [x] Validar abertura do `TaskModal` a partir da lista de tarefas do card.

## 5. Quality Gates
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:e2e:parity`

## 6. Evidências
- [x] Evidências before/after salvas em `docs/qa/evidence/epic-8`
- [x] Relatório visual consolidado em `docs/qa/epic-8-visual-validation-report.md`
- [x] Relatório UAT consolidado em `docs/qa/uat-epic-8-visual-parity-report.md`
