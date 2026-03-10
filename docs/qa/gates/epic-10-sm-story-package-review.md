# SM Story Package Review - Epic 10

- Epic: `EPIC-10-UX-DESIGN-SYSTEM-EXCELLENCE`
- Reviewer: `@sm (River)`
- Date: `2026-03-09`
- Decision: `NEEDS REVISION BEFORE DEV HANDOFF`

## Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| Goal & Context Clarity | PARTIAL | O objetivo do epic e das fases esta claro, mas faltam dependencias e sequencing notes por story. |
| Technical Implementation Guidance | FAIL | Varias stories apontam para criacao de itens ja existentes ou dependencias nao presentes no workspace. |
| Reference Effectiveness | PARTIAL | Ha contexto suficiente no epic, mas faltam referencias especificas ao codigo real e aos artefatos que ja existem. |
| Self-Containment Assessment | FAIL | O pacote 10.x depende demais de suposicoes sobre bibliotecas, scripts e arquivos sem explicitar o estado atual do repo. |
| Testing Guidance | PARTIAL | A maioria das stories tem cenarios de teste, mas `10.20` usa comandos desalinhados com o repositório e nao inclui `build`. |
| CodeRabbit Integration | N/A | `CodeRabbit` permanece desabilitado em `core-config.yaml`. |

## Package Findings

1. **Estrutura insuficiente para handoff**
   - As stories `10.1` a `10.20` ainda estao em `Draft`.
   - O pacote nao inclui secoes de `Dependencies` e `Dev Notes` no padrao usado nas stories maduras do projeto.
   - As stories do Epic 10 tambem nao trazem placeholders de `QA Results` e `PM/PO Results`, o que dificulta o fluxo de validacao posterior.

2. **Stories que tratam integracao/refino como criacao do zero**
   - `10.1`: `ThemeToggle` e `useTheme` ja existem; a story correta e integrar, validar e cobrir regressao.
   - `10.2`: `MetricCard` ja aceita `ReactNode`; o trabalho real e auditoria e substituicao dos emojis remanescentes.
   - `10.8`, `10.9`, `10.10`: `Breadcrumb`, `Skeleton` e `ConfirmDialog` ja existem no frontend; as stories precisam migrar para extensao, integracao e cobertura de uso.
   - `10.11`: schemas Zod e pasta `packages/frontend/src/schemas/` ja existem; a story deve focar em migrar `TaskForm` e `WebhookForm`, nao em criar a estrutura base.

3. **Dependencias e caminhos que nao refletem o repositório atual**
   - `10.3` assume pipeline novo com `style-dictionary`, mas a base atual ja possui `src/tokens/tokens.yaml` e `src/tokens/index.ts`.
   - `10.4` a `10.7` assumem componentes baseados em Radix, mas os pacotes planejados nao aparecem no workspace atual.
   - `10.14` assume `cmdk` e backend de busca dedicados sem evidencia atual desses artefatos no repositório.
   - `10.16` precisa deixar explicito que parte de `Breadcrumb` ja existe e que o foco e resolucao dinamica a partir da rota.

4. **Gate final incorreto para execucao**
   - `10.20` pede `npm run test:e2e`, mas o repositório expoe `npm run test:e2e:parity`.
   - A Constitution exige `npm run build` no fechamento, e esse criterio nao aparece no gate final do epic.

## Story Grouping

**Ready after targeted refinement**
- `10.1`, `10.2`, `10.11`, `10.13`, `10.15`, `10.17`, `10.18`, `10.19`

**Need scope correction before approval**
- `10.3`, `10.4`, `10.5`, `10.6`, `10.7`, `10.8`, `10.9`, `10.10`, `10.12`, `10.14`, `10.16`, `10.20`

## Required Actions Before Dev Handoff

1. Atualizar cada story para refletir arquivos, componentes e dependencias reais do repositório.
2. Adicionar `Dependencies` e `Dev Notes` nas stories 10.x para reduzir ambiguidade de implementacao.
3. Corrigir `10.20` para usar os quality gates reais do projeto, incluindo `npm run build`.
4. Reexecutar review de QA espec com o pacote revisado.
5. Retornar o epic ao `@pm` para revalidacao formal antes de qualquer handoff para execucao.

## Scrum Master Decision

- `DO NOT HAND OFF TO DEVELOPMENT YET`
