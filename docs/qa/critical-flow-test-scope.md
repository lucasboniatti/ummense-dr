# Critical Flow Test Scope (Epic 4)

## Escopo mínimo obrigatório

1. **Auth guard básico**
- Endpoint protegido sem token retorna `401`.
- Endpoint protegido com token JWT válido retorna resposta não bloqueada por auth middleware.

2. **Workflow/Execution readiness**
- Infra local sobe com migrations + seed sem erro.
- Tabelas de execução/agendamento existem após reset local.

3. **Webhook delivery surface**
- Rota de webhooks responde no backend local.
- Dashboard local de webhooks renderiza (dados reais ou fallback controlado).

4. **Scheduling readiness**
- Migrations de `automation_schedules` aplicadas em `infra:up`/`infra:reset`.
- Seed inclui dados mínimos para inspeção local.

5. **Dashboard visibility**
- Frontend local inicia por script padrão.
- Rota crítica `/dashboard/webhooks/local` carrega sem erro bloqueante.

## Evidência exigida

- Logs/outputs de comando (infra up/reset, quality gates, curls).
- Relatório de UAT com status `PASS/FAIL` por cenário.
- Decisão final go/no-go com referência aos artefatos.
