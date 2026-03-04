# Local Quality Gate Runbook

## Objetivo

Executar gates obrigatórios de qualidade antes do UAT local e da decisão de release candidate.

## Gates Obrigatórios

Ordem e política:
1. `lint`
2. `typecheck`
3. `test`

Fail-fast:
- Qualquer estágio com erro interrompe o pipeline imediatamente.

## Execução (green path)

```bash
npm run quality:gates
```

Saída esperada:
- `Stage LINT PASSED`
- `Stage TYPECHECK PASSED`
- `Stage TEST PASSED`
- `PASS: all mandatory gates completed`

## Execução (red path forçado)

```bash
npm run quality:gates:red
```

Saída esperada:
- falha explícita no estágio `TEST`;
- mensagem de pipeline interrompido.

## Execução Manual por Gate

```bash
npm run lint
npm run typecheck
npm test
```

## Pré-checagem de Ambiente

Antes dos gates:

```bash
npm run env:check
```
