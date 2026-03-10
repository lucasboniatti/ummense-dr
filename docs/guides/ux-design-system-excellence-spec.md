# UX Design System Excellence Specification - Epic 10

- Epic: `EPIC-10-UX-DESIGN-SYSTEM-EXCELLENCE`
- Owner: `@ux-design-expert`
- Date: `2026-03-10`
- Source artifacts:
  - `docs/prd/epic-10-ux-design-system-excellence.md`
  - `docs/stories/10.1.story.md`
  - `docs/stories/10.2.story.md`
  - `docs/stories/10.3.story.md`
  - `docs/stories/10.4.story.md`
  - `docs/stories/10.5.story.md`
  - `docs/stories/10.6.story.md`
  - `docs/stories/10.7.story.md`
  - `docs/stories/10.8.story.md`
  - `docs/stories/10.9.story.md`
  - `docs/stories/10.10.story.md`
  - `docs/stories/10.11.story.md`
  - `docs/stories/10.12.story.md`
  - `docs/stories/10.13.story.md`
  - `docs/stories/10.14.story.md`
  - `docs/stories/10.15.story.md`
  - `docs/stories/10.16.story.md`
  - `docs/stories/10.17.story.md`
  - `docs/stories/10.18.story.md`
  - `docs/stories/10.19.story.md`
  - `docs/stories/10.20.story.md`
  - `docs/qa/gates/epic-10-pm-scope-revalidation.md`
  - `docs/qa/gates/epic-10-story-package-qa-review-second-pass.md`

## Product Intent

Elevar o frontend atual para um padrao mais maduro de design system, navegacao operacional e consistencia visual, sem expandir o dominio funcional do produto, sem recriar assets que ja existem e sem regredir os estados de UX ja estabilizados nos epics anteriores.

O Epic 10 deve ser lido como um epic de consolidacao e aceleracao da experiencia:

- fundacao visual e de tema mais confiavel;
- primitives faltantes entregues com acessibilidade e densidade operacional;
- assets existentes endurecidos como primitives oficiais;
- formularios, feedback, navegacao e polimento movidos para um mesmo sistema;
- `10.20` preservada como gate final de QA/UAT e decisao final de produto.

## Global UX Direction

- Linguagem visual: operacional, compacta, clara e previsivel; menos cara de demo, mais cara de ferramenta de trabalho continuo.
- Reuso-first: sempre reutilizar `ThemeToggle`, `Breadcrumb`, `Skeleton`, `ConfirmDialog`, `EmptyState`, `Toast`, `Spinner`, `PageLoader` e `ErrorBoundary` antes de criar paralelo novo.
- Tema: light e dark devem parecer dois modos do mesmo produto, nao duas interfaces diferentes.
- Tokens: `src/tokens/tokens.yaml` continua sendo a base semantica; `globals.css`, `src/tokens/index.ts` e `packages/frontend/tailwind.config.js` devem funcionar como consumidores alinhados.
- Densidade: controles primarios do shell e formularios devem priorizar leitura rapida, alturas consistentes e menos ruido ornamental.
- Iconografia: `lucide-react` como padrao unico de icones visuais do operador; emojis nao entram como iconografia principal.
- Acessibilidade: foco visivel, navegacao por teclado, labels claras, `aria` correta, `prefers-reduced-motion` respeitado e contraste minimo AA.
- Movimento: animacoes curtas, funcionais e subordinadas ao contexto; feedback sutil e sem exagero.
- Hierarquia: elevacao, radius, superfícies e feedback devem comunicar contexto, prioridade e interacao de forma coerente em todo o app.

## Baseline Atual de UX a Preservar ou Corrigir

- A `AppTopbar` ja possui busca e filtro locais por pagina; a command palette global do Epic 10 nao deve substituir nem confundir esse contrato de filtro contextual.
- `TaskForm.tsx` e `TriggerTypeSelector.tsx` ainda expõem labels e copies parcialmente em ingles; a trilha de formularios e primitives deve convergir a interface do operador para PT-BR consistente.
- A pagina de webhooks ja funciona como boa referencia de hero, tabela operacional, `EmptyState`, `PageLoader`, toast e confirmacao destrutiva; quando possivel, a trilha deve reaproveitar esse padrao em vez de inventar linguagem nova.
- O shell atual ja usa `app-control`, `app-toolbar`, `app-surface` e tokens visuais em `globals.css`; os novos primitives devem nascer integrados a essa familia, nao paralelos a ela.

