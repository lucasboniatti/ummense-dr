# Backend Local Smoke Checks

## Objetivo

Validar rapidamente se o backend sobe localmente com configuração mínima e se o endpoint de saúde responde corretamente.

## Pré-requisitos

- Dependências instaladas no monorepo (`npm install` na raiz).
- Variáveis obrigatórias definidas para o backend:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET`

## 1) Boot local (caminho feliz)

No terminal da raiz do projeto:

```bash
SUPABASE_URL="https://local.supabase.co" \
SUPABASE_ANON_KEY="local-anon-key" \
SUPABASE_SERVICE_ROLE_KEY="local-service-role-key" \
JWT_SECRET="local-jwt-secret" \
PORT=3001 \
npm run start --workspace @ummense/backend
```

Sinais esperados:
- `Server running on http://localhost:3001`
- `Health check: http://localhost:3001/health`

## 2) Health check

Com o servidor rodando:

```bash
curl -i http://localhost:3001/health
```

Resultado esperado:
- Status HTTP `200 OK`
- Corpo JSON com `status: "ok"` e `timestamp`

## 3) Falha rápida por env ausente (caminho negativo)

Exemplo removendo `SUPABASE_SERVICE_ROLE_KEY`:

```bash
SUPABASE_URL="https://local.supabase.co" \
SUPABASE_ANON_KEY="local-anon-key" \
JWT_SECRET="local-jwt-secret" \
npm run start --workspace @ummense/backend
```

Resultado esperado:
- Processo encerra com código diferente de `0`
- Mensagem clara de startup com variável ausente
