# Environment Troubleshooting (Local)

## 1) Preflight Fail: Missing Variables

Symptom:
- `npm run env:check:backend` or `npm run env:check:frontend` returns `FAIL`.

Fix:
1. Populate `.env` (or export in shell) using [environment-matrix.md](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/docs/guides/environment-matrix.md).
2. Re-run the specific check:

```bash
npm run env:check:backend
```

## 2) Preflight Fail: Insecure Placeholder

Symptom:
- `JWT_SECRET` flagged as insecure placeholder or too short.

Fix:
1. Replace with a non-default value (>= 12 chars).
2. Re-run check:

```bash
npm run env:check:backend
```

## 3) Backend Does Not Start

Symptom:
- Startup fails with `[startup] Failed to initialize backend`.

Fix:
1. Confirm preflight:

```bash
npm run env:check:backend
```

2. Confirm Supabase local stack:

```bash
npm run infra:status
```

## 4) Frontend Boot Fails on Port

Symptom:
- `EADDRINUSE` on port `3000`.

Fix:
1. Start on another port:

```bash
PORT=3010 npm run dev:frontend
```

2. Access the custom port (`http://localhost:3010`).

## 5) Dashboard Cannot Reach Backend

Symptom:
- `/dashboard/webhooks/local` reports backend unavailable.

Fix:
1. Ensure backend is running (`http://127.0.0.1:3001/health`).
2. Export frontend env:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 npm run dev:frontend
```

## 6) Redis Check Fails

Symptom:
- `infra:check:redis` exits non-zero.

Fix:
1. Ensure Redis container is healthy:

```bash
docker compose -f docker-compose.local.yml ps
```

2. Restart infra:

```bash
npm run infra:down
npm run infra:up
```
