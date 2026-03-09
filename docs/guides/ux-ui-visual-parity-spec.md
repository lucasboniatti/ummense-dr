# UX/UI Visual Parity Specification - Epic 8

- Epic: `EPIC-8-UX-UI-VISUAL-PARITY`
- Owner: `@ux-design-expert`
- Date: `2026-03-09`
- Source artifacts:
  - `docs/ux-ui-visual-parity-follow-up-plan.md`
  - `docs/epics/EPIC-8-UX-UI-VISUAL-PARITY.md`
  - `docs/stories/8.1.story.md`
  - `docs/stories/8.2.story.md`
  - `docs/stories/8.3.story.md`
  - `docs/stories/8.4.story.md`
  - `docs/stories/8.5.story.md`

## Product Intent

Fechar o gap entre a base funcional ja entregue e a sensacao de produto operacional denso observada nos screenshots de referencia, sem mudar o dominio, sem criar novas superfícies e sem regredir os estados de loading, empty, error e hint ja consolidados em Epic 7.

## Global Visual Direction

- Linguagem visual: operacional, compacta, clara, com menos bloco generico e mais sinal por area util.
- Base de tema: manter a paleta atual do `tailwind.config.js` (`primary`, `neutral`, `success`, `warning`, `error`) e a familia `Avenir Next`.
- Fundacao em `globals.css`:
  - introduzir variaveis de superficie, borda, texto, sombra e raio;
  - evitar hex hardcoded fora da camada de token;
  - preservar `neutral` como base do canvas e `primary` como acento principal.
- Hierarquia:
  - canvas: `neutral-50` / superfícies brancas ou levemente tonalizadas;
  - blocos principais com raio entre `20px` e `24px`;
  - controles com raio entre `10px` e `14px`;
  - texto de secao com maior contraste e labels auxiliares em corpo pequeno, sem poluir o foco principal.
- Densidade:
  - reduzir altura visual de cards e linhas;
  - agrupar acoes em clusters;
  - priorizar conteudo escaneavel em uma passada de olho.
- Acessibilidade:
  - foco sempre visivel com ring baseado em `primary`;
  - contraste minimo WCAG AA;
  - navegacao por teclado preservada em sidebar, topbar, board e composer.
- Superficies tecnicas:
  - token JWT, JSON cru e controles de debug nao devem competir com a jornada principal;
  - quando precisarem existir, ficam em painel secundario rotulado como `Modo técnico`, fechado por padrao.

## Story 8.1 - Design Foundation + Shell Refresh

### Objective

Criar a linguagem visual reutilizavel do app e aplicá-la ao shell compartilhado sem alterar a navegacao global.

### Layout Blueprint

- Sidebar:
  - manter largura estrutural atual (`w-64`) para evitar regressao de navegação;
  - aumentar contraste do header e reduzir ruído textual;
  - item ativo precisa combinar pelo menos dois cues visuais: fundo tonalizado + barra/acento lateral ou iconografia mais forte;
  - footer do usuario deve parecer parte da navegacao, nao um bloco separado aleatorio.
- Topbar:
  - organizar em 3 clusters: contexto da pagina, filtros, acoes/notificacoes;
  - no desktop: busca primeiro, prioridade depois, acoes ao final;
  - no mobile: menu + titulo na primeira linha, filtros e acoes em wrap controlado abaixo.
- Main content wrapper:
  - aumentar sensacao de superfície do app usando canvas + painel;
  - manter espacamento lateral responsivo atual, mas com ritmo visual mais consistente entre topbar e conteudo.

### Component Directives

- `AppShell.tsx`:
  - trocar `bg-[#f5f7fb]` por token de canvas;
  - usar variaveis/shared classes para shell surface, page insets e spacing.
- `AppSidebar.tsx`:
  - header mais compacto;
  - links com altura visual mais densa;
  - estado hover mais suave que o ativo;
  - avatar/footer com tipografia menor e melhor truncamento.
- `AppTopbar.tsx`:
  - transformar o conjunto de filtros em barra unica visualmente coesa;
  - dropdown de `Adicionar` com cara de menu contextual, nao caixa generica;
  - botao `Filtrar` como CTA principal, `Limpar` como secundaria discreta.
- Shared UI:
  - se `Button`, `Input`, `Badge` ou `CardUI` forem alterados, respeitar o mesmo token/radius/focus em todas as rotas citadas pela story.

### Responsive Rules

