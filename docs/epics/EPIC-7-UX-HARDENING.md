# Epic 7: UX Hardening — Frontend Production-Ready

**Epic ID:** EPIC-7-UX-HARDENING
**Wave:** Wave 7 (UX Hardening & Production Polish)
**Status:** Draft (0/5 stories done)
**Created:** 2026-03-09
**Priority:** CRITICAL (P0)

---

## Epic Goal

Elevar o frontend de estado de validação técnica para produção real pronta para uso por usuários finais, fechando gaps identificados na análise do @analyst: autenticação com proteção de rotas, padronização de idioma, consistência visual e infraestrutura de UX (toasts, empty states, loading states, error boundaries).

---

## Context

Estado atual validado:
- Epic 6 entregou toda a superfície funcional: Painel, Fluxos, Cards, Tarefas, Calendário.
- Backend API completa e publicada (Story 6.6 Done).
- Deploy cloud ativo em Vercel (Epic 5 Done).
- **Gap principal:** autenticação sem proteção de rotas no frontend; idioma misto PT/EN; componentes de feedback sem padronização; placeholder em webhook form.

Este epic fecha o gap de "produto técnico entregue" → "produto utilizável em produção".

---

## Stories

1. **Story 7.1** — Auth Guard + Contexto de Sessão + Logout (Draft)
2. **Story 7.2** — Padronização PT-BR + Formulário de Webhook (Draft)
3. **Story 7.3** — Design System UX: Empty States, Loading & Toasts (Draft)
4. **Story 7.4** — Unificação de API Client + Error Boundary + Polimento Auth (Draft)
5. **Story 7.5** — UAT/E2E de Hardening UX + Go/No-Go (Draft)

---

## Dependency Chain (Mandatory)

1. Story 7.1 (Auth) é a primeira — bloqueia uso real.
2. Story 7.2 (Idioma) pode rodar em paralelo com 7.1.
3. Story 7.3 (Design System UX) depende de 7.2 para textos em PT-BR.
4. Story 7.4 (API Client + Error Boundary) depende de 7.1 para AuthContext.
5. Story 7.5 (UAT) inicia somente após 7.1–7.4 concluídas.

---

## Exit Criteria (Epic Done)

- [ ] Todas as rotas protegidas por auth guard (redirect para login).
- [ ] Logout funcional na sidebar.
- [ ] 100% da UI em PT-BR (nenhum texto em inglês).
- [ ] Formulário de criação de webhook operacional.
- [ ] Componente reutilizável de empty state aplicado em 7+ telas.
- [ ] Loading states padronizados (Spinner/PageLoader).
- [ ] Sistema de toast substituindo todos `alert()`.
- [ ] Error Boundary global prevenindo tela branca.
- [ ] Todas chamadas API passando pelo apiClient unificado.
- [ ] Login/Signup com identidade visual do produto.
- [ ] Build / Lint / Typecheck passando.
- [ ] UAT de hardening aprovada com evidências.

---

## Architectural Reference

- [frontend-ux-architecture-plan.md](file:///Users/lucasboniatti/.gemini/antigravity/brain/57010eee-0f57-4bb5-9f88-93a625222344/frontend-ux-architecture-plan.md) — Plano detalhado por @architect com 10 Work Packages.

---

## Change Log

- **2026-03-09:** Epic criado por `@sm` a partir da análise do @analyst e plano arquitetural do @architect.
