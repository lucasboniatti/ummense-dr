# Epic 10 - Checklist Pós-Deploy para Validação Comercial

## 1. Acesso
- [ ] Abrir `/auth/login`
- [ ] Fazer login com conta real
- [ ] Confirmar redirecionamento para `/`
- [ ] Fazer logout e novo login

## 2. Home
- [ ] Abrir `/`
- [ ] Sem erro visível
- [ ] Sem texto técnico
- [ ] Sem layout quebrado
- [ ] Cards e blocos com aparência consistente

## 3. Analytics
- [ ] Abrir `/dashboard`
- [ ] Sem erro visível
- [ ] Sem números inválidos
- [ ] Sem mensagens técnicas
- [ ] Visual consistente com o restante do produto

## 4. Automações
- [ ] Abrir `/dashboard/automations`
- [ ] Sem "modo técnico" no fluxo padrão
- [ ] Sem "token" exposto
- [ ] Sem linguagem de fallback agressiva
- [ ] Board utilizável e com aparência de produto

## 5. Card Detail
- [ ] Abrir um card a partir de `/dashboard/automations`
- [ ] Sem controles técnicos visíveis no fluxo padrão
- [ ] Leitura clara de contexto, tarefas e timeline
- [ ] Sem aparência de painel interno improvisado

## 6. Webhooks
- [ ] Abrir `/dashboard/webhooks`
- [ ] Criar webhook
- [ ] Editar webhook
- [ ] Excluir webhook
- [ ] Sem erro visual ou funcional

## 7. Integrações
- [ ] Abrir `/dashboard/integrations`
- [ ] Sem erro visível
- [ ] Sem `NaN`
- [ ] Cards e summaries com leitura correta
- [ ] Iniciar fluxo de Slack
- [ ] Iniciar fluxo de Discord

## 8. Histórico
- [ ] Abrir `/automations/history`
- [ ] Usar busca
- [ ] Usar filtros
- [ ] Testar presets
- [ ] Abrir detalhe de execução

## 9. Admin e Settings
- [ ] Abrir `/admin/circuit-breaker`
- [ ] Abrir `/admin/rate-limits`
- [ ] Abrir `/automations/settings`
- [ ] Confirmar consistência visual e funcional

## 10. Tema
- [ ] Alternar claro/escuro
- [ ] Recarregar página
- [ ] Confirmar persistência

## 11. Mobile
- [ ] Validar `/`
- [ ] Validar `/dashboard/automations`
- [ ] Validar `/dashboard/webhooks`
- [ ] Validar `/dashboard/integrations`
- [ ] Validar `/cards/{id}`

## Regra final
- [ ] Nenhuma rota crítica quebrada
- [ ] Nenhuma mensagem técnica exposta
- [ ] Nenhuma tela principal com aparência de sistema improvisado
- [ ] Fluxo principal utilizável de ponta a ponta
- [ ] Produto em nível aceitável para apresentação comercial
