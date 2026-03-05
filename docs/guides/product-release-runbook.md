# Product Release Runbook - Epic 6

## 1. Pré-release
1. Garantir infra local/homologação saudável:
   - `npm run infra:status`
   - `curl -i http://127.0.0.1:3001/health`
2. Validar variáveis:
   - `npm run env:check`
3. Quality gates:
   - `npm run quality:gates`
4. E2E parity em homologação:
   - `PARITY_BASE_URL=<url-hml> npm run test:e2e:parity`

## 2. Go/No-Go
1. QA registra gate em `docs/qa/gates/story-6.7-qa-gate.md`.
2. PO registra decisão em `docs/qa/gates/story-6.7-po-validation.md`.
3. Critério de bloqueio:
   - qualquer bug crítico aberto.

## 3. Deploy
1. Merge branch aprovada em `master`.
2. Confirmar pipeline CI verde.
3. Publicar frontend/backend no ambiente alvo (Vercel + backend provider).
4. Rodar smoke pós-deploy:
   - `/`
   - `/dashboard/automations`
   - `/cards/:id`
   - `/dashboard/webhooks/local`
   - `GET /health`

## 4. Troubleshooting Rápido
1. Frontend não abre:
   - validar `NEXT_PUBLIC_API_BASE_URL`.
2. Erro 401 nas páginas:
   - aplicar JWT de teste no campo de token.
3. DnD sem persistência:
   - validar `PATCH /api/cards/:id/move` (auth/token).
4. Evento com horário errado:
   - confirmar que payload saiu em ISO UTC e frontend renderizou no timezone local.
