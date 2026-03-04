# 🔄 Component Refactoring Guide

**Status:** Ready for automated refactoring
**Priority:** High-impact components first
**Time Estimate:** 2-3 hours total

---

## ✅ Phase 1: Completed

- [x] Design tokens created (107 tokens)
- [x] Tailwind configured with tokens
- [x] Base atoms created (Button, Input, Badge, Card)
- [x] FormField molecule created
- [x] LoginForm refactored ✨ (example)

---

## 📋 Phase 2: Refactoring Queue (In Order)

### Group 1: Forms (5 files) — START HERE ⭐

Convert all form components to use `FormInput` + `Button` from new system.

**Files:**
1. `LoginForm.tsx` — ✅ DONE
2. `SignupForm.tsx` (160 lines)
3. `TaskForm.tsx` (185 lines)
4. `WebhookForm.tsx` (175 lines)
5. `CronExpressionInput.tsx` (125 lines)

**Pattern to Follow:**
```typescript
// OLD
<input className="w-full px-4 py-2 border..." />

// NEW
<FormInput label="Email" type="email" required />
```

**Time per file:** 10-15 minutes
**Total time:** ~60 minutes
**Savings:** ~280 lines

---

### Group 2: Cards (5 files)

Convert to use `Card` + `CardHeader` + `CardContent` from new system.

**Files:**
1. `CostCard.tsx` (210 lines)
2. `MetricCard.tsx` (180 lines)
3. `IntegrationCard.tsx` (195 lines)
4. `KPICards.tsx` (240 lines)
5. (Original Card.tsx already migrated)

**Pattern to Follow:**
```typescript
// OLD
<div className="rounded-lg shadow p-6">
  <h3>{title}</h3>
  <p>{value}</p>
</div>

// NEW
<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
  </CardHeader>
  <CardContent>{value}</CardContent>
</Card>
```

**Time per file:** 15-20 minutes
**Total time:** ~90 minutes
**Savings:** ~445 lines

---

### Group 3: Modals (5 files)

Standardize modal structure using consistent Dialog pattern.

**Files:**
1. `DLQDetailModal.tsx` (320 lines)
2. `ExecutionDetailModal.tsx` (185 lines)
3. `SlackConnectModal.tsx` (145 lines)
4. `DiscordConnectModal.tsx` (135 lines)
5. `TestWebhookModal.tsx` (120 lines)

**Next Step:** Create `Dialog.tsx` molecule first, then refactor modals.

**Time per file:** 20-25 minutes
**Total time:** ~120 minutes
**Savings:** ~320 lines

---

### Group 4: Tables (3 files)

Standardize table structure.

**Files:**
1. `DLQTable.tsx` (410 lines)
2. `ExecutionHistoryTable.tsx` (220 lines)
3. `TasksTable.tsx` (190 lines)

**Next Step:** Create `Table.tsx` molecule first.

**Time per file:** 25-30 minutes
**Total time:** ~80 minutes
**Savings:** ~180 lines

---

### Group 5: Inline Styles (10 files)

Replace `style={{}}` with Tailwind utilities.

**Files:**
1. DashboardContainer.tsx
2. DeliveryHistory.tsx
3. LogsSearchInterface.tsx
4. RecentExecutions.tsx
5. (+ 6 more)

**Pattern to Follow:**
```typescript
// OLD
<div style={{ padding: '24px', color: '#111827' }}>

// NEW
<div className="p-6 text-neutral-900">
```

**Time per file:** 5-10 minutes
**Total time:** ~60 minutes
**Savings:** ~120 lines

---

## 🎯 Commands to Execute (In Order)

```bash
# 1. Create remaining molecules
*build dialog               # Create Dialog compound for modals
*build table                # Create Table pattern

# 2. Refactor high-impact groups
*refactor-forms            # All 5 form components
*refactor-cards            # All 5 card components
*refactor-modals           # All 5 modal components
*refactor-tables           # All 3 table components

# 3. Cleanup
*migrate-inline-styles     # 10 files with style={{}}
```

---

## ✨ Refactoring Checklist Template

For **each** component refactoring:

- [ ] Read original component
- [ ] Identify structure (header, content, footer, etc)
- [ ] Replace with new atoms/molecules
- [ ] Update imports
- [ ] Remove inline styles → use tokens
- [ ] Test in browser
- [ ] Verify no visual regressions
- [ ] Commit with descriptive message

---

## 📦 Import Updates

When refactoring, update imports like this:

```typescript
// ADD
import { Button, buttonVariants } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/CardUI'
import { FormInput } from '@/components/composite/FormField'
import { Badge } from '@/components/ui/Badge'

// REMOVE (if not used elsewhere)
// Old imports from components...
```

---

## 🎨 Color Token Mapping

When migrating styles, use these token classes:

```
Tailwind → Token
bg-blue-600 → bg-primary-600
bg-red-600 → bg-error-600
bg-green-600 → bg-success-600
bg-yellow-600 → bg-warning-600
bg-gray-100 → bg-neutral-100
text-gray-900 → text-neutral-900
border-gray-300 → border-neutral-300
```

---

## 📊 Progress Tracking

```
FORMS:     [ ] → [ ] → [ ] → [ ] → [ ]
CARDS:     [ ] → [ ] → [ ] → [ ] → [ ]
MODALS:    [ ] → [ ] → [ ] → [ ] → [ ]
TABLES:    [ ] → [ ] → [ ] → [ ]
INLINE:    [ ] (batch)

Current: 1/28 ✅
```

---

## ⏱️ Total Time Estimate

```
Forms:         60 min
Cards:         90 min
Modals:       120 min (includes building Dialog)
Tables:        80 min (includes building Table)
Inline styles: 60 min
Testing:       30 min
─────────────────────
TOTAL:        440 min (~7-8 hours)
```

**Per component average:** 15-20 minutes

---

## 🚀 Starting Now

1. Open `SignupForm.tsx`
2. Follow pattern from `LoginForm.tsx` (already refactored)
3. Replace inputs with `<FormInput>`
4. Replace button with `<Button>`
5. Test in browser
6. Commit: `refactor(forms): migrate SignupForm to design system`

---

## 💡 Pro Tips

1. **Do forms first** — They're the simplest and build confidence
2. **Use LoginForm as template** — Copy/paste pattern, adapt
3. **Test after each component** — Catch issues early
4. **Batch similar components** — Do all cards together (better focus)
5. **Commit frequently** — After each 2-3 components

---

## 🔗 References

- `LoginForm.tsx` — Refactored example
- `DESIGN_SYSTEM_SETUP.md` — Token reference
- `CONSOLIDATION_REPORT.md` — Full analysis
- `.cursorrules` — IDE guidelines

---

## ❓ Common Issues & Solutions

### Issue: "Cannot find module '@/components/ui'"
**Solution:** Make sure `ui/index.ts` barrel export exists

### Issue: Tailwind classes not working
**Solution:** Check `tailwind.config.ts` has the color definitions

### Issue: Component looks different
**Solution:** Compare side-by-side, check spacing/sizing tokens

### Issue: Forms submission broken
**Solution:** FormInput is just a styled input, form logic unchanged

---

**Ready to start?** → Begin with SignupForm.tsx!