- `375px`: sidebar como drawer overlay, topbar empilhada em duas linhas no maximo.
- `768px`: sidebar overlay, mas filtros podem ficar em linha unica se houver largura suficiente.
- `>=1280px`: clusters estabilizados em uma linha, sem overflow ou quebra visual.

### Evidence Deliverables

- before/after de sidebar + topbar no desktop;
- before/after do shell em mobile;
- se houver mudanca em shared UI, capturas de `/`, `/dashboard/automations`, `/cards/[cardId]` e `/auth/login`.

### File Mapping

- `packages/frontend/src/components/layout/AppShell.tsx`
- `packages/frontend/src/components/layout/AppSidebar.tsx`
- `packages/frontend/src/components/layout/AppTopbar.tsx`
- `packages/frontend/src/styles/globals.css`
- `packages/frontend/src/components/ui/*`

## Story 8.2 - Operational Home Refresh

### Objective

Fazer a home parecer painel operacional real: mais densa, mais clara, menos “cards soltos”.

### Layout Blueprint

- Hero/resumo:
  - manter os indicadores existentes, mas reduzir altura e peso visual;
  - os quatro indicadores devem se comportar como strip operacional, nao como destaque de marketing.
- Grade principal:
  - desktop: `TasksPanel` dominante na esquerda e `CalendarPanel` como coluna lateral fixa;
  - mobile/tablet: calendario desce para baixo da lista sem perder filtros temporais.
- Tasks list:
  - cada item vira linha operacional compacta com 5 camadas:
    - acento lateral de prioridade;
    - titulo e card vinculado;
    - chips/tags;
    - responsavel + prazo;
    - progresso resumido.
  - progresso deve ficar mais discreto e horizontal, nao roubar o foco do titulo.
- Calendar panel:
  - o mes atual precisa ser a ancora visual;
  - dias com eventos precisam comunicar volume sem exagero;
  - quick filters `Proximos 7 dias` e `Sem data` devem parecer filtros do produto, nao botoes de utilidade.

### Component Directives

- `index.tsx`:
  - summary cards com menos padding e contraste mais controlado;
  - manter `sourceHint` e banners de erro em posicao clara acima do conteudo afetado.
- `TasksPanel.tsx`:
  - reduzir altura total dos itens;
  - priorizar leitura do titulo + card;
  - substituir “Status: x” literal por indicacao visual mais compacta quando possivel, sem perder dado;
  - manter link para `/cards/[cardId]?taskId=...`.
- `CalendarPanel.tsx`:
  - reforcar leitura do mes, navegacao lateral e lista de proximos eventos;
  - bloco de eventos futuros deve parecer agenda operacional conectada ao calendario.

### State Rules

- `loading`, `empty`, `error` e `sourceHint` continuam explicitos nos dois paineis.
- `eventsMutating` e acoes do editor nao podem gerar ambiguidade visual.
- Filtros globais da topbar continuam refletindo na lista e no calendario sintético.

### Evidence Deliverables

- before/after da home completa em desktop e mobile;
- before/after de uma linha de tarefa;
- before/after do bloco de calendario e agenda.

### File Mapping

- `packages/frontend/src/pages/index.tsx`
- `packages/frontend/src/components/panel/TasksPanel.tsx`
- `packages/frontend/src/components/panel/CalendarPanel.tsx`
- `packages/frontend/src/components/events/EventEditor.tsx`

## Story 8.3 - Flows Board Visual Parity

### Objective

Refinar o board para transmitir maturidade visual sem mexer no comportamento de board, table, indicators e DnD.

### Layout Blueprint

- Header do workspace:
  - manter seletor de fluxo e view mode, mas reduzir a sensação de “formulário administrativo”;
  - filtros de texto/status e recarregar devem formar uma toolbar operacional única.
- Board:
  - colunas entre `300px` e `320px`, com header mais informativo;
  - contador precisa destacar volume filtrado x total sem ocupar mais espaço que o titulo;
  - cards com respiro menor, leitura rápida e mais contraste entre metadados.
- Card anatomy:
  - linha 1: titulo + affordance/estado;
  - linha 2: responsável/time;
  - linha 3: progresso fino;
  - linha 4: tags e metadata compacta.
- Technical mode:
  - token JWT e fallback info podem permanecer, mas devem ficar abaixo da barra principal ou em seção claramente secundária.

### Component Directives

- `FlowsWorkspace.tsx`:
  - reduzir o peso visual dos três painéis iniciais antes do board;
  - manter hints e errors explicitos;
  - preservar seleção de modo e filtros atuais.
