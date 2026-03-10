# Epic 10: UX Design System Excellence

**Epic ID:** EPIC-10-UX-DESIGN-SYSTEM-EXCELLENCE
**Status:** Released
**Priority:** P0 (Critical)
**Created:** 2026-03-09
**PM Reviewed:** 2026-03-10
**Owner:** @pm (Morgan)

---

## Overview

Transformar o frontend em uma aplicação de alto padrão de usabilidade e otimização, seguindo as referências Ummense, ClickUp e Monday. Este epic consolida todas as melhorias de UX/UI identificadas na auditoria completa realizada pela @ux-design-expert.

## Post-Release Follow-up

- Em 2026-03-10 foi preparada uma tranche complementar de recuperacao visual e consolidacao do design system no workspace atual.
- Esta tranche amplia o release original com polimento adicional de shell, dashboard, automacoes, webhooks, integracoes, historico e superfices secundarias.
- O pacote follow-up ja possui auditoria, handoff e checklist comercial, mas ainda depende de commit, push e deploy para substituir a versao atualmente publicada.

---

## Problem Statement

A auditoria UX/UI identificou os seguintes gaps críticos:

| Gap | Severidade | Impacto |
|-----|------------|---------|
| Dark Mode não exposto ao usuário | Alta | Usuário não pode alternar temas |
| Ícones mistos (emojis + lucide) | Média | Inconsistência visual |
| Design tokens desconectados | Alta | CSS e Tailwind não sincronizados |
| Primitives faltantes ou nao consolidados | Alta | Select, Checkbox, Radio e Tabs ainda faltam; Breadcrumb, Skeleton e ConfirmDialog precisam consolidacao e rollout |
| Formulários inconsistentes | Média | Validação mista (Zod vs manual) |
| Feedback inconsistente | Média | Loading, error, empty states variados |
| Sem navegação avançada | Média | Sem busca global, atalhos, breadcrumbs |
| Sem micro-interações | Baixa | Animações e feedback visual limitados |

---

## Goals

1. **Fundação Sólida**: Expor dark mode, padronizar ícones, conectar design tokens
2. **Primitives Completos**: Implementar os componentes realmente faltantes e consolidar os assets ja existentes com reuso-first
3. **Padrões UX Consistentes**: Formulários, feedback e confirmações padronizados
4. **Navegação Profissional**: Busca global, atalhos e breadcrumbs
5. **Polimento Visual**: Animações, micro-interações e elevação

---

## Stories Breakdown

### Fase 1: Fundação (1-2 dias)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.1 | Expor Dark Mode no Sidebar | 3 | P0 |
| 10.2 | Padronizar Ícones (remover emojis) | 2 | P1 |
| 10.3 | Conectar Design Tokens ao CSS | 5 | P0 |

### Fase 2: Primitives e Componentes (2-3 dias)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.4 | Implementar Select Component | 5 | P0 |
| 10.5 | Implementar Checkbox Component | 3 | P1 |
| 10.6 | Implementar Radio Group Component | 3 | P1 |
| 10.7 | Implementar Tabs Component | 5 | P1 |
| 10.8 | Consolidar Breadcrumb Component | 3 | P1 |
| 10.9 | Consolidar Skeleton Genérico | 3 | P1 |
| 10.10 | Consolidar ConfirmDialog Reutilizável | 5 | P0 |

### Fase 3: Padrões UX (2-3 dias)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.11 | Padronizar Formulários com Zod | 8 | P1 |
| 10.12 | Implementar Feedback Consistente | 5 | P1 |
| 10.13 | Confirmação para Ações Destrutivas | 3 | P0 |

### Fase 4: Navegação Avançada (1-2 dias)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.14 | Implementar Busca Global (Cmd+K) | 8 | P1 |
| 10.15 | Implementar Atalhos de Teclado | 5 | P1 |
| 10.16 | Implementar Breadcrumbs Dinâmicos | 3 | P1 |

### Fase 5: Polimento Visual (2-3 dias)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.17 | Sistema de Animações | 5 | P2 |
| 10.18 | Micro-interações | 5 | P2 |
| 10.19 | Sistema de Elevação | 3 | P2 |

### Fase 6: Finalização (1 dia)

| Story | Título | Points | Prioridade |
|-------|--------|--------|------------|
| 10.20 | QA/UAT + PM Go/No-Go | 5 | P0 |

---

## Total Story Points

| Fase | Stories | Points |
|------|---------|--------|
| Fase 1 | 3 | 10 |
| Fase 2 | 7 | 27 |
| Fase 3 | 3 | 16 |
| Fase 4 | 3 | 16 |
| Fase 5 | 3 | 13 |
| Fase 6 | 1 | 5 |
| **Total** | **20** | **87** |

---

## Dependencies

### Internal Dependencies
- Epic 8 (Visual Parity) - Complete
- Epic 9 (UI/UX Improvements) - Complete

### External Dependencies
- Radix UI primitives adicionais, apenas nas stories que realmente exigirem novos controles (`10.4` a `10.7`)
- `cmdk`, apenas na branch de implementação da `10.14`
- Automação de tokens somente se a migração for entregue sem manter fontes de verdade concorrentes

---

## Technical Approach

### Design System Foundation
- Source of truth: `src/tokens/tokens.yaml`
- `src/tokens/index.ts`, `globals.css` e `packages/frontend/tailwind.config.js` alinhados incrementalmente ao source of truth
- Automação de geração opcional apenas se a migração ficar documentada e não criar drift adicional

### Component Library
- Reuso dos primitives existentes antes de introduzir novos componentes headless
- Radix UI onde houver gap real de acessibilidade ou ergonomia nas stories de componentes
- CVA (class-variance-authority) para variants
- TypeScript com props tipadas
- Acessibilidade WCAG AA

