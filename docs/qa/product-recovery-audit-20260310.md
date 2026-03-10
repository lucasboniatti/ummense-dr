# Auditoria de Recuperacao do Produto

Data: `2026-03-10`
Escopo: frontend publicado em producao, fluxos publicos e autenticados, desktop e mobile
Conta usada na validacao: `lucas@digitalrockets.agency`

## Resumo Executivo

O produto ainda **nao esta pronto para uso comercial nem para venda**.

O estado atual e de `produto acessivel, mas inconsistente e parcialmente quebrado`. A aplicacao sobe, autentica e abre as principais rotas, mas a experiencia real ainda falha em quatro frentes criticas:

- shell mobile quebrado
- dashboard principal em fallback por erro de autenticacao no consumo de analytics
- modulo de fluxos expondo fallback local e UI tecnica em producao
- base visual/tokenizada ainda sem uma fonte de verdade efetivamente aplicada

As evidencias visuais desta auditoria estao em:

- `/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit/`
- `/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/`

## Metodo

- Revisao de codigo das superficies principais
- Smoke em producao nas rotas publicas e autenticadas
- Captura de screenshots desktop e mobile
- Validacao com conta real em producao

## Findings

### P1. Sidebar mobile permanece visivel e ocupa a interface inteira

O shell reutiliza o estado de visibilidade do sidebar de desktop no mobile. Em `AppSidebar`, o `translate-x-0` e aplicado quando `isMobileOpen || isDesktopVisible`, e `isDesktopVisible` nasce `true` em `AppShell`. Na pratica, o menu fica permanentemente exposto no mobile, cobrindo boa parte da tela e tornando a navegacao ruim ou confusa.

Evidencia de codigo:

