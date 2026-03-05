# QA Gate - Story 6.5

- Story: `6.5`
- Reviewer: `@qa (Quinn)`
- Date: `2026-03-05`
- Decision: `CONCERNS`

## O que foi validado
- Revisão de calendário, filtros rápidos e CRUD de eventos
- Revisão de normalização timezone (`datetime-local` -> UTC ISO)

## Findings
1. `MEDIUM` - AC 1 fala em marcação por volume; UI atual marca presença de evento, mas não evidencia volume diário de forma explícita.
2. `MEDIUM` - Testes de timezone planejados (virada de dia / DST / UTC->local) não foram executados com evidência.
3. `MEDIUM` - E2E de criação/edição de evento e reflexo de due date não foram anexados.

## Recomendação
- Evoluir visual de volume por dia (contagem/heat level).
- Anexar suíte de testes de timezone e E2E de calendário para fechamento do gate.
