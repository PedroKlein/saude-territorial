---
name: tailwind-shadcn
description: >
  Tailwind CSS v4 + shadcn/ui conventions for this health monitoring project. Covers CSS-first
  configuration with @theme (no tailwind.config.js), project-specific urgency and layer
  semantic tokens, @source inline() for dynamic classes, overlay selection with state
  management, form patterns, and the composition rules that trip up LLMs. Use when writing
  UI components, styling, choosing between shadcn components, managing overlay state, or
  theming urgency/alert indicators. Triggers on: className, styling, tailwind, shadcn,
  component, Button, Dialog, Sheet, Card, form, color, theme, dark mode, responsive, cn(),
  spacing, layout, icon, urgency badge, alert color, layer color, overlay open state.
  Do NOT use for map-specific UI (use leaflet-nextjs) or data fetching (use tanstack-query).
---

# Tailwind v4 + shadcn/ui

## Project Design Tokens (`@theme`)

No `tailwind.config.js` in v4 — all tokens live in `globals.css`. These are this project's
semantic tokens that the LLM MUST use instead of raw colors:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Urgency categories — used in badges, markers, priority list */
  --color-urgency-critico: oklch(0.55 0.22 25);
  --color-urgency-atencao: oklch(0.7 0.18 70);
  --color-urgency-normal: oklch(0.6 0.16 145);

  /* Layer accents — one per sheet tab, used in sidebar toggles + map legend */
  --color-layer-gestantes: oklch(0.6 0.2 340);
  --color-layer-tb: oklch(0.65 0.15 60);
  --color-layer-dm: oklch(0.6 0.18 280);
  --color-layer-has: oklch(0.55 0.2 25);
  --color-layer-acamados: oklch(0.5 0.15 200);
  --color-layer-pse: oklch(0.65 0.12 150);
  --color-layer-ilpi: oklch(0.6 0.1 300);
}
```

## Token → Component Mapping

| Domain concept | Token class | Component usage |
|---|---|---|
| Crítico urgency | `bg-urgency-critico text-white` | `<Badge>`, priority list row, marker ring |
| Atenção urgency | `bg-urgency-atencao text-white` | `<Badge>`, priority list row |
| Normal urgency | `bg-urgency-normal text-white` | `<Badge>` |
| Layer toggle (active) | `bg-layer-{tab} text-white` | Sidebar `<Button>` variant |
| Layer toggle (inactive) | `border-layer-{tab} text-layer-{tab}` | Sidebar `<Button>` outline |
| Alert indicator | `text-urgency-critico` | Icon color in alert list |

```tsx
// Example: urgency badge
<Badge className={cn(
  urgency === 'critico' && 'bg-urgency-critico text-white',
  urgency === 'atencao' && 'bg-urgency-atencao text-white',
  urgency === 'normal' && 'bg-urgency-normal text-white',
)}>
  {URGENCY_LABELS[urgency]}
</Badge>
```

## `@source inline()` for Dynamic Layer Classes

When class names are assembled from runtime data (tab names from Sheet discovery),
Tailwind v4 can't detect them statically. Use `@source inline()`:

```css
/* globals.css — ensure dynamic layer classes are included in the build */
@source inline("bg-layer-gestantes bg-layer-tb bg-layer-dm bg-layer-has bg-layer-acamados bg-layer-pse bg-layer-ilpi border-layer-gestantes border-layer-tb border-layer-dm border-layer-has text-layer-gestantes text-layer-tb text-layer-dm text-layer-has");
```

**When to use:** Only for classes assembled at runtime like `bg-layer-${tabName}`.
Static conditionals (`urgency === 'critico' && 'bg-urgency-critico'`) don't need this
because Tailwind v4 detects the literal string in the source code.

## Overlay Selection + State Management

### Choosing the right overlay

| Need | Component | State location |
|------|-----------|---------------|
| Patient edit form | `Dialog` | Zustand (`editDialogCns`) |
| Confirm critical action | `AlertDialog` | Local `useState` (ephemeral) |
| Filters panel / patient detail | `Sheet` (side panel) | Zustand (`detailPanelCns`) |
| Mobile layer controls | `Drawer` (bottom) | Zustand (`drawerOpen`) |
| Quick marker info on click | `Popover` | Uncontrolled (radix manages) |
| Hover preview on marker | `HoverCard` | Uncontrolled |

### State management for overlays (critical performance rule)

**NEVER use `useState` in the map layout for overlay open state.** It triggers a
re-render of the entire map + 500 markers. Use Zustand with selectors:

```tsx
// stores/uiStore.ts
export const useUiStore = create<UiState>((set) => ({
  editDialogCns: null,      // null = closed, CNS = open for that patient
  detailSheetCns: null,
  openEditDialog: (cns) => set({ editDialogCns: cns }),
  closeEditDialog: () => set({ editDialogCns: null }),
  openDetailSheet: (cns) => set({ detailSheetCns: cns }),
  closeDetailSheet: () => set({ detailSheetCns: null }),
}))

