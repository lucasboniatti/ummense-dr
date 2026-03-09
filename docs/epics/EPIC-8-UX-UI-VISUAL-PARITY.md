# Epic 8: UX/UI Visual Parity Follow-Up

**Epic ID:** EPIC-8-UX-UI-VISUAL-PARITY
**Wave:** Wave 8 (Visual Parity & Product Polish Follow-Up)
**Status:** Ready for Development
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

Este epic draft existe para permitir o breakdown em stories pelo SM. A aprovacao formal do escopo e prioridade ainda depende do `@pm`.

**Product decision owner for this epic:** `@pm`

Rationale:
- este follow-up cruza priorizacao, posicionamento visual e release readiness
- por decisao explicita deste pacote, a validacao final de produto fica com `@pm`, nao com o padrao legado de `@po`

---

## Stories

1. **Story 8.1** - Design Foundation + Shell Refresh (Draft)
2. **Story 8.2** - Operational Home Refresh (Draft)
3. **Story 8.3** - Flows Board Visual Parity (Draft)
4. **Story 8.4** - Card Workspace Productization (Draft)
5. **Story 8.5** - Visual QA/UAT + PM Go/No-Go (Draft)

---

## Dependency Chain

1. Story 8.1 deve iniciar primeiro.
2. Stories 8.2 e 8.3 dependem da fundacao visual criada em 8.1.
3. Story 8.4 depende de 8.1 e deve reutilizar os padroes estabilizados nas stories anteriores.
4. Story 8.5 inicia apenas apos 8.1-8.4 concluidas.

---

## Exit Criteria

- [ ] Shell, home, flows e card workspace compartilham a mesma linguagem visual.
- [ ] Design foundation reutilizavel incorporada ao frontend.
- [ ] Nenhum JWT cru ou JSON cru aparece no caminho principal do operador em `/cards/[cardId]`.
- [ ] Desktop, tablet e mobile validados com evidencias.
- [ ] Regressao funcional inexistente nas jornadas principais.
- [ ] Gate final QA registrado.
- [ ] Decisao final PM GO/NOGO registrada.
- [ ] DevOps acionado apenas apos gate final e aprovacao de produto.

---

## Change Log

- **2026-03-09:** Epic draft criado por `@sm` a partir do plano de follow-up visual aprovado em preflight pelo `@qa`.
- **2026-03-09:** Epic aprovado por `@pm` para detalhamento em `@ux-design-expert`, mantendo `@pm` como owner da decisao final de produto em 8.5.
- **2026-03-09:** Especificacao visual/interacional consolidada por `@ux-design-expert` em `docs/guides/ux-ui-visual-parity-spec.md` e liberada para implementacao por `@dev`.