## Foundation Cluster

### Story 10.1 - Dark Mode no Sidebar

#### Objective

Expor o tema ja existente dentro do shell principal, transformando o dark mode de capacidade tecnica em affordance de produto.

#### Layout Blueprint

- O toggle deve entrar no footer do sidebar, acima do bloco de sessao/log out.
- A linha deve combinar label curta (`Tema`) com controle iconico, sem competir com os dados de usuario.
- Em desktop, o footer precisa continuar visualmente integrado ao sidebar.
- Em mobile, a area do toggle nao pode reduzir a usabilidade do fechamento ou do bloco de sessao.

#### Interaction Rules

- O clique alterna imediatamente o tema visivel.
- O label acessivel muda conforme o estado atual.
- A transicao de tema deve parecer um fade curto entre superfícies, nao um flash bruto de cores.
- O estado inicial deve continuar respeitando `prefers-color-scheme` e `localStorage`.

#### File Mapping

- `packages/frontend/src/components/layout/AppSidebar.tsx`
- `packages/frontend/src/components/ui/ThemeToggle.tsx`
- `packages/frontend/src/hooks/useTheme.ts`
- `packages/frontend/src/styles/globals.css`

### Story 10.2 - Padronizacao de Icones

#### Objective

Remover os remanescentes de emoji como iconografia operacional e consolidar uma malha visual coerente via `lucide-react`.

#### Visual Rules

- Tamanhos base: `16px` para suporte, `18px` a `20px` para controles, `24px` para destaque local.
- Icones de status e de acao devem usar tokens de cor, nunca cor arbitraria hardcoded fora da camada visual atual.
- `MetricCard` e superfícies KPI continuam aceitando `ReactNode`; a story nao deve regredir o contrato.

#### Audit Focus

- `packages/frontend/src/pages/dashboard/integrations/index.tsx`
- `packages/frontend/src/pages/auth/integration-callback.tsx`
- componentes operacionais com banners, hints ou estados de status

### Story 10.3 - Alinhamento de Tokens

#### Objective

Eliminar drift entre a camada semantica de tokens e os consumidores reais do frontend sem reescrever a stack.

#### Token Strategy

- `src/tokens/tokens.yaml` permanece como source of truth semantico.
- `src/tokens/index.ts` deve expor aliases e tipos seguros para consumo controlado.
- `packages/frontend/src/styles/globals.css` concentra variaveis CSS de superficie, texto, borda, foco, shadow, radius e motion.
- `packages/frontend/tailwind.config.js` deve consumir aliases sem duplicar valores crus desnecessariamente.

#### UX Constraints

- Light e dark devem compartilhar a mesma hierarquia semantica:
  - canvas
  - surface
  - surface-muted
  - border-subtle
  - border-strong
  - text-strong
  - text-muted
  - accent
  - focus
  - elevation
- Se houver automacao futura, ela so entra se substituir a duplicacao atual com migracao documentada; nao pode criar uma segunda fonte de verdade operacional.

#### Primary Verification Surfaces

- `/dashboard`
- `/dashboard/automations`
- `/dashboard/webhooks`
- `/cards/[cardId]`
- `/auth/login`

## Primitive Cluster

### Family Rules for 10.4 to 10.10

- Controle default deve seguir densidade operacional do shell atual, com altura util aproximada de `44px` para campos principais.
- Radius de controles deve se apoiar em `--radius-control`; paineis e overlays em `--radius-panel`.
- Focus state deve seguir a familia `app-control`, com ring visivel e consistente entre light e dark.
- Labels, helper text e mensagens de erro devem preservar leitura em PT-BR e hierarquia compacta.
- Primitives novos devem nascer preparados para dark mode, keyboard navigation e reuse em formularios.
- Primitives existentes consolidados nao podem ganhar API paralela ou import path concorrente.

### Story 10.4 - Select

#### Objective

Substituir selects nativos prioritarios por um primitive acessivel, mais consistente com o shell e compativel com `react-hook-form`.

#### UX Blueprint

- `SelectTrigger` deve usar o mesmo ritmo visual de `Input` e filtros da topbar.
- Placeholder precisa ter contraste menor que valor selecionado, sem parecer disabled.
- Chevron fica no trailing edge como affordance fixa.
- Lista longa deve abrir em surface elevada, com scroll suave e item ativo claramente distinguivel.
- O primeiro rollout recomendado permanece em `TaskForm.tsx`; a topbar pode virar candidato posterior se houver ganho sem regressao.
- O campo de prioridade do `TaskForm.tsx` e o alvo primario desta story porque hoje ainda usa `<select>` puro e copy em ingles; a substituicao deve corrigir estilo e linguagem ao mesmo tempo.
- O select de prioridade da topbar continua sendo filtro contextual; ele so deve migrar para o novo primitive depois que o contrato do primitive estiver estavel em formulario real.

