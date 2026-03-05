# Epic 6: Product Parity (Painel, Fluxos, Card, Tarefas, Calendário)

**Epic ID:** EPIC-6-PRODUCT-PARITY-UMMENSE
**Wave:** Wave 6 (UX + Product Surface Expansion)
**Status:** Implementation In Progress (2/7 stories done)
**Created:** 2026-03-04
**Priority:** CRITICAL (P0)

---

## Epic Goal

Evoluir o sistema atual de validação técnica para uma experiência de produto operacional completa, próxima ao padrão visual/funcional dos 4 fluxos de referência analisados (painel consolidado, fluxo kanban multi-view, card colaborativo, tarefa detalhada + calendário/eventos).

---

## Context

Estado atual validado no repositório:
- O backend expõe oficialmente apenas `webhooks` e `analytics` no runtime principal.
- Rotas de `flows/cards/tasks` existem, porém ainda com implementação mock e sem superfície completa de produto.
- O frontend possui páginas de validação funcional (webhooks/automations), mas não possui shell consolidado e jornada operacional equivalente aos prints de referência.

Este epic fecha esse gap com incremento orientado a produto real, mantendo o que já foi consolidado em confiabilidade e cloud go-live (Epics 3, 4 e 5).

---

## Stories

1. **Story 6.1** - App Shell + Painel Consolidado de Operações (Done)
2. **Story 6.2** - Fluxos 2.0 (Quadro/Tabela/Indicadores com persistência real) (Draft)
3. **Story 6.3** - Card Workspace 2.0 (Detalhes, equipe, timeline, tarefas do card) (Draft)
4. **Story 6.4** - Task Workspace 2.0 (Modal completo + histórico de alterações) (Draft)
5. **Story 6.5** - Calendário e Eventos Integrados ao Operacional (Draft)
6. **Story 6.6** - Backend/API Closure para produto completo (sem mocks) (Done)
7. **Story 6.7** - UAT/E2E de Paridade + Go/No-Go de Produto (Draft)

---

## Dependency Chain (Mandatory)

1. Story 6.6 (Backend/API Closure) deve iniciar primeiro.
2. Story 6.1 (App Shell) pode rodar em paralelo com 6.6, sem bloquear contrato de API.
3. Story 6.2 depende de 6.6 para persistência real.
4. Story 6.3 depende de 6.6 para timeline, contatos e campos customizados.
5. Story 6.4 depende de 6.6 para histórico de tarefa.
6. Story 6.5 depende de 6.6 para eventos e integração temporal.
7. Story 6.7 inicia somente após 6.1–6.6 concluídas e integradas.

---

## Exit Criteria (Epic Done)

- [ ] Navegação principal e painel operacional consolidados em produção.
- [ ] Fluxos com visão quadro/tabela/indicadores funcionando com dados reais persistidos.
- [ ] Card detalhado com timeline e tarefas internas operando ponta a ponta.
- [ ] Modal de tarefa com histórico completo e vínculo com card/fluxo.
- [ ] Calendário e eventos vinculados ao planejamento operacional.
- [ ] APIs de produto expostas no backend principal sem dependência de mocks.
- [ ] Bateria E2E/UAT de jornadas críticas aprovada com evidências.

---

## Change Log

- **2026-03-04:** Epic criado por `@sm` a partir da análise comparativa dos 4 prints de referência versus estado atual do produto.
- **2026-03-05:** Progresso atualizado por `@po` após fechamento das Stories 6.6 e 6.1.
