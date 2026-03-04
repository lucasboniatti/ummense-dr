# Cloud Deployment Runbook (Vercel + Supabase)

## Objective

Publicar backend e frontend com URLs públicas para validação externa do sistema.

---

## Production URLs (Current)

- Frontend: `https://ummense-dr-frontend.vercel.app`
- Backend: `https://ummense-dr-backend.vercel.app`

---

## Prerequisites

- Vercel CLI autenticado (`vercel whoami`).
- Supabase CLI autenticado (`supabase projects list`).
- Projeto Supabase cloud selecionado e migrations aplicáveis.

---

## 1. Apply Database Migrations (Supabase Cloud)

```bash
supabase link --project-ref <project_ref>
supabase db push --linked --include-all --yes
```

---

## 2. Deploy Backend (Vercel)

Backend root: `packages/backend`

Required env vars:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS` (ex.: `https://ummense-dr-frontend.vercel.app`)
- `NODE_ENV=production`

Deploy:

```bash
vercel link --yes --project ummense-dr-backend --cwd packages/backend

vercel deploy --prod --yes --cwd packages/backend \
  -e NODE_ENV=production \
  -e CORS_ALLOWED_ORIGINS=https://ummense-dr-frontend.vercel.app \
  -e SUPABASE_URL=<supabase_url> \
  -e SUPABASE_ANON_KEY=<supabase_anon_key> \
  -e SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key> \
  -e JWT_SECRET=<jwt_secret>
```

---

## 3. Deploy Frontend (Vercel)

Frontend root: `packages/frontend`

Required env var:
- `NEXT_PUBLIC_API_BASE_URL=<backend_public_url>`

Deploy:

```bash
vercel link --yes --project ummense-dr-frontend --cwd packages/frontend

vercel deploy --prod --yes --cwd packages/frontend \
  -b NEXT_PUBLIC_API_BASE_URL=<backend_public_url> \
  -e NEXT_PUBLIC_API_BASE_URL=<backend_public_url>
```

---

## 4. Production Smoke Validation

```bash
# Backend health
curl -i https://ummense-dr-backend.vercel.app/health

# Frontend home
curl -i https://ummense-dr-frontend.vercel.app/

# Frontend critical route
curl -i https://ummense-dr-frontend.vercel.app/dashboard/webhooks/local
```

Authenticated webhook flow:
1. Criar usuário no Supabase Auth (admin API).
2. Assinar JWT com o mesmo `JWT_SECRET` do backend.
3. Executar:
   - `POST /api/webhooks`
   - `GET /api/webhooks`

Expected:
- `POST` retorna `201`
- `GET` retorna `200` com webhook criado

---

## 5. Troubleshooting

- Build frontend falha com `@/lib/utils`:
  - garantir arquivo `packages/frontend/src/lib/utils.ts`.
- Build frontend falha com dependência ausente:
  - instalar dependência no workspace `@ummense/frontend`.
- Migration falha em `uuid_generate_v4()`:
  - usar `gen_random_uuid()` em migrations cloud-compatíveis.
- `401` em `/api/webhooks`:
  - validar token JWT assinado com `JWT_SECRET` da produção.
