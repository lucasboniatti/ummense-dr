# Design System Handoff — Ummense DR
> Documento de transferência para aplicação do design system no sistema existente.
> Gerado em: 2026-03-10 | Versão: 1.0.0

---

## Contexto

O design system foi extraído de 4 telas do Stitch (ferramenta de prototipação) e implementado no monorepo `ummense-dr`. Os tokens já estão aplicados nos arquivos de configuração. O trabalho restante é **migrar os componentes existentes** para usarem as variáveis CSS do design system, eliminando valores hardcoded.

**Orientação visual completa:** `tmp/design-system-showcase.html` (abrir no browser)

---

## Stack

```
packages/frontend/
├── Next.js 15 + React 19
├── TypeScript
├── Tailwind CSS v4 (configurado com CSS vars)
└── Radix UI (primitivos de acessibilidade)
```

---

## Arquivos-chave do Design System (JÁ IMPLEMENTADOS — não alterar)

| Arquivo | Papel |
|---|---|
| `tokens.yaml` | Fonte de verdade de todos os tokens |
| `packages/frontend/tailwind.config.js` | Escala Tailwind mapeada para CSS vars |
| `packages/frontend/src/styles/globals.css` | CSS custom properties (`:root`) |
| `packages/frontend/src/pages/_document.tsx` | Fonte Public Sans + theme-color |
| `packages/frontend/src/components/ui/` | Componentes atômicos prontos |

---

## Tokens de Referência Rápida

### Cor Primary (Azul)
```css
--color-primary:     #0d60b8   /* uso padrão */
--color-primary-50:  #eef4fc   /* backgrounds suaves */
--color-primary-100: #d4e6f9   /* chips, tags */
--color-primary-400: #3a83d8   /* hover states */
--color-primary-500: #0d60b8   /* ★ tom principal */
--color-primary-600: #0b52a0   /* pressed / dark hover */
--color-primary-700: #094287   /* texto sobre fundo claro */
```

### Brand
```css
--color-brand-light: #f0f5fb   /* canvas da app (fundo geral) */
--color-brand-dark:  #061224   /* sidebar, dark mode canvas */
--color-pro:         #0bda7a   /* badge PRO, features premium */
```

### Superfícies (usar SEMPRE estes, nunca hardcode)
```css
--surface-app:    var(--color-brand-light)    /* background da página */
--surface-card:   rgba(255,255,255,.94)       /* cards, painéis */
--surface-muted:  var(--color-neutral-100)   /* inputs, chips secundários */
--surface-header: rgba(255,255,255,.8)        /* header com backdrop-blur */
```

### Texto
```css
--text-strong:    var(--color-neutral-900)   /* títulos, headings */
--text-secondary: var(--color-neutral-600)   /* labels, meta */
--text-muted:     var(--color-neutral-500)   /* placeholders, ícones */
--text-accent:    var(--color-primary)       /* links, estados ativos */
```

### Bordas
```css
--border-default: var(--color-neutral-200)   /* cards, inputs padrão */
--border-strong:  var(--color-neutral-300)   /* inputs on focus-adjacent */
--border-accent:  color-mix(in srgb, var(--color-primary) 28%, var(--border-default))
```

### Sombras
```css
--shadow-soft:        0 18px 36px -28px rgba(15,23,42,.24)
--shadow-primary:     0 16px 34px -22px rgba(13,96,184,.42)   /* botões primários */
--shadow-primary-day: 0 8px 18px -10px rgba(13,96,184,.5)
```

### Raios
```css
--radius-xl:      12px   /* ★ padrão — cards, modais, inputs principais */
--radius-card:    12px
--radius-control: 12px
--radius-chip:    9999px /* badges, pills */
```

### Tipografia
```css
--font-sans: 'Public Sans', system-ui, sans-serif   /* corpo e UI */
```

### Status (cores semânticas — não modificar)
```css
/* Success */  --color-success-500: #10b981  (emerald)
/* Warning */  --color-warning-500: #f59e0b  (amber)
/* Error   */  --color-error-500:   #ef4444  (red)
/* Info    */  --color-info-500:    #3b82f6  (blue)
/* PRO     */  --color-pro:         #0bda7a  (green)
```

---

## Componentes UI Prontos (em `/components/ui/`)

Estes componentes já estão construídos e exportados. **Use-os** nos componentes existentes:

```tsx
import {
  Button,          // variantes: default, secondary, ghost, destructive
  Badge,           // variantes: tone-* (neutral, info, success, warning, error)
  Input,
  Select, SelectTrigger, SelectContent, SelectItem,
  Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Skeleton, SkeletonCard, SkeletonList,
  Toast, ToastContainer,
  AvatarStack,     // avatars empilhados com overflow (+N)
  ProgressSegments,// barra de progresso segmentada
  KanbanCard,      // card do quadro kanban
  TaskItem,        // item de tarefa com prioridade e checkbox
  EmptyState,
  Spinner,
  ErrorBanner,
} from '@/components/ui'
```

### Referência rápida de uso:

