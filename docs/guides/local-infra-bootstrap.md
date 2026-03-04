# Local Infra Bootstrap (Supabase + Redis)

## Objetivo

Subir infraestrutura local de forma reproduzível para testes de backend, websocket e UAT.

## Pré-requisitos

- Docker Desktop ativo.
- Supabase CLI instalado.
- Dependências do monorepo instaladas (`npm install` na raiz).

## Comando único de bootstrap

```bash
npm run infra:up
```

Esse comando executa:
1. `docker compose` para subir Redis local.
2. `supabase start` para stack local Supabase.
3. `supabase db reset --yes` para aplicar migrations na ordem + seed.
4. Check de conectividade Redis para backend queue e websocket.

## Status e observabilidade

```bash
npm run infra:status
```

## Reaplicar seed/migrations (idempotência)

```bash
npm run infra:seed
```

## Reset completo para reexecução limpa

```bash
npm run infra:reset
```

Esse fluxo:
1. reseta o banco local para estado das migrations + seed;
2. limpa Redis via `FLUSHALL`;
3. valida conectividade novamente.

## Desligar stack local

```bash
npm run infra:down
```

## Endpoints padrão (stack local)

- Supabase API: `http://127.0.0.1:55421`
- Supabase Studio: `http://127.0.0.1:55423`
- Redis: `127.0.0.1:6379`

## Troubleshooting rápido

1. Porta ocupada no Supabase: ajuste portas em `supabase/config.toml`.
2. Falha em Redis check: valide `docker compose -f docker-compose.local.yml ps`.
3. Falha em migrations: rodar `supabase db reset --yes --debug` para diagnóstico detalhado.
