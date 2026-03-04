# Local Release Runbook (Epic 4 RC)

## Objective

Operar o sistema localmente em modo reproduzível para validação final e handoff.

## 1. Bootstrap

```bash
npm install
npm run infra:up
```

## 2. Environment Preflight

```bash
npm run env:check
```

## 3. Start Services

Backend:

```bash
SUPABASE_URL=http://127.0.0.1:55421 \
SUPABASE_ANON_KEY=<sb_publishable_key> \
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_key> \
JWT_SECRET=<jwt_secret_12+> \
npm run dev:backend
```

Frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 \
PORT=3010 \
npm run dev:frontend
```

## 4. Quality Gates

```bash
npm run quality:gates
```

Optional red-path verification:

```bash
npm run quality:gates:red
```

## 5. UAT Smoke

- Backend health: `curl -i http://127.0.0.1:3001/health`
- Frontend home: `http://127.0.0.1:3010/`
- Critical route: `http://127.0.0.1:3010/dashboard/webhooks/local`

## 6. Reset / Re-run

```bash
npm run infra:reset
```

## 7. Shutdown

```bash
npm run infra:down
```

## Troubleshooting

- Env issues: [environment-troubleshooting.md](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/docs/guides/environment-troubleshooting.md)
- Infra bootstrap: [local-infra-bootstrap.md](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/docs/guides/local-infra-bootstrap.md)
- Frontend smoke: [frontend-local-dashboard-smoke.md](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/docs/guides/frontend-local-dashboard-smoke.md)
