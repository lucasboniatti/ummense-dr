# Local UAT Checklist (Epic 4)

**Date:** 2026-03-04
**Executor:** @qa

## P0 Scenarios

- [x] Infra bootstrap: `npm run infra:up` conclui com Redis check OK.
- [x] Auth guard: endpoint protegido sem token retorna `401`.
- [x] Backend health: `/health` retorna `200`.
- [x] Webhook critical flow: listar/criar/testar webhook autenticado.
- [x] Scheduling readiness: inserts em `automations`, `automation_schedules`, `execution_histories`.
- [x] Dashboard visibility: `/` e `/dashboard/webhooks/local` carregam com `200`.

## P1 Scenarios

- [x] Environment preflight bloqueia startup sem variáveis obrigatórias.
- [x] Quality gate red path interrompe pipeline em falha forçada.

## Notes

- O teste de webhook para `https://example.com/webhook-local` retorna `success=false` por indisponibilidade remota esperada, com resposta de erro estruturada (comportamento esperado para tratamento de falha).
