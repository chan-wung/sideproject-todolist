---
omd: 0.1
brand: parkchanwung Todo List
bootstrapped_from: toss
bootstrapped_at: 2026-06-15
---

<!-- omd:unresolved: color.primary-intent — Toss UI primary is #3182f6 (blue500). This project uses #0064FF (Toss brand blue) as the UI interactive color. This is intentional: the UI was tuned for a richer, more saturated blue on web canvas. If you want to realign to TDS Mobile canonical, set $main-color: #3182f6 in _variables.scss. -->

# Design System — parkchanwung Todo List

## 1. Visual Theme & Atmosphere

A personal productivity tool built on calm, minimal principles inspired by Toss — the Korean fintech super-app. The canvas is pure white (`#ffffff`) with a light grey surface (`#F2F4F6`) as the page background, creating a clear card-lifts-from-page depth without heavy shadow drama. The primary interactive blue (`#0064FF`) is used exclusively for CTAs, active states, and selection highlights.

The atmosphere is clean and focused. Cards have 16px radius corners and single-layer shadows. Typography runs on Pretendard — Korea's most readable sans-serif — in three weights (400, 600, 700). No decorative elements, no illustrations, no gradients on functional surfaces.

**Key characteristics:**
- Todo Blue (`#0064FF`) as the single interactive accent — all tappable/clickable elements
- Pretendard with Korean-Latin balance, 400/600/700 weight discipline
- `#F2F4F6` page background creates depth without shadows on cards
- Priority indicated by left border only (3px colored stripe), not background fills
- Segmented controls use neutral grey container + white active pill (iOS-style)

## 2. Color Palette & Roles

### Primary
- **Todo Blue** (`#0064FF`): Primary interactive color — buttons, links, active tabs, toggle states, focus rings.
- **Blue Hover** (`#0050CC`): Pressed/hover state for blue elements.
- **Blue Light 5** (`#EBF3FF`): Informational surface — subtle tinted backgrounds, category chips.
- **Blue Light 10** (`#D2E5FF`): Stronger blue tint — active item backgrounds.
- **Blue Light 20** (`#A6C8FF`): Medium blue tint — hover fills, selected badges.

### Neutral
- **Dark Charcoal** (`#191F28`): Primary heading text. Warm near-black.
- **Body** (`#4E5968`): Default body text (maps to Toss grey700).
- **Muted** (`#8B95A1`): Placeholder, caption, secondary labels.
- **Surface** (`#F2F4F6`): Page background.
- **White** (`#FFFFFF`): Card background, input background.

### Border
- **Border Default** (`#E5E8EB`): Card borders, input borders, dividers.
- **Border Strong** (`#D1D6DB`): Emphasized borders, active input outline.

### Semantic
- **Error Red** (`#E52E2C`): Destructive actions, overdue indicators, error states.
- **Success Green** (`#11AE5B`): Completion indicators.
- **Warning Yellow** (`#FFB904`): Medium priority, caution states.

### Dark Mode
- Background: `#0D0D0D` | Card: `#1C1C1E` | Border: `#2C2C2E`
- Blue tints: 5% `#001A40` | 10% `#002966` | 20% `#003D99`

## 3. Typography Rules

