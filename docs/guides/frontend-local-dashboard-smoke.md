# Frontend Local Dashboard Smoke

## Objetivo

Validar boot do frontend em modo local conectado ao backend e verificar o fluxo crítico de Webhooks.

## Pré-requisitos

1. Infra local ativa:

```bash
npm run infra:up
```

2. Backend com env válido:

```bash
SUPABASE_URL=http://127.0.0.1:55421 \
SUPABASE_ANON_KEY=<sb_publishable_key> \
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_key> \
JWT_SECRET=local-jwt-secret-123 \
PORT=3001 \
npm run start --workspace @ummense/backend
```

## Boot Frontend

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 \
PORT=3010 \
npm run dev --workspace @ummense/frontend
```

> Use `PORT=3010` (ou outra porta) se `3000` estiver ocupada.

## Checkpoints de Smoke

1. Home local:
   - URL: `http://127.0.0.1:3010/`
   - Esperado: título `Synkra Local Frontend`.

2. Fluxo crítico:
   - URL: `http://127.0.0.1:3010/dashboard/webhooks/local`
   - Esperado: página renderiza com seção `Backend Health` e tabela/lista de webhooks (dados reais ou fallback).

3. Backend health:
   - URL: `http://127.0.0.1:3001/health`
   - Esperado: HTTP `200` com `status: ok`.

## Comportamento de Erro Esperado

- Se backend estiver fora, a página crítica deve mostrar mensagem acionável para subir o backend (`npm run dev:backend`/`start backend`).
- Se endpoint de webhooks retornar erro (ex.: `401` sem auth), a UI deve manter renderização e usar fallback para smoke/UAT.