- `KanbanBoard.tsx`:
  - container mais parecido com workspace, menos “caixa branca genérica”;
  - vazio por coluna continua claro e legível.
- `Column.tsx`:
  - header mais denso;
  - fundo da coluna pode receber tonalidade sutil para separar grupos sem parecer bloco pesado.
- `Card.tsx`:
  - status chip mais compacto;
  - progresso fino;
  - responsável e tags com leitura mais rápida;
  - estado pending perceptível sem parecer erro.

### State Rules

- `loadingFlows`, `loadingDetails`, `error`, `lastMoveError`, empty column e empty result continuam explicitos.
- `table` e `indicators` nao podem perder consistencia visual ao receber os novos tokens.
- Drag-and-drop continua sendo o comportamento primário do board.

### Evidence Deliverables

- before/after do board completo;
- before/after de uma coluna;
- before/after de um card;
- captura mobile mostrando degradacao aceitavel.

### File Mapping

- `packages/frontend/src/features/flows/FlowsWorkspace.tsx`
- `packages/frontend/src/components/KanbanBoard.tsx`
- `packages/frontend/src/components/Card.tsx`
- `packages/frontend/src/components/Column.tsx`

## Story 8.4 - Card Workspace Productization

### Objective

Transformar o card workspace de uma tela técnica funcional em uma superfície colaborativa de produto, preservando a capacidade operacional real.

### Layout Blueprint

- Header:
  - titulo do card em destaque;
  - status, contexto e equipe em chips/stack visual;
  - CTA principal de salvar, com suporte secundario discreto.
- Main column:
  - ordem de leitura: titulo, descricao, status, tags, contatos/equipe, tarefas/progresso;
  - contatos aparecem como pills/lista interpretada, nao JSON;
  - progresso do card e tarefas precisam parecer parte do mesmo contexto.
- Right column:
  - timeline como trilha cronologica legivel;
  - composer de nota visivel no topo;
  - feed com timestamp e acao claramente hierarquizados.
- Secondary technical surface:
  - conter `JWT`, `contactsJson`, `customFieldsJson` e qualquer override tecnico;
  - rotulo explicito `Modo técnico`;
  - fechado por padrao;
  - nao aparecer como primeiro elemento da pagina.

### Component Directives

- `pages/cards/[cardId].tsx`:
  - remover o painel de token do topo da jornada principal;
  - mover controles tecnicos para drawer/accordion/section secundaria;
  - manter editaveis no fluxo principal: `title`, `description`, `status`, `tags`, composer de nota e acoes de tarefa.
- `TaskModal.tsx`:
  - alinhar visualmente ao novo workspace para nao parecer overlay de outro produto.
- `CommentSection.tsx` e `TagManager.tsx`:
  - se usados/reativados, alinhar ao mesmo sistema de chips, spacing e surface.
- Dados:
  - contatos e campos customizados podem continuar existindo na API;
  - a UX principal deve exibir a versao interpretada/legivel desses dados.

### State Rules

- `loading`, `error` e `hint` continuam explícitos.
- Ausencia de tarefas ou timeline vazia precisa parecer estado normal do produto, nao falha.
- Salvar card e criar nota precisam ter feedback claro de andamento.

### Evidence Deliverables

- before/after da tela completa;
- before/after do header;
- before/after do bloco principal de detalhes;
- before/after de timeline/composer;
- before/after da superfície técnica secundária, se ela existir.

### File Mapping

- `packages/frontend/src/pages/cards/[cardId].tsx`
- `packages/frontend/src/components/TaskModal.tsx`
- `packages/frontend/src/components/CommentSection.tsx`
- `packages/frontend/src/components/TagManager.tsx`

## Delivery Order For Dev

1. Implementar `8.1` primeiro e estabilizar tokens/shell.
2. Implementar `8.2` e `8.3` na sequencia, podendo paralelizar apenas apos a fundacao estar firme.
3. Implementar `8.4` por ultimo entre as telas, reaproveitando o sistema ja consolidado.
4. Manter `8.5` como gate final, conforme `docs/stories/8.5.story.md`; não antecipar `GO/NOGO`.

## Non-Negotiables

- Nao alterar o escopo funcional do produto.
- Nao remover estados de UX hardening entregues no Epic 7.
- Nao deixar controles tecnicos competirem com a jornada principal do operador.
- Toda story implementada precisa produzir evidencias before/after desktop e mobile.
