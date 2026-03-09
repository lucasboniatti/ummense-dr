# QA Gate - Story 8.5

- Story: `8.5`
- Reviewer: `@qa (Quinn)`
- Date: `2026-03-09`
- Decision: `PASS`

## Criteria
- [x] Checklist UAT consolidado para shell, home, board e card workspace.
- [x] Evidências before/after desktop e mobile consolidadas em `docs/qa/evidence/epic-8`.
- [x] `npm run lint` executado com sucesso.
- [x] `npm run typecheck` executado com sucesso.
- [x] `npm test` executado com sucesso.
- [x] `npm run build` executado com sucesso.
- [x] `npm run test:e2e:parity` executado com sucesso (`17 passed`).
- [x] Smoke final cobre `/`, `/dashboard/automations`, `/cards/[cardId]`, `/auth/login` e `/auth/signup`.
- [x] Nenhum defeito `CRITICAL` ou `HIGH` permaneceu aberto no fechamento técnico do Epic 8.

## Evidências
- Relatório UAT: [uat-epic-8-visual-parity-report.md](../uat-epic-8-visual-parity-report.md)
- Checklist UAT: [uat-epic-8-visual-parity-checklist.md](../uat-epic-8-visual-parity-checklist.md)
- Relatório visual: [epic-8-visual-validation-report.md](../epic-8-visual-validation-report.md)
- Suíte parity: [product-parity.e2e.ts](../../../packages/e2e/tests/product-parity.e2e.ts)

## Findings
1. `FIXED` - A suíte parity foi atualizada para o modelo autenticado atual, para os seletores reais da UI e para o bootstrap local de fixture.
2. `FIXED` - O backend local passou a aceitar origens `localhost` e `127.0.0.1` fora de produção, removendo a falha estrutural de CORS da trilha parity.
3. `FIXED` - `TaskModal` e `EventEditor` passaram a expor semântica de `dialog`, estabilizando acessibilidade e automação.
4. `FIXED` - O gate técnico do Epic 8 agora fecha com `lint`, `typecheck`, `test`, `build` e `test:e2e:parity` todos verdes.

## Recommendation
- `GO` técnico em QA para a Story 8.5.
- Próximo dono: `@pm` para decisão formal de produto e go/no-go final.