### Font Family
- **Primary**: `"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- **Secondary (brand accent)**: `"GmarketSans"` — used only for special accent text, never body

### Type Scale (Pretendard)

| Role | Size | Weight | Use |
|---|---|---|---|
| App Title | 28px / 2.8rem | 700 | Todo List main heading |
| Section Header | 20px / 2rem | 700 | Section titles, modal headers |
| Card Title | 18px / 1.8rem | 700 | Todo item text |
| Subtitle | 16px / 1.6rem | 600 | Navigation, list headers |
| Body | 14px / 1.4rem | 400 | Standard UI text, descriptions |
| Body Small | 13px / 1.3rem | 400 | Metadata, secondary labels |
| Caption | 12px / 1.2rem | 400 | Timestamps, fine print |
| Badge | 11px / 1.1rem | 700 | Priority badges, category chips |

### Principles
- **Three weights, full discipline**: 400 (body), 600 (emphasis/navigation), 700 (headings/amounts)
- **Letter spacing**: -0.5px on display headings only; normal elsewhere
- **Line height**: 1.5 for body, 1.3-1.4 for headings
- **rem base**: 10px (`$font_size_base: 10px`) — 1.4rem = 14px

### SCSS mixin usage
Always use `@include font(size, weight)` — never `font-size` or `font-weight` directly:
```scss
@include font(14);           // 1.4rem, Regular 400
@include font(18, "Bold");   // 1.8rem, 700
@include font(13, "Medium"); // 1.3rem, 500
```

## 4. Component Stylings

### Buttons

**Primary (`.btn--main`)**
- Background: `#0064FF`
- Text: `#ffffff`
- Border: none
- Radius: 8px
- Padding: 0 20px
- Font: 14px / 600
- Hover: `darken(#0064FF, 8%)`
- Use: Add todo, confirm actions

**Outline Gray (`.btn--outline-gray`)**
- Background: transparent
- Text: `var(--txt-color-base)`
- Border: 1px solid `var(--color-border)`
- Radius: 8px
- Use: Cancel, secondary actions

**Size modifiers**: `--sm` (height 34px, 13px), `--lg` (height 52px, 16px)

### Inputs (`.todo-input__field`, `.form-item__input`)
- Height: 45px
- Border: 1px solid `#E5E8EB`
- Radius: 8px
- Padding: 0 15px
- Font: 14px / 400
- Placeholder: `#8B95A1`
- Focus: border `#0064FF`, no box-shadow fill
- Background: `#ffffff`

### Cards (`.todo-item`)
- Background: `#ffffff`
- Border: none (shadow defines edge)
- Border-left: 3px solid (priority color indicator only)
- Radius: 16px
- Padding: 16px 20px
- Shadow: `0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)`
- Hover shadow: `0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)` + `translateY(-1px)`

**Priority left borders:**
- High: `#E52E2C`
- Medium: `#FFB904`
- Low: `#11AE5B`

**Pinned card:**
- Border-left: `#0064FF`
- Shadow: `0 1px 3px rgba(#0064FF, 0.12), 0 4px 16px rgba(#0064FF, 0.16)`

### Badges / Chips
- Radius: 100px (pill)
- Padding: 3px 9px
- Font: 11px / 700
- Priority badge colors inherit from semantic palette (light bg + dark text)
- Category chip: `#EBF3FF` bg + `#0064FF` text

### Segmented Controls (tabs, sort)
- Container: `rgba(0,0,0,0.07)` background, 10px radius, 3px padding
- Inactive: transparent background, grey text
- Active: `#ffffff` background, `#0064FF` text, `0 1px 4px rgba(0,0,0,0.12)` shadow
- Transition: background-color, box-shadow, color

### Modals / Dialogs
- Background: `#ffffff`
- Radius: 16px
- Padding: 28px 24px
- Shadow: `0 20px 60px rgba(0,0,0,0.2)`
- Backdrop: `rgba(0,0,0,0.5)`

### Toasts
- Background: `#191F28` (dark charcoal for info) or white with red border for error
- Error toast: white bg, `lighten($red, 25%)` border, red left accent 4px

## 5. Layout Principles

### Spacing (8px base unit)
- xs: 4px | sm: 8px | md: 12px | base: 16px | lg: 20px | xl: 24px | xxl: 32px

### Container
- Max-width: 960px, centered
- Page padding: 20px horizontal, 20px top, 60px bottom
- Card gap: 8px between todo items

### Horizontal padding
- App content: 16-20px
- Card internal: 20px horizontal

