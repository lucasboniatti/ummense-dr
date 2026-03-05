# UAT Checklist - Epic 6 Product Parity

Data de execução: `2026-03-05`  
Responsável: `@qa`  
Ambiente: `Homologação local integrada (infra + backend + frontend)`

## 1. Painel
- [x] Acessar `/` com token válido.
- [x] Validar cards de resumo carregando.
- [x] Validar widget de tarefas com estados loading/erro/empty.
- [ ] Validar calendário com filtros rápidos (`Próximos 7 dias`, `Sem data`, `Todos`).

## 2. Fluxos 2.0
- [x] Acessar `/dashboard/automations`.
- [ ] Alternar abas `Quadro`, `Tabela`, `Indicadores` sem perder filtros.
- [ ] Mover card no quadro e validar persistência após refresh.
- [ ] Abrir card via clique no board/tabela.

## 3. Card Workspace 2.0
- [x] Acessar `/cards/:id`.
- [x] Editar descrição/status/campos customizados e salvar.
- [x] Vincular/remover tag no card.
- [x] Criar nota na timeline e validar exibição imediata.

## 4. Task Workspace 2.0
- [x] Abrir modal de tarefa a partir do painel (`/cards/:id?taskId=:taskId`).
- [x] Abrir modal de tarefa a partir do fluxo (`Nova tarefa` na tabela de fluxos).
- [x] Abrir modal a partir da seção de tarefas do card.
- [ ] Criar/editar/excluir tarefa e validar histórico.

## 5. Calendário e Eventos
- [x] Criar evento com data/hora local e validar renderização correta.
- [x] Editar/remover evento.
- [ ] Validar reflexo de due date das tarefas no calendário.
- [ ] Validar persistência UTC no backend e render local no frontend.

## 6. Gate Final
- [x] `npm run quality:gates` executado.
- [x] `npm run test:e2e:parity` executado em homologação.
- [x] Evidências salvas (logs/screenshot/vídeo).
