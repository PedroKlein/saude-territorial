# UI & Styling — Findings & Standards

## Never Ship Unstyled Pages

A page is NOT done until it has:
- [ ] Proper spacing and layout (not raw HTML stacking)
- [ ] Card/container with border and shadow for form sections
- [ ] Styled inputs with borders, focus rings, and placeholder text
- [ ] Buttons with: `cursor-pointer`, background color, hover state, active press effect
- [ ] Responsive max-width container
- [ ] Consistent heading hierarchy
- [ ] PT-BR text for all user-facing content

## Global Interactive Styles

Added in `globals.css` — all interactive elements get cursor-pointer automatically:

```css
button, a, [role="button"], input[type="submit"], select {
  cursor: pointer;
}
```

## Button Pattern

```tsx
<button className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-light hover:shadow-md active:scale-[0.98] transition-all">
  Salvar
</button>
```

## Input Pattern

```tsx
<input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
```

## Card/Section Pattern

```tsx
<div className="rounded-lg border bg-white p-6 shadow-sm">
  <h3 className="mb-1 text-lg font-semibold text-gray-900">Title</h3>
  <p className="mb-4 text-sm text-gray-500">Description</p>
  {/* content */}
</div>
```

## Dashboard Layout Pattern

```tsx
<div className="min-h-screen bg-gray-50">
  <header className="border-b bg-white px-6 py-4 shadow-sm">
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      <h1 className="text-xl font-bold text-primary">Saúde Territorial</h1>
    </div>
  </header>
  <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
</div>
```

## Color Tokens (from globals.css @theme)

- `primary`: #1B5E20 (dark green — app brand)
- `primary-light`: #4CAF50 (hover state)
- `urgent-red`: #D32F2F (critical alerts)
- `alert-yellow`: #F9A825 (attention alerts)
- `safe-green`: #388E3C (normal/ok state)

## Verification

After implementing any UI, always take a screenshot via agent_browser:

```jsonc
{ "args": ["--state", ".auth-state.json", "batch"], "sessionMode": "fresh",
  "stdin": "[[\"open\",\"http://localhost:3000/page\"],[\"wait\",\"2000\"],[\"screenshot\",\"/tmp/page.png\"]]" }
```

If the page looks like raw unstyled text, it's NOT done.