### Depth philosophy
Cards sit on `#F2F4F6` grey. White cards on grey background creates natural depth. Shadow is minimal — trust comes from clarity, not elevation drama.

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Page background, inline text |
| Subtle | `0 1px 3px rgba(0,0,0,0.05)` | Resting cards |
| Standard | `0 2px 8px rgba(0,0,0,0.08)` | Input form, elevated cards |
| Elevated | `0 4px 12px rgba(0,0,0,0.12)` | Scroll-top button, dropdowns |
| Modal | `0 20px 60px rgba(0,0,0,0.20)` | Dialogs, sidebars |

No colored shadows except for pinned items (blue tinted) and destructive elements (red tinted).

## 7. Do's and Don'ts

### Do
- Use `#0064FF` for all interactive elements — only where user can click
- Use `border-left: 3px solid` for priority — never background color on resting cards
- Use `rgba(0,0,0,0.07)` grey for segmented control containers
- Use white active pill + shadow for active tab state
- Use Pretendard 400/600/700 only
- Use `@include font()` mixin — never raw `font-size` / `font-weight`
- Use `var(--color-white)`, `var(--color-bg)` CSS vars for dark mode support
- Use `$main-color` SCSS var for blue; avoid hardcoding `#0064FF` in components

### Don't
- Don't use `--color-main-5` blue tint as tab/sort container backgrounds — use grey `rgba(0,0,0,0.07)`
- Don't add box-shadow to resting state borders — choose one: border OR shadow
- Don't use `!important` except in utility classes
- Don't add background fills to todo cards for priority — left border only
- Don't use `font-size` or `font-weight` directly in SCSS components
- Don't use GmarketSans for body/UI text — Pretendard only for UI
- Don't add decorative elements: no gradients, illustrations, or multi-color palettes
- Don't use `border-left-width: 4px` on cards — use 3px

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Changes |
|---|---|---|
| Mobile | < 768px | Single column, reduced padding |
| Tablet | 768px–1199px | Side-by-side groups possible |
| Desktop | ≥ 1200px | Max-width 960px centered |

### Sticky Behavior
- Todo input: `position: sticky; top: 16px; z-index: 100` — sentinel div triggers scroll-top button
- Scroll-top button: appears when input leaves viewport (IntersectionObserver)

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: `#0064FF`
- CTA Hover: `#0050CC`
- Page Background: `#F2F4F6`
- Card Background: `#FFFFFF`
- Heading text: `#191F28`
- Body text: `#4E5968` (use `var(--txt-color-base)`)
- Caption / muted: `#8B95A1`
- Placeholder: `#8B95A1`
- Border: `#E5E8EB`
- Priority High: `#E52E2C` | Medium: `#FFB904` | Low: `#11AE5B`

### SCSS Variables in `_variables.scss`
```scss
$main-color: #0064FF;
$main-color5:  #EBF3FF;
$main-color10: #D2E5FF;
$main-color20: #A6C8FF;
$font_color: #191F28;
$font_form_color: #8B95A1;
$border_color: #E5E8EB;
```

### File Structure
```
src/styles/
  abstracts/  _variables.scss, _mixins.scss, _icons.scss, _icons_new.scss
  base/       _reset.scss, _typography.scss, _accessibility.scss, _utilities.scss
  components/ _todo.scss, _quick-memo.scss, _sidebar.scss, _button.scss,
              _form.scss, _date-picker.scss, _quick-nav.scss, _due-summary.scss
  main.scss   (import order matters: variables → icons → mixins → icons_new → base → components)
```

### Example component patterns
- Todo card: white bg, `border-left: 3px solid $priority-color`, `border-radius: 16px`, shadow subtle
- Active tab: white pill on `rgba(0,0,0,0.07)` grey container, `box-shadow: 0 1px 4px rgba(0,0,0,0.12)`
- Badge: `border-radius: 100px`, `padding: 3px 9px`, 11px/700

## 10. Voice & Tone

