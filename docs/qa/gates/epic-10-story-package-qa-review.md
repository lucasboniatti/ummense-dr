# Epic 10 Story Package - QA Spec Review Gate

**Artifact Reviewed:** [docs/prd/epic-10-ux-design-system-excellence.md](../../prd/epic-10-ux-design-system-excellence.md) and story package `docs/stories/10*.story.md`
**Reviewer:** @qa (Quinn)
**Date:** 2026-03-10
**Decision:** FAIL

---

## Scope

QA specification review of the Epic 10 story package before any handoff to product approval or development execution.

---

## Validation Summary

The package is not approved for PM review or developer handoff in its current form.

The core product problem is valid and the phase breakdown is directionally sound, but the draft set still contains blocking quality gaps:

- multiple stories describe creating assets that already exist in the codebase
- some stories assume libraries or pipelines that are not confirmed in the current workspace
- the final gate story does not align with the real project quality commands
- the package is materially thinner than the story structure already used in approved stories from previous epics

---

## Strengths

- The epic goal is coherent and bounded to UX/system-quality work instead of broad product expansion.
- The phase ordering is sensible at a high level: foundation, components, consistency, navigation, polish, final gate.
- Most stories already include acceptance criteria, testing notes, and file lists, which gives the package a workable base for refinement.

---

## Blocking Findings

1. Story `10.10` treats `ConfirmDialog` as a net-new component even though the component and imperative hook already exist in the frontend.
   - Story evidence: `docs/stories/10.10.story.md`
   - Existing implementation: `packages/frontend/src/components/ui/ConfirmDialog.tsx`
   - QA impact: this invites duplicate implementation or conflicting APIs instead of targeted integration and rollout.

2. Story `10.3` proposes a new token-generation pipeline without proving migration strategy, dependency availability, or compatibility with the current token stack.
   - Story evidence: `docs/stories/10.3.story.md`
   - Existing token base: `src/tokens/tokens.yaml`, `src/tokens/index.ts`
   - QA impact: the package currently mixes valid modernization intent with unverified implementation assumptions, which makes effort and regression risk hard to estimate.

3. Story `10.14` assumes global-search dependencies and possibly a backend search endpoint without a bounded fallback path.
   - Story evidence: `docs/stories/10.14.story.md`
   - QA impact: search can expand from UI enhancement into new backend/API scope unless the story explicitly defines what is mandatory and what is optional.

4. Story `10.20` does not match the real release-quality gate contract of the repository.
   - Story evidence: `docs/stories/10.20.story.md`
   - Real commands: `package.json`
   - QA impact: the closing gate can falsely pass or remain ambiguous because it requests `npm run test:e2e` while the repo exposes `npm run test:e2e:parity`, and it omits `npm run build`, which is required by the project constitution.

5. The package as a whole is missing the richer story scaffolding already used in approved story sets.
   - Missing or inconsistent across 10.x: explicit `Dependencies`, `Dev Notes`, and future-stage `QA Results` / `PM Results` sections.
   - QA impact: this reduces traceability, makes implementation handoff less self-contained, and increases the chance of avoidable clarification loops.

---

## Non-Blocking Notes

- Story `10.1` is close to implementation-ready because it already acknowledges that `ThemeToggle` and `useTheme` exist; it mainly needs dependency notes and alignment with the shell regression surface.
- Storys in the forms/destructive-actions/polish cluster can likely be approved after narrower rewrites that reflect the current component inventory.
- The existing local quality gates are green at repository level (`lint`, `typecheck`, `test`, `build`), which reduces baseline delivery risk but does not offset specification gaps in the Epic 10 package.

---

## Gate Conditions for SM

SM may return this package for QA re-review only after:

- each story reflects the real current codebase and marks existing assets as integration/extension work instead of net-new creation
- dependencies and sequencing are explicit per story where implementation order matters
- the package uses the real command set of the repository, especially in `10.20`
- final-gate criteria include `npm run build`
- stories that may expand backend scope explicitly define a frontend-only fallback or a hard scope boundary
- the package is brought closer to the structure and self-containment level used by approved Epic 8 stories

---

## Handoff Recommendation

Not approved for PM review yet.

Return the package to `@sm` for revision, then re-submit to QA for spec re-review before any PM revalidation or dev handoff.
