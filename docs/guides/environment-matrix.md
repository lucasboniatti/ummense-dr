# Environment Matrix (Local Delivery)

## Backend (`@ummense/backend`)

| Variable | Required | Example (local) | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Yes | `http://127.0.0.1:55421` | Supabase local API URL |
| `SUPABASE_ANON_KEY` | Yes | `sb_publishable_...` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `sb_secret_...` | Required by startup preflight |
| `JWT_SECRET` | Yes | `local-jwt-secret-123` | Must be non-empty and >= 12 chars |
| `PORT` | No | `3001` | Defaults to `3001` |

## Frontend (`@ummense/frontend`)

| Variable | Required | Example (local) | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `http://127.0.0.1:3001` | Backend base URL used by dashboard services |
| `PORT` | No | `3000` or `3010` | Next dev/start port |

## Infra (`scripts/local-infra.sh`)

| Variable | Required | Example (local) | Notes |
| --- | --- | --- | --- |
| `REDIS_HOST` | No | `127.0.0.1` | Used by Redis connectivity checker |
| `REDIS_PORT` | No | `6379` | Used by Redis connectivity checker |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Optional override for websocket check |

`infra:up`, `infra:reset` and `infra:status` do not require mandatory env vars by default.

## Preflight Commands

```bash
npm run env:check
npm run env:check:backend
npm run env:check:frontend
npm run env:check:infra
```
