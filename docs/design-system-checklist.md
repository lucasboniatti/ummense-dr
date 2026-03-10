# Design System — Checklist de Verificação
> Use este documento para auditar se o sistema atual está em conformidade com o design system.
> Referência visual: `tmp/design-system-showcase.html`
> Referência técnica: `docs/design-system-handoff.md`

**Legenda:** ✅ Conforme · ❌ Divergente · ⚠️ Parcial · — Não aplicável

---

## 1. Fundação (arquivos-base)

| # | Item | Esperado | Status | Observação |
|---|---|---|---|---|
| 1.1 | `globals.css` tem `--color-primary: #0d60b8` | Azul `#0d60b8`, não laranja `#ec5b13` | | |
| 1.2 | `globals.css` tem `--color-brand-light: #f0f5fb` | Azul-acinzentado, não `#f8f6f6` | | |
| 1.3 | `globals.css` tem `--color-brand-dark: #061224` | Navy profundo, não marrom `#221610` | | |
| 1.4 | `globals.css` tem `--accent-soft: rgba(13,96,184,.12)` | rgba azul, não laranja | | |
| 1.5 | `globals.css` tem `--shadow-primary` com rgba azul | `rgba(13,96,184,...)` | | |
| 1.6 | `tailwind.config.js` usa `var(--color-primary)` | Sem hex hardcoded no config | | |
| 1.7 | `_document.tsx` tem `theme-color` = `#0d60b8` | Azul | | |
| 1.8 | `_document.tsx` carrega Public Sans via Google Fonts | Tag `<link>` presente | | |
| 1.9 | `tokens.yaml` tem `primary.DEFAULT: '#0d60b8'` | Azul | | |
| 1.10 | Dark mode em `[data-theme="dark"]` usa surfaces navy | `--surface-page: #0a1a2e` | | |

---

## 2. Tokens de Cor

### 2.1 Primary (Azul)
Verificar em DevTools (`--color-primary-*` no `:root`):

| Token | Valor Esperado | Status |
|---|---|---|
| `--color-primary` | `#0d60b8` | |
| `--color-primary-50` | `#eef4fc` | |
| `--color-primary-100` | `#d4e6f9` | |
| `--color-primary-400` | `#3a83d8` | |
| `--color-primary-500` | `#0d60b8` | |
| `--color-primary-600` | `#0b52a0` | |
| `--color-primary-700` | `#094287` | |

### 2.2 Superfícies
| Token | Valor Esperado | Status |
|---|---|---|
| `--surface-app` | `var(--color-brand-light)` → `#f0f5fb` | |
| `--surface-card` | `rgba(255,255,255,.94)` | |
| `--surface-muted` | `var(--color-neutral-100)` | |
| `--surface-header` | `rgba(255,255,255,.8)` | |

### 2.3 Texto
| Token | Valor Esperado | Status |
|---|---|---|
| `--text-strong` | `var(--color-neutral-900)` → `#0f172a` | |
| `--text-muted` | `var(--color-neutral-500)` → `#64748b` | |
| `--text-accent` | `var(--color-primary)` → `#0d60b8` | |

### 2.4 Bordas
| Token | Valor Esperado | Status |
|---|---|---|
| `--border-default` | `var(--color-neutral-200)` → `#e2e8f0` | |
| `--border-accent` | `color-mix` com primary azul | |
| `--focus-ring` | `rgba(13,96,184,.18)` | |

---

## 3. Tipografia

| # | Item | Esperado | Status | Observação |
|---|---|---|---|---|
| 3.1 | Fonte carregando no browser | Public Sans visível no Network tab | | |
| 3.2 | `body` usa `var(--font-sans)` | Não usa Inter, Arial ou system-ui diretamente | | |
| 3.3 | Headings têm `font-weight: 700` ou `800` | Bold consistente | | |
| 3.4 | Labels e meta-text têm `text-transform: uppercase` + `letter-spacing` | Padrão de caixa-alta nos rótulos | | |
| 3.5 | Font-size base de body: `14px` | Não `16px` padrão do browser | | |

---

## 4. Border Radius

