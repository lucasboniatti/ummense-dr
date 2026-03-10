# QA Gate - Stories 10.4 to 10.19

- Stories: `10.4` a `10.19`
- Reviewer: `@qa (Quinn)`
- Date: `2026-03-10`
- Decision: `CONCERNS`

## O que foi validado

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` ✅
- `npm run build` ✅
- `npm run test:e2e:parity` ✅
  - Resultado no ambiente atual: `5 passed`, `15 skipped`
  - Contexto: o runner entrou em `smoke-only parity` porque as fixtures cloud/local nao estavam disponiveis
- Revisao de codigo dos blocos de shell, atalhos, busca global, breadcrumbs, primitives, formularios e feedback ✅

## Findings

1. `P1 FUNCTIONAL CONCERN` - `useKeyboardShortcuts` registra o mesmo handler em `window` e `document`, o que faz um `keydown` real disparar a mesma acao duas vezes durante a propagacao. Na pratica, isso pode neutralizar atalhos de toggle como `Cmd/Ctrl+/` e gerar navegacao duplicada em atalhos como `Cmd/Ctrl+N`.

## Strengths

- O bloco de primitives (`Select`, `Checkbox`, `RadioGroup`, `Tabs`) esta integrado ao frontend e com cobertura smoke suficiente para o recorte do Epic 10.
- A command palette, os breadcrumbs dinamicos e o shell com dark mode ficaram operacionais no ambiente smoke.
- O build completo voltou a fechar quando validado isoladamente, sem concorrencia com outros processos do frontend.

## Riscos residuais

- A parity completa continua parcial neste ambiente, porque 15 cenarios autenticados dependem de fixtures indisponiveis.
- O problema de atalhos globais afeta a confiabilidade da navegacao por teclado e impede `PASS` para a story `10.15`.

## Recomendacao

- `HOLD` para `PASS` do bloco implementado ate corrigir o registro duplicado de listeners em `useKeyboardShortcuts`.
- `GO` tecnico para seguir imediatamente com o fix em `@dev` e retornar para re-review rapido de QA.