### Story 10.5 - Checkbox

#### Objective

Criar checkbox compartilhado com area de clique confortavel e estado visual previsivel para formularios e tabelas.

#### UX Blueprint

- O alvo de clique deve incluir label e checkbox como uma mesma unidade.
- `indeterminate` deve ser claramente distinguivel de `checked`.
- Adoção inicial recomendada: `WebhookForm.tsx` ou outra surface de formulario com ganho direto de consistencia.
- O campo `Webhook Ativo` do `WebhookForm.tsx` e o alvo inicial recomendado porque ja existe, e a melhoria pode ser validada sem introduzir nova regra de negocio.

### Story 10.6 - RadioGroup

#### Objective

Padronizar escolhas exclusivas com navegacao por teclado e leitura clara do estado selecionado.

#### UX Blueprint

- `TriggerTypeSelector.tsx` e o primeiro alvo recomendado.
- O estado ativo deve combinar indicador visual + label mais forte.
- Disabled nao pode parecer erro; apenas indisponibilidade controlada.
- A migracao do `TriggerTypeSelector.tsx` deve aproveitar a story para normalizar copy de `Trigger Type`, `Webhook`, `Scheduled` e help text para o mesmo tom operacional em PT-BR.

### Story 10.7 - Tabs

#### Objective

Adicionar primitive de abas reutilizavel para seccionar conteudo sem criar nova superficie funcional.

#### UX Blueprint

- Variant default: underline operacional, mais densa e discreta.
- Variant secundaria: pills, apenas para contextos em que o agrupamento por bloco fizer mais sentido.
- A primeira surface real deve ser segura e de baixo risco de regressao; `ExecutionDetailModal`, `integrations` ou `cards/[cardId]` continuam como candidatos.
- O rollout inicial recomendado e `dashboard/integrations`, porque a pagina tolera melhor seccionamento progressivo do que o workspace principal de cards.

### Story 10.8 - Breadcrumb Base

#### Objective

Transformar o breadcrumb existente em primitive do shell, com comportamento responsivo e contrato unico.

#### UX Blueprint

- O home icon permanece como ponto inicial do trilho.
- Itens intermediarios clicaveis; pagina atual como texto forte sem link.
- Em mobile, o breadcrumb pode colapsar para o ultimo nivel e um nivel pai imediato quando necessario.
- A integracao inicial deve acontecer no topo do shell, sem competir com o `pageTitle`.

### Story 10.9 - Skeleton

#### Objective

Consolidar o loading compartilhado para reduzir flicker e improviso entre listas, tabelas e cards.

#### UX Blueprint

- `Skeleton` deve parecer parte da superficie final, nao overlay separado.
- `SkeletonCard`, `SkeletonTable` e `SkeletonList` continuam como wrappers preferenciais.
- O ritmo visual deve antecipar o layout real do conteudo para reduzir salto na troca de estado.

### Story 10.10 - ConfirmDialog

#### Objective

Endurecer o `ConfirmDialog` existente como primitive oficial de acao destrutiva e de confirmacao contextual.

#### UX Blueprint

- `danger`, `warning` e `info` devem compartilhar a mesma estrutura, variando apenas iconografia, cor de acento e peso da CTA.
- O icone deve viver em badge circular/soft no topo do dialog.
- CTA primaria destrutiva deve ter peso visual maior que cancelamento, sem eliminar a opcao de volta.
- ESC, outside click configuravel e focus trap devem parecer comportamento natural de overlay do produto.

#### Current Source of Truth

- `packages/frontend/src/components/ui/ConfirmDialog.tsx`

## Pattern Cluster

### Story 10.11 - Formularios com Zod

#### Objective

Unificar comportamento de formularios e validacao em torno de `react-hook-form`, `zodResolver`, `FormField` e mensagens em PT-BR.

#### Form Blueprint

- Ordem padrao: label, control, helper opcional, erro.
- Erro deve aparecer proximo ao control e nunca apenas em toast.
- `onBlur` e `onChange` devem ser usados conforme custo cognitivo:
  - campos simples: validacao em `onBlur`
  - campos com feedback util imediato: validacao progressiva controlada