```tsx
// Botão primário
<Button>Novo contrato</Button>

// Badge de status
<Badge tone="success">Ativo</Badge>
<Badge tone="warning">Pendente</Badge>
<Badge tone="error">Cancelado</Badge>

// Progress em segmentos (ex: etapas de um contrato 3/4)
<ProgressSegments filled={3} total={4} color="primary" />

// Card do Kanban
<KanbanCard
  title="AGROCENTER S.A."
  meta="AGRO · SAMUEL"
  progressFilled={3}
  progressColor="primary"
  avatars={[{ fallback: 'SL' }, { fallback: 'MR' }]}
  isLocked={false}
  isActive={true}
/>

// Item de tarefa
<TaskItem
  title="Enviar proposta Agrocenter"
  priority="urgent"
  date="Vence hoje"
  isUrgent
  category="Comercial"
  assignees={[{ fallback: 'SL' }]}
  onToggle={(done) => handleToggle(done)}
/>

// Avatar stack
<AvatarStack
  avatars={[{ fallback: 'JS' }, { fallback: 'MR' }, { src: '/avatar.png', fallback: 'AB', alt: 'Ana' }]}
  size="sm"
  max={3}
/>
```

---

## Componentes Existentes para Migrar

A seguir, cada componente que precisa de atualização, com o que mudar especificamente.

---

### 1. `components/KanbanBoard.tsx`
**Objetivo:** Usar `KanbanCard` do design system no lugar de cards customizados.

```
- Substituir cards inline por <KanbanCard /> de @/components/ui
- Colunas: usar --surface-muted como background
- Header da coluna: font-size 10-11px, font-weight 700, uppercase, letter-spacing, cor --text-muted
- Borda de coluna: --border-default
- Border-radius das colunas: --radius-xl (12px)
- Cor da coluna ativa/selecionada: border-color --border-accent
```

---

### 2. `components/Column.tsx`
**Objetivo:** Alinhar estilo de coluna ao design system.

```
- Background: bg-[color:var(--surface-muted)]
- Border: border-[color:var(--border-default)]
- Border-radius: rounded-xl (12px)
- Título: text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--text-muted)]
- Contador de cards: badge circular, background --border-default, cor --text-muted
```

---

### 3. `components/Card.tsx`
**Objetivo:** Substituir por `<KanbanCard />` ou alinhar ao mesmo estilo.

```
- Se Card é o card do kanban → substituir por <KanbanCard /> diretamente
- Se Card tem lógica própria → manter lógica, aplicar estilos:
  background: var(--surface-card)
  border: 1px solid var(--border-default)
  border-radius: 12px (--radius-xl)
  box-shadow: var(--shadow-soft)
  hover: border-color var(--border-accent), box-shadow var(--shadow-primary)
  transition: all var(--motion-fast)
```

---

### 4. `components/KPICards.tsx`
**Objetivo:** Aplicar visual dos KPI cards do Meu Painel (vide showcase Tela 01).

```
- Container: bg-[color:var(--surface-card)] rounded-xl border border-[color:var(--border-default)] p-4
- Label: text-[10px] font-bold uppercase tracking-[.08em] text-[color:var(--text-muted)]
- Valor principal: text-2xl font-extrabold text-[color:var(--text-strong)]
- Ícone: background cor semântica suave (ex: --color-primary-50), rounded-lg
- Tendência positiva: text-success-500
- Tendência negativa: text-error-500
```

---

### 5. `components/MetricCard.tsx`
**Objetivo:** Unificar com o padrão de KPICards.

```
- Mesmo padrão de card: surface-card, border-default, rounded-xl, shadow-soft
- Usar ProgressSegments para exibir métricas com barra de progresso
```

---

### 6. `components/TaskList.tsx`
**Objetivo:** Usar `<TaskItem />` do design system para cada tarefa.

```
- Substituir cada item da lista por <TaskItem />
- Mapear priority: 'high' | 'urgent' | 'none' para o campo priority do TaskItem
- Mapear assignees para AvatarItem[]
- onToggle → chamar a mutation de completar tarefa existente
```

---

### 7. `components/TagBadge.tsx`
**Objetivo:** Unificar com `<Badge />` do design system.

```
- Substituir por <Badge tone={mapTagToTone(tag)} />
- Mapeamento sugerido:
  "Ativo"     → tone="success"
  "Pendente"  → tone="warning"
  "Cancelado" → tone="error"
  "Revisão"   → tone="info"
  default     → tone="neutral"
- Se precisar de cor customizada de tag → usar className adicional
```

---

### 8. `components/layout/` (Sidebar / Header)
**Objetivo:** Aplicar o estilo de sidebar navy do design system.