Calm, direct, practical. This is a tool used in real work — voice reflects that: short Korean labels, no emoji in task text, no hype copy. Errors explain exactly what went wrong and what to do. Empty states offer one action.

| Context | Tone |
|---|---|
| Button labels | Short Korean verb (`추가`, `저장`, `삭제`) |
| Placeholder | Guiding, not demanding (`예: 업무, 개인...`) |
| Error / toast | Specific one-line message, no `오류가 발생했습니다` |
| Empty state | One sentence why, one action button |
| Confirmation | Question form + `삭제할까요?`, not `정말 삭제하시겠습니까?` |

## 11. Brand Narrative

<!-- omd:limitation Reference §11 requires project-specific facts. Replace before shipping; do not fabricate. -->

[FILL IN: parkchanwung의 개인 프로젝트. 회사 업무와 개인 할 일을 동시에 관리하기 위한 생산성 도구. 시작 시점, 핵심 thesis 한 문장 추가 권장.]

## 12. Principles

1. **UI Blue is interaction-only.** `#0064FF` appears where the user can click. Never on decorative borders, illustrations, or headings.
2. **Priority speaks through the left border.** The 3px left stripe is the only priority signal on resting cards. No background fills for priority on default state.
3. **Segmented controls are grey, not blue.** Tab and sort containers use neutral `rgba(0,0,0,0.07)` — blue would make them look like actions instead of controls.
4. **One shadow per surface.** Cards have shadow; borders removed. Inputs have borders; shadow removed. Never both.
5. **Dark mode via CSS variables.** All colors reference `var(--color-*)` or `var(--txt-color-*)`. Never hardcode hex in components.
6. **Font via mixin only.** `@include font(size, weight)` everywhere — no raw `font-size` or `font-weight` in component SCSS.
7. **Accessibility first.** Buttons always have `type="button"`. Icon-only buttons always have `aria-label`. Decorative content has `aria-hidden="true"`.

## 13. Personas

<!-- omd:limitation Reference §13 requires project-specific personas. Replace before shipping; do not fabricate. -->

[FILL IN: 실제 사용 시나리오 기반 페르소나 추가 권장. 예: 회사 업무 목록 관리하는 개발자, 개인 일정 추적하는 직장인 등]

## 14. States

| State | Treatment |
|---|---|
| **Empty (no todos)** | 한 줄 안내 텍스트 (`#8B95A1`), 입력 폼으로 포커스 유도. 일러스트/이미지 없음 |
| **Loading** | 없음 — localStorage는 동기 읽기, 로딩 상태 불필요 |
| **Error (import)** | 토스트 메시지로 구체적 실패 이유 표시 |
| **Completed item** | `opacity: 0.65`, 텍스트에 `line-through`. 고의적으로 흐리게 — 완료된 것은 뒤로 물러남 |
| **Overdue item** | `background: lighten($red, 46%)`, `border-left: $red` — 경고 없이 조용하게 강조 |
| **Pinned item** | `border-left: $main-color`, 파란 tinted shadow — 같은 카드, 다른 아우라 |
| **Disabled** | `opacity: 0.5`, `pointer-events: none` |

## 15. Motion & Easing

| Token | Duration | Use |
|---|---|---|
| instant | 0ms | Checkbox toggles |
| fast | 150ms | Hover, focus ring |
| standard | 250ms | Card hover lift, tab switch |
| slow | 350ms | Scroll-top button fade, modal open |

**Easing**: `ease` (all.3s) as default via `@include transition()`. No spring/bounce except scroll-top button `translateY(-2px)` on hover.

**Scroll-top button**: `position: fixed; right: 24px; bottom: 24px`. Appears via `IntersectionObserver` when todo input leaves viewport. Hover: `translateY(-2px)` + darker blue.

**Card hover**: `translateY(-1px)` + shadow increase over 250ms `ease`.

No reduce-motion override implemented yet — add `@media (prefers-reduced-motion: reduce)` to suppress transforms if needed.
