# Epic 8 Release Finalization Checklist

## Context

- Epic: `EPIC-8-UX-UI-VISUAL-PARITY`
- PR: `#14`
- Branch: `codex/epic-8-visual-parity`
- Current status: code ready, PR open, CI blocked on parity fixture env in GitHub Actions

## Finalization Tasks

- [ ] DevOps - Fix PR CI parity environment
  - Scope: unblock `.github/workflows/ci.yml` so `npm run test:e2e:parity` can run in GitHub Actions
  - Action paths:
    - add required GitHub Actions secrets/envs for parity fixture (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or equivalent, `JWT_SECRET`, and any required API base wiring)
    - or adjust CI/workflow parity strategy so the PR job does not depend on unavailable cloud fixture env
  - Done when: PR `quality` job is green

- [ ] Dev - Update code/workflow only if CI fix requires repo changes
  - Scope: touch code only if DevOps cannot solve the CI issue by repository/environment configuration alone
  - Likely files:
    - `.github/workflows/ci.yml`
    - `scripts/run-parity-e2e.mjs`
    - `scripts/create-epic6-parity-fixture.mjs`
  - Done when: local validation stays green and branch is updated

- [ ] QA - Revalidate only if code changes after current GO package
  - Scope: rerun gates if any new commit changes code, tests, workflow logic, or release behavior
  - Required checks:
    - `npm run lint`
    - `npm run typecheck`
    - `npm test`
    - `npm run build`
    - `npm run test:e2e:parity`
  - Done when: QA confirms no new blocking regression

- [ ] Maintainer/Reviewer - Approve PR `#14`
  - Scope: human review of release package and CI result
  - Done when: PR has required approval(s)

- [ ] DevOps - Merge PR `#14` into `master`
  - Scope: merge only after CI is green and review requirements are satisfied
  - Done when: `master` contains commits `a4b3a0b` and `33f4ab8`

- [ ] DevOps - Prepare production deployment prerequisites
  - Scope:
    - verify `vercel whoami`
    - verify `supabase projects list`
    - verify production env vars are available
  - Required backend env:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `JWT_SECRET`
    - `CORS_ALLOWED_ORIGINS`
    - `NODE_ENV=production`
  - Required frontend env:
    - `NEXT_PUBLIC_API_BASE_URL`
  - Done when: all prod credentials/config are confirmed before deploy

- [ ] Data Engineer or DevOps - Apply Supabase migrations in cloud
  - Command reference:
    - `supabase link --project-ref <project_ref>`
    - `supabase db push --linked --include-all --yes`
  - Done when: cloud schema is aligned with `master`

- [ ] DevOps - Deploy backend to production
  - Reference: `docs/guides/cloud-deployment-runbook.md`
  - Target: `packages/backend`
  - Done when: backend deploy completes and `/health` returns `200`

- [ ] DevOps - Deploy frontend to production
  - Reference: `docs/guides/cloud-deployment-runbook.md`
  - Target: `packages/frontend`
  - Done when: frontend deploy completes and points to the correct backend public URL

- [ ] QA + DevOps - Run post-deploy smoke in production
  - Required smoke:
    - `/`
    - `/dashboard/automations`
    - `/cards/:id`
    - `/dashboard/webhooks/local`
    - `GET /health`
  - Additional authenticated validation:
    - signed JWT works against prod backend
    - critical webhook flow responds as expected
  - Done when: smoke passes without `CRITICAL` or `HIGH` defects

- [ ] PM - Confirm final product release closure
  - Scope: final business acknowledgment after successful production smoke
  - Done when: PM confirms the app is released and ready for real use

## Operational Sequence

- DevOps -> fix CI env/path
- Dev -> only if repo changes are needed
- QA -> only if new code/workflow changes were introduced
- Maintainer/Reviewer -> approve PR
- DevOps -> merge PR
- DevOps/Data Engineer -> migrations
- DevOps -> backend deploy
- DevOps -> frontend deploy
- QA + DevOps -> production smoke
- PM -> release closure

## References

- `docs/qa/gates/story-8.5-qa-gate.md`
- `docs/qa/gates/story-8.5-pm-validation.md`
- `.aios/handoffs/handoff-pm-to-devops-epic-8-visual-parity.yaml`
- `docs/guides/cloud-deployment-runbook.md`
- `docs/guides/product-release-runbook.md`