| # | Elemento | Esperado | Status |
|---|---|---|---|
| 4.1 | Cards | `12px` (--radius-xl) | |
| 4.2 | Inputs | `12px` (--radius-control) | |
| 4.3 | Botões | `8–12px` conforme tamanho | |
| 4.4 | Badges / Pills | `9999px` (--radius-chip) | |
| 4.5 | Modais / Painéis | `16px` (--radius-2xl) | |
| 4.6 | Sidebar | Sem radius (ocupa altura total) | |

---

## 5. Componentes UI (`/components/ui/`)

### 5.1 Button
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.1.1 | Variant `default` | Background `#0d60b8`, texto branco | |
| 5.1.2 | Hover | `#0b52a0` (primary-600) | |
| 5.1.3 | Variant `secondary` | Background `--surface-card`, borda `--border-default` | |
| 5.1.4 | Variant `destructive` | Background `--color-error-500` | |
| 5.1.5 | Estado `disabled` | Opacidade reduzida, cursor not-allowed | |
| 5.1.6 | Focus ring | Ring azul `rgba(13,96,184,.18)` | |

### 5.2 Badge
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.2.1 | `tone="success"` | Background verde claro, texto verde escuro | |
| 5.2.2 | `tone="warning"` | Background amarelo claro, texto âmbar | |
| 5.2.3 | `tone="error"` | Background vermelho claro, texto vermelho | |
| 5.2.4 | `tone="info"` | Background azul claro, texto azul | |
| 5.2.5 | `tone="neutral"` | Background cinza, texto cinza | |
| 5.2.6 | Border-radius | `9999px` (pill) | |

### 5.3 Input
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.3.1 | Borda padrão | `--border-default` | |
| 5.3.2 | Focus | Borda `--color-primary-400`, ring azul | |
| 5.3.3 | Placeholder | Cor `--text-muted` | |
| 5.3.4 | Border-radius | `12px` | |

### 5.4 AvatarStack *(novo)*
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.4.1 | Avatars se sobrepõem com `-space-x-2` | Empilhamento correto | |
| 5.4.2 | Overflow mostra `+N` | Badge circular com contagem | |
| 5.4.3 | Borda entre avatars | `border-2 border-[--surface-raised]` | |
| 5.4.4 | Exportado em `components/ui/index.ts` | Import funcionando | |

### 5.5 ProgressSegments *(novo)*
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.5.1 | Segmentos preenchidos | Cor `--color-primary` (azul) | |
| 5.5.2 | Segmentos vazios | Cor `--border-default` | |
| 5.5.3 | Height | `6px` (h-1.5) | |
| 5.5.4 | Gap entre segmentos | `4px` (gap-1) | |
| 5.5.5 | Exportado em `components/ui/index.ts` | Import funcionando | |

### 5.6 KanbanCard *(novo)*
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.6.1 | Background | `--surface-card` | |
| 5.6.2 | Borda padrão | `--border-default` | |
| 5.6.3 | Hover | `border-[--border-accent]` + shadow azul | |
| 5.6.4 | Title | `font-weight: 700`, `--text-strong` | |
| 5.6.5 | Meta line | `10px`, uppercase, `--text-muted` | |
| 5.6.6 | Lock icon | Visível quando `isLocked={true}` | |
| 5.6.7 | Power icon verde | Visível quando `isActive={true}` | |
| 5.6.8 | Exportado em `components/ui/index.ts` | Import funcionando | |

### 5.7 TaskItem *(novo)*
| # | Verificação | Esperado | Status |
|---|---|---|---|
| 5.7.1 | Priority bar `urgent` | `4px` vermelho esquerdo | |
| 5.7.2 | Priority bar `high` | `4px` amarelo esquerdo | |
| 5.7.3 | Priority bar `none` | `4px` `--border-default` | |
| 5.7.4 | Checkbox marcado | Background `--color-primary` | |
| 5.7.5 | Estado concluído | `line-through`, opacidade reduzida | |
| 5.7.6 | Data urgente | `--color-error-500` | |
| 5.7.7 | Exportado em `components/ui/index.ts` | Import funcionando | |

---

## 6. Componentes Existentes