- `TaskForm.tsx` e `WebhookForm.tsx` devem preservar submit/cancel e ganhar os primitives novos quando estiverem disponiveis.
- O refino dos formularios deve fechar tambem a divida de linguagem visivel ao operador: labels, placeholders, helper texts e botoes precisam convergir para PT-BR consistente.

### Story 10.12 - Feedback Consistente

#### Objective

Consolidar um mesmo contrato visual para loading, empty, error e success nas superfícies operacionais principais.

#### Pattern Map

- Loading: `Skeleton` para estrutura, `Spinner` apenas para espera curta ou secundaria.
- Error: `ErrorBoundary` para falhas amplas; banner inline para falha local recuperavel; toast apenas como reforco, nao como unico canal.
- Empty: `EmptyState` com titulo claro, descricao curta e CTA direta.
- Success: toast curto + transicao sutil na superficie afetada.
- Quando houver erro local em formulario, o primeiro canal deve ser inline junto ao form; toast entra como reforco e nao substitui a leitura principal do problema.

#### Priority Surfaces

- `/dashboard`
- `/dashboard/automations`
- `/dashboard/webhooks`

### Story 10.13 - Confirmacao de Acoes Destrutivas

#### Objective

Expandir o primitive consolidado da `10.10` para todos os fluxos destrutivos relevantes.

#### UX Rules

- A mensagem deve deixar claro o impacto e, quando relevante, a irreversibilidade.
- O usuario precisa ter sempre um caminho explicito de cancelamento sem efeito colateral.
- A CTA destrutiva deve carregar o verbo da acao: `Excluir`, `Cancelar execucao`, `Remover itens`.

#### Priority Surfaces

- `TaskModal.tsx`
- `DLQTable.tsx`
- `pages/dashboard/webhooks/index.tsx`
- `pages/dashboard/automations/[executionId].tsx`
- `PauseResumeControls.tsx`

## Navigation Cluster

### Story 10.14 - Busca Global

#### Objective

Adicionar command palette frontend-first para acelerar descoberta e navegacao sem puxar backend novo por default.

#### Layout Blueprint

- Entrada primaria no `AppTopbar`.
- Trigger visual deve combinar icone de busca, label curta e hint do atalho (`Cmd/Ctrl+K`) quando houver espaco.
- O dialog deve abrir centralizado, com largura suficiente para leitura confortavel e lista agrupada logo abaixo do input.
- Ordem de grupos inicial:
  - Tarefas
  - Fluxos
  - Webhooks
- `recentes` pode aparecer acima dos grupos quando houver historico.

#### Convivencia com os Filtros Atuais da Topbar

- O produto ja tem busca/filtro local por pagina dentro da topbar; a busca global precisa se apresentar como camada paralela de navegacao, nao como segundo campo redundante no mesmo cluster.
- No desktop, o trigger de busca global deve viver junto ao cluster de contexto/acoes, e nao substituir o input de filtro local existente.
- No mobile, a busca global deve abrir via atalho ou trigger compacto, sem empilhar outro campo permanente acima do filtro local.

#### Interaction Rules

- Auto-focus no campo ao abrir.
- `ArrowUp/ArrowDown`, `Enter` e `Escape` como contrato obrigatorio.
- Busca inicial somente em dados disponiveis no frontend ou facilmente indexaveis no cliente.
- Nenhum endpoint backend novo entra nesta fase sem blocker real e follow-up formal.
- A abertura do dialog nao pode apagar nem mutar silenciosamente o estado dos filtros locais da pagina atual.

### Story 10.15 - Atalhos de Teclado

#### Objective

Transformar busca, criacao e ajuda em uma camada de aceleracao previsivel para usuario frequente.

#### Shortcut Rules

- `Cmd/Ctrl+K` abre a busca global.
- `Cmd/Ctrl+N` abre o fluxo de nova tarefa.
- `Cmd/Ctrl+/` alterna sidebar.
- `Escape` fecha overlays e menus abertos.
- `?` abre help de atalhos.

#### Guardrails

- Ignorar atalhos globais quando o foco estiver em `input`, `textarea` ou conteudo editavel.
- Ignorar atalhos globais tambem quando a command palette estiver aberta e estiver capturando navegacao de setas/enter.
- O modal de ajuda deve listar apenas atalhos realmente entregues.
- A ajuda de atalhos deve usar o mesmo sistema de dialogo visual do produto.

### Story 10.16 - Breadcrumbs Dinamicos