// In the Dialog component — subscribes ONLY to its own slice
function PatientEditDialog() {
  const cns = useUiStore(s => s.editDialogCns)
  const close = useUiStore(s => s.closeEditDialog)
  return (
    <Dialog open={!!cns} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar paciente</DialogTitle></DialogHeader>
        {cns && <PatientForm cns={cns} />}
      </DialogContent>
    </Dialog>
  )
}
```

**Why:** The map parent never re-renders because it doesn't subscribe to `editDialogCns`.

### Overlay accessibility requirements

All overlays MUST have a Title (`DialogTitle`, `SheetTitle`, `DrawerTitle`).
Use `className="sr-only"` if visually hidden.

## Overlay Anti-Patterns

- **NEVER use Dialog for multi-step flows** — use Sheet (side panel); Dialog should be a single focused task
- **NEVER use Sheet for destructive confirmations** — use AlertDialog (blocks all interaction)
- **NEVER use Popover for forms** — it doesn't trap focus; user can tab outside and lose work
- **NEVER use useState in map layout for overlay state** — triggers full map re-render with 500+ markers

## Form Patterns (Project-Specific)

This project uses FieldGroup/Field compound components for patient data forms:

```tsx
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="nome">Nome completo</FieldLabel>
    <Input id="nome" />
  </Field>
  <Field data-invalid>
    <FieldLabel htmlFor="cns">CNS</FieldLabel>
    <Input id="cns" aria-invalid />
    <FieldDescription>CNS deve ter 15 dígitos</FieldDescription>
  </Field>
</FieldGroup>
```

Validation: `data-invalid` on `Field` (visual state), `aria-invalid` on the control (accessibility).
These are NOT the same — `data-invalid` is optional visual styling; `aria-invalid` is required for screen readers.

## Spacing Rule

Use `gap-*` (flex/grid), never `space-x-*` or `space-y-*`. Space utilities apply margin
to children — they break silently when a child is conditionally rendered (`{show && <div/>}`):

```tsx
// Conditional child causes unexpected spacing
<div className="space-y-4">
  <Input />
  {showError && <Alert />}  {/* When hidden, gap collapses incorrectly */}
  <Button />
</div>

// gap-* is immune to conditional children
<div className="flex flex-col gap-4">
```

## Items Always Inside Their Group

This is the #1 shadcn composition error. The component renders but accessibility breaks:

- `SelectItem` → must be inside `SelectGroup`
- `DropdownMenuItem` → must be inside `DropdownMenuGroup`
- `CommandItem` → must be inside `CommandGroup`
- `TabsTrigger` → must be inside `TabsList`

## Button Loading (No `isPending` Prop)

shadcn Button has NO `isPending` or `isLoading` prop. The LLM hallucinates this:

```tsx
// BAD — prop doesn't exist, silently ignored
<Button isPending>Salvando...</Button>

// GOOD — compose
<Button disabled>
  <Spinner data-icon="inline-start" />
  Salvando...
</Button>
```

## Icons: `data-icon` Attribute

```tsx
// BAD — manual sizing breaks responsiveness
<Button><SearchIcon className="w-4 h-4 mr-2" />Buscar</Button>

// GOOD — component handles icon sizing via CSS
<Button><SearchIcon data-icon="inline-start" />Buscar</Button>
```

## NEVER

- **NEVER use raw color values** (`bg-blue-500`, `text-red-600`) — use semantic tokens from `@theme`; raw colors break dark mode and make theming impossible
- **NEVER create `tailwind.config.js`** — Tailwind v4 uses CSS-first `@theme` in globals.css
- **NEVER use `space-x-*` or `space-y-*`** — use flex/grid + `gap-*`; space breaks with conditional children
- **NEVER use `useState` in map layout for overlay open state** — use Zustand; useState causes 500-marker re-render cascade
- **NEVER override component colors via `className`** — use the `variant` prop or a semantic token; className is for layout only
- **NEVER add `dark:` color overrides manually** — semantic tokens from `@theme` handle both modes automatically
- **NEVER add manual `z-index` on overlay components** — Dialog, Sheet, Popover manage their own stacking context
- **NEVER build custom empty states, loading spinners, separators, or badges** — use the shadcn `Empty`, `Spinner`, `Separator`, `Badge` components
- **NEVER use `bg-layer-${tabName}` without `@source inline()`** — Tailwind v4 can't detect runtime-assembled classes; they'll be missing from the build
- **NEVER put form elements in a `<Popover>`** — Popover doesn't trap focus; use Dialog or Sheet for forms