### 6.1 Sidebar (`AppSidebar.tsx`)
| # | Verificação | Esperado | Status | Observação |
|---|---|---|---|---|
| 6.1.1 | Background | `#061224` (`--color-brand-dark`) | | |
| 6.1.2 | Item nav padrão | Cor `rgba(255,255,255,.38)` | | |
| 6.1.3 | Item nav ativo | Background `rgba(13,96,184,.28)`, cor `#fff` | | |
| 6.1.4 | Hover item nav | Background `rgba(255,255,255,.04)` | | |
| 6.1.5 | Logo mark | Background `--color-primary` (azul), não laranja | | |
| 6.1.6 | Divider entre seções | `rgba(255,255,255,.06)` | | |
| 6.1.7 | User footer | Border-top `rgba(255,255,255,.07)` | | |
| 6.1.8 | Usa classes `.app-sidebar-link` do globals.css | Não tem estilos inline conflitantes | | |

### 6.2 KanbanBoard / Column / Card
| # | Verificação | Esperado | Status | Observação |
|---|---|---|---|---|
| 6.2.1 | Background das colunas | `--surface-muted` | | |
| 6.2.2 | Título das colunas | `10-11px`, uppercase, `--text-muted` | | |
| 6.2.3 | Cards do kanban usam `<KanbanCard />` | Componente do design system | | |
| 6.2.4 | Border-radius das colunas | `12px` | | |
| 6.2.5 | Sem cor hardcoded nos cards | Nenhum `#2563eb`, `#ec5b13`, etc. | | |

### 6.3 KPICards / MetricCard
| # | Verificação | Esperado | Status | Observação |
|---|---|---|---|---|
| 6.3.1 | Background dos cards | `--surface-card` | | |
| 6.3.2 | Borda | `--border-default` | | |
| 6.3.3 | Número principal | `font-weight: 800`, `--text-strong` | | |
| 6.3.4 | Label | `9-10px`, uppercase, `--text-muted` | | |
| 6.3.5 | Ícone de KPI | Background semântico suave (primary-50, success-100, etc.) | | |
| 6.3.6 | Tendência positiva | `--color-success-500` | | |
| 6.3.7 | Tendência negativa | `--color-error-500` | | |

### 6.4 TaskList / TaskForm
| # | Verificação | Esperado | Status | Observação |
|---|---|---|---|---|
| 6.4.1 | Lista usa `<TaskItem />` | Componente do design system | | |
| 6.4.2 | Mapeamento de priority | `urgent` / `high` / `none` | | |
| 6.4.3 | Modal usa tokens de superfície | `--surface-card`, `--radius-2xl` | | |
| 6.4.4 | Inputs do form usam `<Input />` | Foco azul correto | | |

### 6.5 TagBadge / DeliveryStatusBadge
| # | Verificação | Esperado | Status | Observação |
|---|---|---|---|---|
| 6.5.1 | Usa `<Badge tone="..." />` | Componente do design system | | |
| 6.5.2 | Status "Ativo" | `tone="success"` | | |
| 6.5.3 | Status "Pendente" | `tone="warning"` | | |
| 6.5.4 | Status "Cancelado" | `tone="error"` | | |
| 6.5.5 | Status "Revisão" | `tone="info"` | | |

---

## 7. Páginas

### 7.1 Dashboard (`/dashboard`)
| # | Verificação | Esperado (vide Tela 01 no showcase) | Status |
|---|---|---|---|
| 7.1.1 | Layout | Sidebar + main content side-by-side | |
| 7.1.2 | Header da página | Título à esquerda + botão primário à direita | |
| 7.1.3 | Background do main | `--surface-app` (`#f0f5fb`) | |
| 7.1.4 | Header sticky | `--surface-header` com backdrop-blur | |
| 7.1.5 | Grid de KPIs | 4 colunas, gap 16px | |
| 7.1.6 | Seção de tarefas | Usa `<TaskItem />` | |

### 7.2 Kanban (`/dashboard/automations` ou similar)
| # | Verificação | Esperado (vide Tela 02 no showcase) | Status |
|---|---|---|---|
| 7.2.1 | Colunas horizontais com scroll | Layout flex | |
| 7.2.2 | Cards usando `<KanbanCard />` | Design system | |
| 7.2.3 | Background das colunas | `--surface-muted` | |
| 7.2.4 | Barra de ações | Busca + filtros + botão "Novo" | |

