# PM Scope Validation - Epic 10

- Epic: `EPIC-10-UX-DESIGN-SYSTEM-EXCELLENCE`
- Reviewer: `@pm (Morgan)`
- Date: `2026-03-09`
- Decision: `REQUIRES REVISION BEFORE EXECUTION`

## Review Status

- Este artefato registra a decisao da primeira passada de PM, antes da revisao integral do pacote de stories por `@sm` e antes do `PASS` da segunda passada de `@qa`.
- O pacote foi posteriormente refinado nas stories `10.1` a `10.20`, alinhado ao codigo real e aprovado por QA em `2026-03-10`.
- Portanto, este documento deve ser lido como baseline historica da rejeicao inicial, nao como decisao final vigente do epic.

## Revalidation Inputs

- PRD revisado: `docs/prd/epic-10-ux-design-system-excellence.md`
- Gate de QA da primeira passada: `docs/qa/gates/epic-10-story-package-qa-review.md`
- Gate de QA da segunda passada: `docs/qa/gates/epic-10-story-package-qa-review-second-pass.md`
- Handoff atual para PM: `.aios/handoffs/handoff-qa-to-pm-epic-10-story-package-approved-20260310.yaml`

## Validation Summary

- Objetivo de produto validado: elevar a maturidade UX do frontend atual sem expandir o dominio funcional do produto.
- Escopo ainda nao esta pronto para execucao porque parte do backlog trata como criacao itens que ja existem no codigo atual, incluindo `ThemeToggle`, `Breadcrumb`, `Skeleton` e `ConfirmDialog`.
- Dependencias prometidas pelo epic nao estao refletidas no workspace atual: nao ha evidencia de `cmdk`, `style-dictionary` nem dos pacotes Radix planejados para Select, Checkbox, Radio, Tabs e Dialog.
- O gate final da story `10.20` nao esta alinhado com os comandos reais do repositório: a story pede `npm run test:e2e`, enquanto o workspace expoe `test:e2e:parity`; alem disso, a Constitution exige `npm run build` no fechamento.
- As stories `10.1` a `10.20` permanecem em `Draft` e nao trazem secoes formais de resultados de QA/PM, o que indica pacote ainda em fase de refinamento, nao liberado para execucao.

## Story Prioritization

- `10.1` - `P0`: integrar o dark mode ja existente ao sidebar e validar paridade visual nos dois temas.
- `10.2` - `P1`: remover os icones com emoji ainda presentes e fechar a inconsistencia visual remanescente.
- `10.3` - `P0`: validar fonte unica de tokens e pipeline antes de expandir componentes.
- `10.4` a `10.10` - manter prioridade funcional, mas revisar cada story para diferenciar criacao nova de integracao, endurecimento e cobertura de uso real.
- `10.11` a `10.16` - manter como bloco de consistencia operacional e navegacao, desde que o backlog seja reescrito com dependencias reais.
- `10.20` - `P0`: permanece como gate final, mas precisa refletir os scripts e criterios de saida reais do repositorio.

## Product Notes

- Este parecer nao invalida o problema de produto; invalida apenas a prontidao do pacote atual para handoff direto de execucao.
- O proximo owner da trilha deve ser `@sm` para revisar as stories do epic com base no estado real do codigo e dos scripts de qualidade.
- `@dev` nao deve iniciar a execucao do Epic 10 ate que o backlog seja refinado, as dependencias confirmadas e o gate final corrigido.
- O escopo deve permanecer bounded ao frontend atual; qualquer endpoint novo para busca global deve ser tratado como opcional ate que um blocker real seja demonstrado.

## Product Decision

- `REVISE STORY PACKAGE BEFORE EXECUTION`

## Editorial Note

- A proxima decisao formal de `@pm` deve ser registrada em novo parecer de revalidacao, usando os artefatos revisados acima como fonte principal.