```
Sidebar:
- background: var(--color-brand-dark)  → #061224
- Logo: ícone 32px, background --color-primary, border-radius 8px, texto #fff
- Nav item padrão: padding 8px 10px, border-radius 8px, cor rgba(255,255,255,.35)
- Nav item ativo: background rgba(13,96,184,.28), cor #fff
- Divider: height 1px, background rgba(255,255,255,.06)
- User footer: padding 12px 14px, border-top rgba(255,255,255,.07)

Header:
- background: var(--surface-header)  → rgba(255,255,255,.8)
- backdrop-filter: blur(8px)
- border-bottom: 1px solid var(--border-default)
- height: var(--layout-header-height)  → 64px
```

---

### 9. `components/DeliveryStatusBadge.tsx`
**Objetivo:** Usar `<Badge />` com tones semânticos.

```
- Mapear status de entrega para tones do Badge
- Manter lógica de negócio, trocar apenas o visual
```

---

### 10. `components/TaskForm.tsx` / `components/TaskModal.tsx`
**Objetivo:** Aplicar tokens de modal e formulário.

```
Modal container:
- background: var(--surface-card)
- border-radius: --radius-2xl (16px)
- box-shadow: 0 24px 64px rgba(6,18,36,.25)

Inputs dentro do form:
- Usar <Input /> de @/components/ui (já tem focus ring azul)
- border-radius: --radius-xl
- focus: border-color --color-primary-400, box-shadow --focus-ring

Botão de submit:
- Usar <Button /> (variant default = primary azul)
```

---

### 11. `pages/dashboard/index.tsx`
**Objetivo:** Estrutura conforme Tela 01 do showcase.

```
Layout: sidebar + main content
Header: título da página à esquerda, ação primária à direita
Seção de KPIs: grid 4 colunas, gap 16px
Seção de tarefas: usar <TaskList /> com <TaskItem />
Background: bg-[color:var(--surface-app)]
```

---

### 12. `pages/cards/[cardId].tsx`
**Objetivo:** Estrutura conforme Tela 03 do showcase (Detalhe do Card).

```
Layout: 2 colunas
- Coluna esquerda (flex:1): título, descrição, tags, timeline/histórico
- Coluna direita (240px fixo): painel de metadados (responsável, valor, datas, equipe)
- Border-left da coluna direita: 1px solid var(--border-default)
- Breadcrumb no header: text-muted / separator / text-strong
```

---

## Padrões Proibidos (não usar)

```css
/* ❌ Hardcoded — não usar */
background: #2563eb;
color: #374151;
border-color: #e5e7eb;
border-radius: 0.5rem;
font-family: Inter, sans-serif;
box-shadow: 0 1px 3px rgba(0,0,0,0.1);

/* ✅ Correto — usar sempre tokens */
background: var(--color-primary);
color: var(--text-strong);
border-color: var(--border-default);
border-radius: var(--radius-xl);
font-family: var(--font-sans);
box-shadow: var(--shadow-soft);
```

---

## Classes Tailwind disponíveis (mapeadas para tokens)

```
Cores:
  bg-primary          → #0d60b8
  bg-primary-50       → #eef4fc
  text-primary        → #0d60b8
  border-primary      → #0d60b8
  bg-brand-light      → #f0f5fb
  bg-brand-dark       → #061224
  bg-pro              → #0bda7a
  bg-success-{50-700}
  bg-warning-{50-700}
  bg-error-{50-700}

Usando CSS vars direto no Tailwind (quando classe não existe):
  bg-[color:var(--surface-card)]
  text-[color:var(--text-muted)]
  border-[color:var(--border-default)]
  shadow-[var(--shadow-soft)]
```

---

## Ordem de Prioridade de Migração

Execute nesta ordem para ter resultado visual imediato:

```
1. layout/ (Sidebar + Header)         → impacto global, base para o resto
2. KPICards.tsx + MetricCard.tsx      → visível no dashboard
3. KanbanBoard.tsx + Column.tsx       → tela principal
4. Card.tsx                           → substituir por KanbanCard
5. TaskList.tsx                       → substituir por TaskItem
6. TagBadge.tsx                       → substituir por Badge
7. TaskForm.tsx + TaskModal.tsx       → formulários e modais
8. pages/dashboard/index.tsx          → estrutura final do painel
9. pages/cards/[cardId].tsx           → detalhe do card
```

---

## Referência Visual

| Tela | Preview no Showcase |
|---|---|
| Meu Painel | Seção "Tela 01" |
| Quadro Kanban | Seção "Tela 02" |
| Detalhe do Card | Seção "Tela 03" |
| Coletar Aprovação | Seção "Tela 04" |

**Arquivo:** `tmp/design-system-showcase.html` — abrir no browser para referência visual completa.

---

## Verificação Final

Após aplicar, conferir:
- [ ] Nenhum valor hexadecimal hardcoded nos componentes migrados
- [ ] Fonte Public Sans carregando (verificar network tab)
- [ ] Sidebar com background `#061224`, não cinza/branco
- [ ] Botões primários com `#0d60b8`, não azul antigo `#2563eb`
- [ ] Cards com `border-radius: 12px` e borda `var(--border-default)`
- [ ] Focus states com ring azul (`rgba(13,96,184,.18)`)
- [ ] Dark mode funcionando via `[data-theme="dark"]` no elemento root