### 7.3 Detalhe do Card (`/cards/[cardId]`)
| # | Verificação | Esperado (vide Tela 03 no showcase) | Status |
|---|---|---|---|
| 7.3.1 | Layout 2 colunas | Conteúdo + painel lateral de metadados | |
| 7.3.2 | Breadcrumb no header | Caminho de navegação em `--text-muted` | |
| 7.3.3 | Tags do card | Usando `<Badge />` | |
| 7.3.4 | Progresso do card | Usando `<ProgressSegments />` | |
| 7.3.5 | Equipe | Usando `<AvatarStack />` | |

---

## 8. Dark Mode

| # | Verificação | Esperado | Status |
|---|---|---|---|
| 8.1 | Toggle de tema funciona | Alterna `data-theme="dark"` no `<html>` | |
| 8.2 | Background dark | Navy `#0a1a2e`, não marrom | |
| 8.3 | Sidebar dark | Mesma cor `#061224` (não muda) | |
| 8.4 | Cards dark | Surface navy escuro com opacidade | |
| 8.5 | Texto dark | `#f1f5f9` (slate-100), não puro branco | |
| 8.6 | Bordas dark | `#17324f` (navy médio) | |
| 8.7 | Accent dark | `#6aaae8` (azul mais claro para contraste) | |
| 8.8 | Sem flash de tema errado no load | `ThemeToggle` aplica classe antes do render | |

---

## 9. Antipadrões (verificar ausência)

Nenhum dos itens abaixo deve existir nos componentes migrados:

| # | Antipadrão | Como detectar |
|---|---|---|
| 9.1 | `#ec5b13` ou `#ed7434` (laranja antigo) | Buscar nos arquivos `.tsx` |
| 9.2 | `#2563eb` ou `#1d4ed8` (azul antigo de info) | Buscar nos arquivos `.tsx` |
| 9.3 | `#221610` (marrom escuro antigo) | Buscar nos arquivos `.tsx` |
| 9.4 | `#f8f6f6` (fundo bege antigo) | Buscar nos arquivos `.tsx` |
| 9.5 | `font-family: Inter` ou `font-family: Arial` | Buscar nos arquivos `.tsx` e `.css` |
| 9.6 | `rounded-lg` sem token (`border-radius: 8px`) | Em contextos que deveriam ser `--radius-xl` |
| 9.7 | `bg-blue-600` ou `bg-blue-500` do Tailwind direto | Deveria usar `bg-primary` |
| 9.8 | `bg-gray-*` ou `text-gray-*` do Tailwind direto | Deveria usar `--text-muted`, `--surface-muted` |

---

## 10. Performance e Acessibilidade

| # | Verificação | Esperado | Status |
|---|---|---|---|
| 10.1 | Public Sans preconnect | `<link rel="preconnect" href="https://fonts.googleapis.com">` no `_document` | |
| 10.2 | Focus visível em todos os interativos | Ring azul ao navegar por teclado | |
| 10.3 | Contraste texto/fundo (WCAG AA) | Ratio ≥ 4.5:1 para texto normal | |
| 10.4 | Botão primário (`#0d60b8` em fundo branco) | Ratio ≈ 5.9:1 ✅ | |
| 10.5 | Transições usam `--motion-fast` / `--motion-normal` | Não são `transition-all 300ms` fixo | |
| 10.6 | Imagens de avatar têm `alt` text | Atributo `alt` preenchido | |

---

## Resumo

| Categoria | Total de itens | ✅ | ❌ | ⚠️ |
|---|---|---|---|---|
| 1. Fundação | 10 | | | |
| 2. Tokens | 16 | | | |
| 3. Tipografia | 5 | | | |
| 4. Border Radius | 6 | | | |
| 5. Componentes UI | 32 | | | |
| 6. Componentes existentes | 24 | | | |
| 7. Páginas | 14 | | | |
| 8. Dark Mode | 8 | | | |
| 9. Antipadrões | 8 | | | |
| 10. Acessibilidade | 6 | | | |
| **Total** | **129** | | | |

---

*Checklist gerado em: 2026-03-10*
*Referência visual: `tmp/design-system-showcase.html`*
*Referência técnica: `docs/design-system-handoff.md`*
