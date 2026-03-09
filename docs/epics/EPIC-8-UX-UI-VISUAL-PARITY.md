# Epic 8: UX/UI Visual Parity Follow-Up

**Epic ID:** EPIC-8-UX-UI-VISUAL-PARITY
**Wave:** Wave 8 (Visual Parity & Product Polish Follow-Up)
**Status:** Ready for Release
**Created:** 2026-03-09
**Priority:** CRITICAL (P0)

---

## Epic Goal

Fechar o gap residual entre a paridade funcional ja entregue e a experiencia visual/operacional densa observada nos screenshots de referencia, sem expandir o escopo de produto para alem das superficies operacionais atuais.

---

## Context

Estado atual consolidado:

- [EPIC-6-PRODUCT-PARITY-UMMENSE.md](./EPIC-6-PRODUCT-PARITY-UMMENSE.md) entregou shell, painel, fluxos, card workspace, tarefas e calendario.
- [EPIC-7-UX-HARDENING.md](./EPIC-7-UX-HARDENING.md) entregou auth guard, PT-BR, empty states, loading, toasts, error boundary e polimento de auth.
- O follow-up visual foi estruturado em [docs/ux-ui-visual-parity-follow-up-plan.md](../ux-ui-visual-parity-follow-up-plan.md).
- O plano foi prevalidado por QA em [docs/qa/gates/ux-ui-visual-parity-plan-qa-preflight.md](../qa/gates/ux-ui-visual-parity-plan-qa-preflight.md).

Este epic foi aprovado formalmente por `@pm` em 2026-03-09 e permanece como artefato de referência para stories, UX, implementação, validação final e handoff de release.

**Product decision owner for this epic:** `@pm`

Rationale:
- este follow-up cruza priorizacao, posicionamento visual e release readiness
- por decisao explicita deste pacote, a validacao final de produto fica com `@pm`, nao com o padrao legado de `@po`

---

## Stories

1. **Story 8.1** - Design Foundation + Shell Refresh (Done)
2. **Story 8.2** - Operational Home Refresh (Done)
3. **Story 8.3** - Flows Board Visual Parity (Done)
4. **Story 8.4** - Card Workspace Productization (Done)
5. **Story 8.5** - Visual QA/UAT + PM Go/No-Go (Done)

---

## Dependency Chain

1. Story 8.1 deve iniciar primeiro.
2. Stories 8.2 e 8.3 dependem da fundacao visual criada em 8.1.
3. Story 8.4 depende de 8.1 e deve reutilizar os padroes estabilizados nas stories anteriores.
4. Story 8.5 inicia apenas apos 8.1-8.4 concluidas.

---

## Exit Criteria

- [x] Shell, home, flows e card workspace compartilham a mesma linguagem visual.
- [x] Design foundation reutilizável incorporada ao frontend.
- [x] Nenhum JWT cru ou JSON cru aparece no caminho principal do operador em `/cards/[cardId]`.
- [x] Desktop, tablet e mobile validados com evidências.
- [x] Regressão funcional inexistente nas jornadas principais.
- [x] Gate final QA registrado.
- [x] Decisão final PM GO/NOGO registrada.
- [x] DevOps acionado apenas após gate final e aprovação de produto.

---

## Change Log

- **2026-03-09:** Epic draft criado por `@sm` a partir do plano de follow-up visual aprovado em preflight pelo `@qa`.
- **2026-03-09:** Epic aprovado por `@pm` para detalhamento em `@ux-design-expert`, mantendo `@pm` como owner da decisao final de produto em 8.5.
- **2026-03-09:** Especificacao visual/interacional consolidada por `@ux-design-expert` em `docs/guides/ux-ui-visual-parity-spec.md` e liberada para implementacao por `@dev`.
- **2026-03-09:** Stories `8.1`, `8.2`, `8.3` e `8.4` concluídas por `@dev`, com evidências visuais consolidadas e validação manual registrada na trilha de QA.
- **2026-03-09:** Story `8.5` concluída com gate final aprovado por `@qa`, decisão `GO` registrada por `@pm` e handoff liberado para `@devops`.
- **2026-03-09:** Todos os critérios de saída foram validados e registrados; gate final QA aprovado por `@qa`; decisão `GO` registrada por `@pm`; `@devops` acionado apenas após a aprovação final de produto.
- **2026-03-09:** Epic movido para `Ready for Release` após a conclusão das stories `8.1` a `8.5`, validação dos critérios de saída e aprovação final de produto por `@pm`.