### Patterns
- React Hook Form + Zod para todos os formulários
- Toast para feedback temporário
- ConfirmDialog para ações destrutivas
- Skeleton para loading states

---

## Success Criteria

- [ ] Dark mode acessível e funcional
- [ ] Todos os ícones usando lucide-react
- [ ] Design tokens sincronizados (YAML → CSS → Tailwind)
- [ ] Primitives faltantes implementados e assets existentes consolidados sem duplicação de fonte de verdade
- [ ] Formulários padronizados com validação Zod
- [ ] Feedback consistente em todas as operações
- [ ] Confirmação para todas as ações destrutivas
- [ ] Busca global funcional (Cmd+K)
- [ ] Atalhos de teclado documentados
- [ ] Breadcrumbs em todas as rotas aninhadas
- [ ] Animações suaves e consistentes
- [ ] `npm run test:e2e:parity` passando ou ajustado com cobertura equivalente
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` verdes

---

## Reference

- Auditoria completa: @ux-design-expert (Uma)
- Referências: Ummense, ClickUp, Monday
- Design tokens: `src/tokens/tokens.yaml`
- Componentes existentes: `packages/frontend/src/components/ui/`
- UX specification: `docs/guides/ux-design-system-excellence-spec.md`
- PM scope validation: `docs/qa/gates/epic-10-pm-scope-validation.md`
- PM scope revalidation: `docs/qa/gates/epic-10-pm-scope-revalidation.md`
- Final QA gate: `docs/qa/gates/story-10.20-qa-gate.md`
- Final PM validation: `docs/qa/gates/story-10.20-pm-validation.md`
- SM story package review: `docs/qa/gates/epic-10-sm-story-package-review.md`
- QA story package review: `docs/qa/gates/epic-10-story-package-qa-review.md`
- QA story package review (second pass): `docs/qa/gates/epic-10-story-package-qa-review-second-pass.md`
- Final release handoff: `.aios/handoffs/handoff-pm-to-devops-epic-10.yaml`
- QA return handoff: `.aios/handoffs/handoff-qa-to-sm-epic-10-story-package-revision-20260310.yaml`
- QA approval handoff: `.aios/handoffs/handoff-qa-to-pm-epic-10-story-package-approved-20260310.yaml`
- PM approval handoff: `.aios/handoffs/handoff-pm-to-ux-epic-10-design-system-approved-20260310.yaml`
- UX handoff to dev: `.aios/handoffs/handoff-ux-to-dev-epic-10-design-system-spec-ready-20260310.yaml`
- Design system checklist: `docs/design-system-checklist.md`
- Design system handoff: `docs/design-system-handoff.md`
- Product recovery audit: `docs/qa/product-recovery-audit-20260310.md`
- Post-deploy commercial checklist: `docs/qa/epic-10-post-deploy-commercial-checklist.md`

---

## Change Log

- **2026-03-09:** Epic criado por @sm (River) com base na auditoria UX/UI da @ux-design-expert.
- **2026-03-09:** Escopo inicial validado por @po (Pax). CodeRabbit skip notice adicionado em todas as 20 stories.
- **2026-03-09:** Epic revisado por @pm (Morgan) com decisao `REQUIRES REVISION BEFORE EXECUTION`, registrada em `docs/qa/gates/epic-10-pm-scope-validation.md`.
- **2026-03-09:** Pacote de stories revisado por `@sm` com decisao `NEEDS REVISION BEFORE DEV HANDOFF`, registrada em `docs/qa/gates/epic-10-sm-story-package-review.md`.
- **2026-03-10:** QA revisou o pacote de stories e registrou decisao `FAIL` para o estado atual, com retorno obrigatório para `@sm` antes de nova rodada de QA e PM.
- **2026-03-10:** Stories `10.1` a `10.20` foram refinadas por `@sm` para refletir o código real, dependências reais e gates reais do repositório, com retorno do pacote para segunda passada de QA.
- **2026-03-10:** QA executou segunda passada do pacote revisado e registrou decisao `PASS`, liberando o epic para revalidacao formal de `@pm`.
- **2026-03-10:** PRD alinhado com a linguagem final do pacote revisado para diferenciar implementacao nova de consolidacao de assets ja existentes antes da revalidacao do `@pm`.
- **2026-03-10:** `@pm` revalidou o pacote revisado com decisao `APPROVED`, liberando o epic para especificacao de UX e planejamento de execucao.
- **2026-03-10:** `@ux-design-expert` consolidou a especificacao visual/interacional em `docs/guides/ux-design-system-excellence-spec.md` e liberou o epic para implementacao por `@dev`.
- **2026-03-10:** Especificacao UX refinada com rollout targets reais, coexistencia explicita entre busca global e filtros locais, e guardrails de PT-BR, motion e consolidacao de assets antes do handoff final para `@dev`.
- **2026-03-10:** QA consolidou UAT final e registrou `PASS` em `docs/qa/gates/story-10.20-qa-gate.md`; `@pm` registrou decisao final `GO` e liberou handoff para `@devops`.
- **2026-03-10:** `@devops` publicou a branch `codex/epic-10-yolo`, executou deploy do frontend em `https://ummense-dr-frontend.vercel.app` e validou smoke HTTP nas rotas criticas do release.
- **2026-03-10:** Foi preparada uma tranche complementar de recuperacao visual/design system, com auditoria em `docs/qa/product-recovery-audit-20260310.md`, handoff em `docs/design-system-handoff.md` e checklist comercial em `docs/qa/epic-10-post-deploy-commercial-checklist.md`, aguardando commit/push/deploy para nova publicacao.