#### Objective

Completar o primitive da `10.8` com resolucao dinamica e integracao real no shell.

#### Breadcrumb Map

- `/dashboard` -> `Dashboard`
- `/dashboard/automations` -> `Dashboard > Fluxos`
- `/dashboard/automations/[id]` -> `Dashboard > Fluxos > [nome]`
- `/dashboard/webhooks/[id]` -> `Dashboard > Webhooks > [nome]`
- `/cards/[id]` -> `Dashboard > Cards > [nome]`
- `/auth/login` -> `Login`

#### UX Rules

- O nome dinamico deve vir de dados ja carregados na pagina ou servicos existentes.
- O breadcrumb vive no topo do shell; nao deve virar segunda linha barulhenta se a pagina ja tiver heading longo.
- Em mobile, preservar pelo menos o contexto atual e um nivel pai quando fizer diferenca real para navegacao.
- Nao criar spinner dedicado so para resolver breadcrumb; se o nome dinamico ainda nao estiver disponivel, usar label neutra temporaria e atualizar sem deslocamento visual brusco.

## Polish Cluster

### Story 10.17 - Sistema de Animacoes

#### Objective

Definir a fundacao leve de movimento do produto usando a stack CSS/Tailwind atual.

#### Motion Rules

- Durações base:
  - fast: `150ms`
  - normal: `250ms`
  - slow: `400ms`
- Easing default deve priorizar `ease-out`; `bounce` so para micro-casos controlados.
- Prioridades de rollout:
  - dialogs
  - toasts
  - transicao de tema
  - entrada sutil de blocos novos
- A transicao de tema deve animar sobretudo cor, background, border e shadow; nao deve introduzir tween de layout, tamanho ou reposicionamento.

### Story 10.18 - Micro-interacoes

#### Objective

Aplicar o sistema de movimento nas superfícies mais frequentes sem transformar a UI em showcase de animacao.

#### Interaction Rules

- Cards: hover lift curto e discreto.
- Buttons: feedback de `active` com compressao minima.
- Inputs: focus ring animado com sutileza e sem pulsar demais.
- Links: underline animado ou hover de contraste controlado.
- Toasts e modals: entrada lateral/scale curta, coerente com `10.17`.
- Tabelas operacionais e listas densas nao devem receber micro-interacoes por linha que aumentem ruido ou prejudiquem escaneabilidade.

### Story 10.19 - Elevacao

#### Objective

Transformar a base atual de shadows em semantica previsivel de profundidade.

#### Elevation Semantics

- `elevation-1`: cards, panels
- `elevation-2`: dropdowns, popovers
- `elevation-3`: dialogs, modals
- `elevation-4`: toast e notificacoes

#### UX Constraints

- A elevacao deve reforcar hierarquia, nao criar ruido.
- Em dark mode, o contraste entre superficie e sombra deve continuar legivel sem halo excessivo.
- A aplicacao inicial deve priorizar `CardUI`, dropdowns/popovers da topbar, dialogs e toast, antes de espalhar shadow semantica por paginas inteiras.

## Ordem de Entrega para Dev

1. Implementar `10.1`, `10.2` e `10.3` primeiro para estabilizar shell, iconografia e governanca visual.
2. Implementar `10.4`, `10.5`, `10.6` e `10.7` em cima da fundacao de tokens da `10.3`.
3. Consolidar `10.8`, `10.9` e `10.10` antes das historias que dependem desses assets compartilhados.
4. Implementar `10.11`, `10.12` e `10.13` reaproveitando os primitives e contratos ja estabilizados.
5. Implementar `10.14`, depois `10.15`, e em seguida `10.16`.
6. Implementar `10.17`, `10.18` e `10.19` apenas depois da fundacao visual e de navegacao ja estar firme.
7. Manter `10.20` intocada como gate final de QA/UAT e decisao final de produto.

## Non-Negotiables

- Nao reimplementar `ThemeToggle`, `Breadcrumb`, `Skeleton` ou `ConfirmDialog` como assets paralelos.
- Nao abrir backend novo para a busca global sem blocker real e follow-up formal.
- Nao remover estados explicitos de loading, empty, error, hint ou confirmacao enquanto aplica a nova linguagem.
- Nao quebrar navegacao por teclado, focus visivel, dark mode ou `prefers-reduced-motion`.
- Toda implementacao deve produzir evidencias before/after nas superfícies afetadas, com desktop e mobile quando a story mexer em shell, navegacao ou overlays.