- [AppSidebar.tsx#L84](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppSidebar.tsx#L84)
- [AppShell.tsx#L28](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppShell.tsx#L28)
- [AppShell.tsx#L188](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppShell.tsx#L188)

Evidencia visual:

- [mobile-dashboard.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/mobile-dashboard.png)
- [mobile-integrations.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/mobile-integrations.png)
- [mobile-webhooks.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/mobile-webhooks.png)

Impacto:

- quebra de navegacao mobile
- produto parece inacabado
- inviabiliza demo seria em celular

### P1. Dashboard principal opera em fallback porque o frontend nao autentica as chamadas de analytics

O dashboard chama `/api/analytics/metrics` e `/api/analytics/cost-summary` sem anexar token. No backend, essas rotas estao protegidas por `authMiddleware`. Em producao, isso resulta em `401`, e a tela principal cai no banner de erro com dados zerados ou ultimos valores conhecidos.

Evidencia de codigo:

- [DashboardContainer.tsx#L53](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/DashboardContainer.tsx#L53)
- [analytics.routes.ts#L15](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/backend/src/routes/analytics.routes.ts#L15)
- [analytics.routes.ts#L75](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/backend/src/routes/analytics.routes.ts#L75)

Evidencia visual:

- [desktop-dashboard.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/desktop-dashboard.png)
- [mobile-dashboard.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/mobile-dashboard.png)

Impacto:

- a homepage autenticada ja entra errada
- KPI principal perde credibilidade
- impressao imediata de produto quebrado

### P1. Modulo de fluxos exposto com fallback local e token tecnico em producao

O workspace de fluxos sobe com um fluxo fake chamado `Gestao 2.0 (Local)`, mensagens de `fallback local` e uma area de `Modo tecnico` para colar JWT. Isso e aceitavel para smoke interno, mas nao para um produto comercial em producao.

Evidencia de codigo:

- [FlowsWorkspace.tsx#L53](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/features/flows/FlowsWorkspace.tsx#L53)
- [FlowsWorkspace.tsx#L337](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/features/flows/FlowsWorkspace.tsx#L337)
- [FlowsWorkspace.tsx#L379](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/features/flows/FlowsWorkspace.tsx#L379)
- [FlowsWorkspace.tsx#L587](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/features/flows/FlowsWorkspace.tsx#L587)

Evidencia visual:

- [desktop-automations.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/desktop-automations.png)
- [mobile-automations.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/mobile-automations.png)

Impacto:

- passa imagem de prototipo
- vaza linguagem tecnica para usuario final
- compromete qualquer demonstracao comercial

### P1. A base visual nao esta realmente tokenizada de ponta a ponta

O repositrio diz que `tokens.yaml` e a fonte da verdade, mas na pratica os valores aparecem duplicados e hardcoded em pelo menos tres lugares: `tokens.yaml`, `globals.css` e `tailwind.config.js`. Alem disso, o proprio token source ainda carrega branding antigo `Synkra AIOS`. Isso significa governanca fraca: qualquer ajuste visual precisa ser replicado manualmente e pode divergir facil.

Evidencia de codigo:

- [tokens.yaml#L1](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/src/tokens/tokens.yaml#L1)
- [globals.css#L5](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/styles/globals.css#L5)
- [tailwind.config.js#L9](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/tailwind.config.js#L9)

Impacto:

- tokenizacao incompleta
- alto risco de inconsistencia visual
- manutencao cara e regressiva

### P2. Arquitetura de navegacao e nomenclatura do produto estao incoerentes

O sidebar nao reflete o que o usuario realmente encontra nas telas. `Contatos` leva a webhooks, `Arquivos` leva a historico de execucoes, e `Mais` leva a telas administrativas de rate limits. Para um produto vendavel, a taxonomia precisa bater com o modelo mental do usuario, nao com nomes improvisados.

Evidencia de codigo:

- [AppSidebar.tsx#L29](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppSidebar.tsx#L29)
- [AppShell.tsx#L20](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppShell.tsx#L20)

Impacto:

- onboarding ruim
- dificuldade de venda e demo
- UX parece remendada

### P2. Copia de produto em PT-BR esta degradada e inconsistente

Ha texto sem acento e terminologia misturada nas principais superficies: `Gestao`, `Historico`, `Duracao`, `Integracoes`, `operacao`, `Ultimo`, `Acoes`. Isso parece pequeno tecnicamente, mas comercialmente passa falta de acabamento.

Evidencia de codigo:

- [AppSidebar.tsx#L100](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/layout/AppSidebar.tsx#L100)
- [LoginForm.tsx#L60](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/components/LoginForm.tsx#L60)
- [history.tsx#L211](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/pages/automations/history.tsx#L211)
- [index.tsx#L71](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/pages/dashboard/integrations/index.tsx#L71)

Impacto:

- baixa percepcao de qualidade
- experiencia menos profissional
- reduz confianca do comprador

### P2. O visual do produto esta limpo, mas sem forca, hierarquia e densidade comercial

As telas de autenticacao usam cards muito pequenos no meio de um canvas enorme; as superficies operacionais repetem blocos suaves demais, com pouca diferenciacao de prioridade, e dependem de muito cinza/azul claro sem contraste de valor suficiente. O resultado nao e ofensivo, mas tambem nao parece um SaaS premium pronto para venda.

Evidencia visual:

- [desktop-login.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit/desktop-login.png)
- [desktop-signup.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit/desktop-signup.png)
- [desktop-webhooks.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/desktop-webhooks.png)
- [desktop-history.png](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/tmp/phase1-audit-auth/desktop-history.png)

Impacto:

- pouca memorabilidade
- baixo apelo de demo
- produto nao transmite maturidade visual

### P3. Existe mais de um sistema de estilos competindo no repositrio

O frontend usa `globals.css`, mas o projeto ainda carrega outro baseline em `src/app.css`. Mesmo que essa folha nao esteja sendo aplicada ao mesmo app, a coexistencia de dois sistemas de estilo quase equivalentes aumenta ruido, retrabalho e risco de futuras divergencias.

Evidencia de codigo:

- [globals.css](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/packages/frontend/src/styles/globals.css)
- [app.css](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/src/app.css)

Impacto:

- governanca ruim
- manutencao confusa
- tokenizacao dificil de fechar

## Estado de Prontidao

Classificacao atual: `NOT READY FOR SALE`

O produto pode ser usado para exploracao tecnica e validacao interna. Nao deveria ser apresentado como pronto para venda enquanto os P1 e P2 acima nao forem resolvidos.

## Ordem Recomendada de Correcao

### Bloco A. Estabilizacao funcional

- corrigir shell mobile
- corrigir autenticacao das chamadas do dashboard
- remover fallback local e UI tecnica das superficies de fluxos em producao

### Bloco B. Fundacao visual e tokenizacao

- eleger uma unica fonte de verdade real para tokens
- eliminar duplicacao entre `tokens.yaml`, `globals.css`, `tailwind.config.js` e folhas legadas
- revisar tipografia, contraste, espacamento, elevacao e motion

### Bloco C. Reescrita de UX das superficies principais

- auth
- dashboard
- automations
- webhooks
- integrations
- history

### Bloco D. Refinamento comercial

- nomenclatura e IA
- copy PT-BR
- empty states
- estados de erro e loading
- responsividade real

### Bloco E. Validacao final

- QA funcional
- QA visual desktop e mobile
- UAT com conta real
- smoke pos-deploy

## Recomendacao Final

O proximo passo correto nao e “polir por cima”. O certo e abrir imediatamente uma frente de recuperacao do frontend com ownership claro:

- `@dev` para estabilizacao tecnica
- `@ux-design-expert` para redesign sistemico
- `@qa` para gating visual e funcional
- `@pm` para definir o padrao minimo de produto vendavel
