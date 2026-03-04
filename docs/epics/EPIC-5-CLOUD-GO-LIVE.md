# Epic 5: Cloud Go-Live & Public Validation

**Epic ID:** EPIC-5-CLOUD-GO-LIVE
**Wave:** Wave 5 (Public Deployment)
**Status:** Done (1/1 stories closed)
**Created:** 2026-03-04
**Priority:** CRITICAL (P0)

---

## Epic Goal

Publicar frontend e backend em ambiente cloud público, com banco remoto configurado e evidência mínima de operação para validação externa.

---

## Context

O Epic 4 encerrou o hardening local e o handoff operacional para uso em ambiente local reproduzível. O próximo passo é materializar o ambiente público com deploy cloud e validação de acesso externo.

---

## Stories

1. ✅ **Story 5.1** - Cloud Deployment Pipeline + Public URLs + Production Smoke (Done)

---

## Exit Criteria (Epic Done)

- [x] Backend publicado com endpoint público de health.
- [x] Frontend publicado com acesso público.
- [x] Banco Supabase remoto com migrations aplicadas.
- [x] Variáveis críticas de ambiente configuradas em produção.
- [x] Smoke test público (health + rota crítica + listagem autenticada) evidenciado.

---

## Change Log

- **2026-03-04:** Epic criado por `@sm/@master` para transição de local-only para cloud publicável.
- **2026-03-04:** Story 5.1 concluída com deploy público em Vercel + Supabase cloud. Epic fechado 1/1.
