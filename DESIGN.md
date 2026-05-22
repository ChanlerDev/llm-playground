# LLM API Explorer — Design System

## Philosophy

A **warm-light developer tool** with editorial restraint. Parchment canvas, ink-dark text, one vibrant orange accent. No gradients, no glow effects, no drop shadows. Depth comes from layered neutral surfaces and hairline borders only.

**Three principles:**
1. **Hairline depth** — 1px warm borders carry all spatial hierarchy. No shadows.
2. **Restrained accent** — One orange accent (`#f54e00`), used only for primary actions and active states. Everything else is neutral.
3. **Type-driven hierarchy** — Weight, size, and opacity do the work. Color is not a crutch.

---

## Colors

### Surfaces (warm light, layered)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#f7f7f4` | Page floor. Warm off-white. |
| `canvas-soft` | `#fafaf7` | Slightly lighter recessed areas, tab backgrounds. |
| `surface-card` | `#ffffff` | Cards, elevated containers, active tabs. |
| `surface-strong` | `#e6e5e0` | Slider tracks, badges, emphasized surfaces. |

### Borders (hairline system)

| Token | Value | Use |
|---|---|---|
| `hairline` | `#e6e5e0` | Default panel dividers, card outlines. |
| `hairline-soft` | `#efeee8` | Subtle internal dividers. |
| `hairline-strong` | `#cfcdc4` | Focused inputs, emphasized borders. |

### Text

| Token | Value | Use |
|---|---|---|
| `ink` | `#26251e` | Headings, values, primary content. |
| `body` | `#5a5852` | Default body text, labels. |
| `body-strong` | `#26251e` | Emphasized body text. |
| `muted` | `#807d72` | Secondary labels, descriptions, placeholders. |
| `muted-soft` | `#a09c92` | Disabled, tertiary info. |

### Accent (orange — one color, used scarcely)

| Token | Value | Use |
|---|---|---|
| `primary` | `#f54e00` | Primary CTA fill, active indicators, focus rings. |
| `primary-active` | `#d04200` | Press/hover state. |
| `on-primary` | `#ffffff` | Text on accent background. |

### Semantic

| Token | Value | Use |
|---|---|---|
| `semantic-success` | `#1f8a65` | Connected, complete, green border on content chunks. |
| `semantic-error` | `#cf2d56` | Failed request, validation error, abort. |

### Timeline

| Token | Value | Use |
|---|---|---|
| `timeline-thinking` | `#dfa88f` | Thinking/reasoning chunks. |
| `timeline-grep` | `#9fc9a2` | Search/grep chunks. |
| `timeline-read` | `#9fbbe0` | File read chunks. |
| `timeline-edit` | `#c0a8dd` | Edit chunks. |
| `timeline-done` | `#c08532` | Completion marker. |

---

## Typography

### Font Stack

- **UI:** `"Inter", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif`
- **Code:** `"JetBrains Mono Variable", "JetBrains Mono", "Fira Code", monospace` — Every code surface, JSON viewer, raw SSE, request preview.

### Scale (utility classes)

| Class | Properties | Use |
|---|---|---|
| `text-display-lg` | 36px, normal, -0.72px tracking | Hero (unused currently) |
| `text-display-md` | 24px, normal, -0.325px tracking | Section hero |
| `text-title-md` | 18px, semibold, snug leading | Panel titles |
| `text-title-sm` | 16px, semibold, snug leading | Header title |
| `text-body-md` | 16px, normal | Default body |
| `text-body-sm` | 14px, normal | Compact body |
| `text-caption` | 13px, normal, muted | Meta labels |
| `text-caption-upper` | 11px, semibold, 0.88px tracking, uppercase | Section headers |
| `text-code` | 13px, mono, normal | Code surfaces |
| `text-nav` | 14px, medium | Navigation items |
| `text-button` | 14px, medium | Button labels |

---

## Spacing

### Base unit: 4px

Panel internal padding: 16–24px horizontal, 12–16px vertical.
Between form fields: 12px. Tab bar height: 40px. Header height: 64px.

---

## Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 4px | Small buttons, inputs |
| `md` | 6px | Cards, panels, standard inputs |
| `lg` | 8px | Large containers |
| `xl` | 12px | Popovers |
| `pill` | 9999px | Badges, status indicators |

---

## Elevation & Depth

**No shadows. Period.**

Hierarchy through:
1. Surface color layering (`canvas` → `canvas-soft` → `surface-card` → `surface-strong`)
2. Hairline borders at three weights (soft/default/strong)
3. Text color stepping (ink → body → muted → muted-soft)

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│ Header (64px): Logo + Title │ Stats Dashboard       │
├────────────┬──────────────────┬─────────────────────┤
│ Config     │ Center Panel     │ Response Panel      │
│ (280px)    │ (flex)           │ (flex)              │
│            │ Tabs: Messages / │ Tabs: Response /    │
│ Provider   │ Tools / Preview /│ Content / Stream    │
│ Connection │ Schema           │                     │
│ Parameters │                  │                     │
│            │                  │                     │
│ [Send]     │                  │                     │
├────────────┴──────────────────┴─────────────────────┤
│ Timeline bar                                        │
└─────────────────────────────────────────────────────┘
```

- Config panel: fixed 280px width. `canvas-soft` background.
- Center + Response: flexible, equal split. `canvas` background.
- Timeline: bottom bar. `canvas` background.
- All panel dividers: 1px `hairline`.

### Responsive

| Breakpoint | Change |
|---|---|
| < 1024px (lg) | Config collapses to `<details>` accordion. 2-column layout. |
| < 768px | Single column. Stacked sections. |

---

## Components

### Tabs
- Default variant: `canvas-soft` pill background, active tab gets `surface-card`.
- Line variant: transparent background, active tab gets `primary` bottom border.
- Inactive text: `muted`. Active text: `ink`.

### Inputs & Textareas
- Background: transparent (inherits). Border: `hairline-strong`.
- Focus: border → `primary`, ring → `primary/50`.
- Placeholder: `muted-foreground`.

### Buttons
- Primary: `primary` background, white text.
- Outline: transparent, `hairline-strong` border, `muted` text → `ink` on hover.
- Ghost: transparent, `muted` text → `ink` on hover, `canvas-soft` bg on hover.

### JSON Viewer
- Background: `canvas`. Border: `hairline`. Monospace.
- Keys: `ink`. Strings: `semantic-success`. Numbers: `blue-600`. Booleans: `amber-600`. Null/punctuation: `muted`.

### Stream Viewer
- Chunk border-left colors: green (`semantic-success`) for content, red (`semantic-error`) for stop/error, `hairline-strong` for metadata.
- Hover: `canvas-soft`. Dividers: `hairline-soft`.

---

## Motion

Minimal. Functional only.

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Tab switch | Content opacity fade | 150ms | ease-out |
| Streaming cursor | Opacity blink | 800ms | step-end |
| Loading pulse | Opacity 0.4↔1.0 | 1500ms | ease-in-out |

No entrance animations. No staggered reveals. Tool appears ready instantly.

---

## Do's and Don'ts

### Do
- Use `primary` (orange) only for primary CTA and active indicators.
- Keep all surfaces warm-toned neutral. No cool grays.
- Let text hierarchy (ink/body/muted/muted-soft) carry structure.
- Use monospace font on any surface showing API data.
- Keep radius ≤ 12px.

### Don't
- Don't add shadows. Not even subtle ones.
- Don't use colored backgrounds for panels.
- Don't use font-weight above 600.
- Don't use the accent on decorative elements. Accent = action only.
- Don't animate layout. Only opacity and scale transitions.
- Don't introduce a second accent color. One orange. That's it.

---

## Implementation Notes (Tailwind v4)

Tokens registered via `@theme inline` in `src/index.css`. Custom tokens (`canvas`, `ink`, `hairline`, etc.) coexist with shadcn compat layer (`background`, `foreground`, `card`, etc.).

Font loading: Inter via system stack, JetBrains Mono via `@fontsource-variable/jetbrains-mono`.

All `dark:` prefixes removed — single light theme only. The `@custom-variant dark` declaration is retained for future dark mode support but currently unused.
