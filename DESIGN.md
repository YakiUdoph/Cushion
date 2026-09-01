# CUSHION Design System

> **Approved Phase 1B visual addendum (2026-08-31):** The premium dual-theme visual-upgrade brief supersedes the earlier light-only, no-violet, no-dark-theme restrictions below. CUSHION now uses a restrained violet-to-blue-to-cyan signal system, premium light and deep-navy dark themes, atmospheric code-native backgrounds, and reduced-motion-safe ambient effects. The original editorial hierarchy, product-led composer, truthful live data, semantic state colors, and accessibility requirements remain binding.

**Status:** Proposed — approval required before frontend implementation  
**Reference:** Adapted from the attached ORYZO visual and structural reference. CUSHION borrows its discipline, editorial composition, negative space, structural hairlines, object focus, restrained containers, and deliberate rhythm. It does **not** copy ORYZO branding, imagery, wording, uppercase treatment, brown/orange palette, or dark theme.

## 1. Product and Design Intent

CUSHION is a consumer financial product for BTC and ETH holders who want to understand short-duration downside protection without selling the assets they still want to hold. The interface should make a potentially stressful financial decision feel composed, legible, and controlled.

The experience is **light-first financial editorial**: closer to premium wealth-management software and an art-directed financial publication than a trading terminal, crypto dashboard, or AI/SaaS landing-page template. The product interaction—not decorative illustration—should be the primary object of attention.

> **Design promise:** show the user what they are exposed to, what they are worried about, and what the available tradeoffs may be before asking them to authorize anything.

### Principles adapted from the ORYZO reference

| Adapted principle | CUSHION interpretation |
| --- | --- |
| Editorial composition | Use strong left-aligned statements, asymmetrical columns, and intentional pauses between product explanations. |
| Generous negative space | Give the intent composer and major financial claims room to breathe; do not fill every region with cards or metrics. |
| Minimal UI chrome | Keep navigation short, quiet, and secondary to the product outcome. |
| Restrained containers | Use containers only when they clarify a comparison, interpretation, or action boundary. |
| Hairline structure | Use subtle 1px rules, trace lines, and sparse ticks to establish sequence and hierarchy. |
| Object-focused storytelling | Treat the intent composer and protection plan comparison as the visual objects of the page. |
| Deliberate rhythm | Alternate denser instrument sections with spacious editorial sections. |
| Minimal elevation | Prefer contrast, borders, spacing, and surface changes over drop shadows. |

## 2. Visual Direction

The visual direction is **Calm Exposure**: a warm-white canvas, crisp charcoal type, cool-gray instrument surfaces, and one cool cyan protection signal. The interface should feel precise without feeling clinical; premium without feeling luxurious; modern without feeling futuristic for its own sake.

The page has two visual modes. **Editorial mode** uses open light space, large charcoal statements, and sparse separators. **Instrument mode** uses contained pale-gray or white surfaces for the intent composer, interpretation values, plan comparisons, and lifecycle steps. Instrument mode is compact and exact; editorial mode is spacious and declarative.

The visual system must not resemble a generic analytics dashboard. CUSHION does not lead with charts, market tickers, wallet balances, performance statistics, fake social proof, or live-looking blockchain identifiers.

## 3. Color System

CUSHION uses a neutral-first palette. Cyan is a semantic signal, not a decorative wash. The palette is intentionally narrow so that state meaning remains clear.

| Token | Value | Role |
| --- | --- | --- |
| `--color-canvas` | `#F7F9FA` | Primary warm-white page background. |
| `--color-canvas-warm` | `#FBFCFC` | Soft alternate section background. |
| `--color-surface` | `#FFFFFF` | Intent composer, comparison rows, and contained instrument surfaces. |
| `--color-surface-cool` | `#F0F4F5` | Editorial section plane and cool-gray contrast surface. |
| `--color-surface-raised` | `#E8EFF1` | Subtle selected/hover support surface; use sparingly. |
| `--color-ink` | `#18252D` | Primary headings and high-emphasis financial values. |
| `--color-ink-soft` | `#425760` | Body copy, descriptions, and secondary labels. |
| `--color-ink-muted` | `#71838A` | Microcopy, metadata, and structural labels. |
| `--color-line` | `#DCE5E8` | Default hairline border and structural separator. |
| `--color-line-strong` | `#C1D1D6` | Input borders, active outlines, and stronger boundaries. |
| `--color-protection` | `#1599B4` | Primary CUSHION protection accent; active intent, selected plan, flow signal, and links. |
| `--color-protection-soft` | `#E0F6F9` | Quiet selected-state surface and protection callout background. |
| `--color-protection-cta` | `#55CFE5` | Filled primary CTA background with dark readable text. |
| `--color-success` | `#1C9B64` | Protected, recommended, or completed state only. |
| `--color-success-soft` | `#E6F6EF` | Very light successful/protected state background. |
| `--color-risk` | `#C24C55` | Downside, risk, or destructive meaning only. |
| `--color-risk-soft` | `#FFF0F1` | Very light downside/risk support surface. |
| `--color-footer` | `#1B3038` | Optional deep footer plane for closure and contrast; not the primary page canvas. |

### Color rules

Cyan may appear on a primary action, a focused field, a selected protection plan, a protection-flow node, or an active link. It should not be used to tint every border, heading, or section. Green must never be used as a generic “good-looking” accent; it means protected, recommended, or successfully completed. Red/coral must never be used as a brand accent; it means downside, risk, or destructive action. Do not introduce purple, orange, yellow, rainbow gradients, or crypto-neon color treatments.

## 4. Typography

Typography carries the strongest brand signal. Use a confident contemporary sans-serif with excellent numerals and a human reading texture. The recommended family is **Manrope** for display, interface, and financial values, with **IBM Plex Mono** reserved for compact instrumentation and compliance-adjacent metadata.

| Role | Family | Weight | Size | Line height | Use |
| --- | --- | ---: | ---: | ---: | --- |
| Display | Manrope | 700 | `clamp(44px, 5vw, 68px)` | `1.04` | Primary hero statement; sentence case, not all caps. |
| Editorial heading | Manrope | 700 | `clamp(36px, 4.4vw, 60px)` | `1.04` | Major section statements. |
| Section heading | Manrope | 700 | `32–48px` | `1.08` | Supporting section introductions. |
| Instrument heading | Manrope | 600 | `24–34px` | `1.15` | Composer and product-module headings. |
| Body | Manrope | 400–500 | `15–18px` | `1.55–1.7` | Explanatory copy and product descriptions. |
| UI label | IBM Plex Mono | 500 | `9–11px` | `1.35` | Field labels, section kickers, state labels, and units. |
| Financial value | Manrope | 700 | `14–18px` | `1.1` | Exposure, budget, cost, and modeled offset. Use tabular numerals. |
| Legal | IBM Plex Mono | 400 | `10–11px` | `1.5` | Experimental-product and risk disclaimers. |

Headings use sentence case or intentional short phrases. Do not make the entire interface uppercase. Use normal letter spacing for display type; only instrumentation labels may use modest tracking around `0.08–0.12em`. Financial values must use `font-variant-numeric: tabular-nums` so columns align and comparisons feel trustworthy.

## 5. Spacing System

Spacing should create visual rhythm rather than merely separate components. Use a 4px base with a small set of intentional jumps.

| Token | Value | Typical use |
| --- | ---: | --- |
| `--space-1` | `4px` | Icon-to-label micro-gap. |
| `--space-2` | `8px` | Label-to-value, compact list gaps. |
| `--space-3` | `12px` | Control padding, metadata gaps. |
| `--space-4` | `16px` | Default internal rhythm. |
| `--space-5` | `20px` | Small content separation. |
| `--space-6` | `24px` | Card padding and primary gap. |
| `--space-8` | `32px` | Group separation. |
| `--space-10` | `40px` | Section sub-rhythm. |
| `--space-12` | `48px` | Major component separation. |
| `--space-16` | `64px` | Compact section padding. |
| `--space-20` | `80px` | Mobile section padding / desktop sub-section. |
| `--space-24` | `96px` | Desktop section padding. |
| `--space-32` | `128px` | Large editorial pause. |
| `--space-40` | `160px` | Hero or major statement breathing room. |

Desktop content uses a maximum reading width of approximately `1280px` with `24–32px` side gutters. The hero should feel open rather than centered inside a small marketing container. Editorial sections may use a narrower text measure of `560–700px`; body copy should not span the full viewport.

## 6. Border-Radius Rules

Radius is a controlled vocabulary, not a default decoration.

| Element | Radius |
| --- | ---: |
| Text inputs and textareas | `8px` |
| Instrument containers | `12px` |
| Large intent composer | `16px` |
| Small status badge | `999px`, only for compact state labels |
| Primary buttons | `8px` |
| Secondary outline buttons | `8px` |
| Decorative geometry | `0–50%` only when the geometry itself requires it |

Do not use large pill-shaped buttons, rounded section blocks, or mixed arbitrary radii. A rounded shape should communicate control, state, or a contained instrument—not friendliness for its own sake.

## 7. Buttons and Interaction States

There should be one dominant filled CTA per primary action area. Filled CTAs use `--color-protection-cta` with `--color-ink` text. Secondary actions are text links or restrained outlined buttons. The page should not become a sequence of competing filled controls.

| Component | Default | Hover | Focus | Pressed | Disabled/loading |
| --- | --- | --- | --- | --- | --- |
| Primary CTA | Cyan fill, dark text, 8px radius. | Slightly lighter cyan and a restrained 1px cyan outline. | 2px protection ring with 3px offset. | `scale(.98)` for 120–160ms. | Lower contrast; loading uses a small inline spinner and preserves button width. |
| Text action | Charcoal text with a thin underline. | Protection cyan text and underline. | Visible 2px outline around the text target. | Underline remains; no large movement. | Muted text and `aria-disabled` when applicable. |
| Outline action | Transparent white/canvas surface, 1px line, charcoal text. | Line shifts to protection cyan. | Protection ring plus line remains visible. | Subtle `scale(.98)`. | Muted border and text. |
| Selectable plan row | White surface, hairline border. | Cool-gray surface and stronger line. | 2px protection ring. | No layout jump. | Not applicable unless data is unavailable. |

All clickable controls need at least a `44px` touch target. Focus must be visible without relying on color alone. Placeholder actions should explain that the associated destination or integration is forthcoming rather than pretending to work.

## 8. Cards and Containers

CUSHION uses **instrument containers**, not a card grid. A container exists only when it creates a clear boundary around user input, a comparison, a lifecycle step, or a future-state module.

The intent composer is the primary container: white, lightly bordered, and gently elevated with a small, soft shadow. Plan options are comparison rows rather than three identical floating cards. Editorial copy can sit directly on the page plane without a container. Lifecycle steps may use compact bordered modules, but their connecting sequence should remain visible.

Use one surface, one border, and one clear hierarchy per container. Avoid cards within cards, oversized glowing cards, decorative gradients, frosted glass, heavy blur, and shadow stacks. Elevation should be communicated through surface contrast and a single restrained shadow at most:

```css
--shadow-instrument: 0 12px 30px rgba(36, 69, 79, 0.08);
```

## 9. Navigation

The header is quiet and functional. It should not look like a crypto wallet connection bar.

Desktop navigation contains the CUSHION wordmark at left, four short links in the center/right, and one filled `Launch CUSHION` action at the far right. Recommended links are **How it works**, **Protection**, **Developers**, and **Roadmap**. Use sentence case. The header may be sticky with a warm-white translucent background and a 1px bottom rule, but it must remain visually opaque enough to guarantee text contrast when content scrolls beneath it.

On mobile, links collapse behind a compact menu control with an accessible label and `aria-expanded` state. The menu should be a light surface with a thin border, not a dark drawer. Tapping an anchor closes the menu. The primary composer CTA remains easy to find and reachable with one thumb.

## 10. Imagery and Visualization Direction

CUSHION is product-led rather than image-led. The primary visual object is the **intent composer**, followed by the plan comparison and lifecycle flow. Avoid stock photography, crypto coins, trading candlesticks, abstract neon blobs, and generic “AI” visual metaphors.

If imagery is used, it should be an extremely subtle cool-neutral material or architectural texture with generous text-safe space. Imagery must support the product’s sense of calm and protection without becoming the subject. Any generated background should be low contrast, free of text, and subordinate to real HTML typography and controls.

Visualization should be explanatory, not speculative. Use a simple signal trace, protection field, or measured flow to explain the movement from **Exposure → Intent → Protection Plan → Review**. Do not add a chart just because the product concerns markets. Never show fake live pricing, wallet positions, returns, TVL, user counts, blockchain IDs, or performance statistics.

The CUSHION glyph may recur as a small segmented orbital mark in the wordmark, composer details, selected plan states, and lifecycle nodes. It should be quiet and ownable, not a repeated decorative watermark.

## 11. Motion Principles

Motion communicates state and control. Use CSS transitions primarily on `transform`, `opacity`, border color, and box-shadow. Keep interaction transitions between `120–220ms` with a confident ease-out. A composer loading state may last long enough to communicate evaluation, but should not block the entire page.

Recommended motion language includes a small signal-node activation when the composer is submitted, a subtle selected-plan state transition, and a restrained field-line drift only when it improves orientation. Do not use continuous background animation, spinning coins, pulsing neon, scroll-jacking, or excessive entrance choreography.

All nonessential motion must be disabled or significantly reduced under `prefers-reduced-motion: reduce`. The interface must remain understandable and complete when motion is absent.

## 12. Responsive Behaviour

Responsive design changes hierarchy; it does not simply stack desktop cards.

| Breakpoint | Behaviour |
| --- | --- |
| `320–374px` | Single-column composer-first flow; compact 16px page gutters; plan values wrap under plan name; no horizontal overflow; menu and CTA targets remain at least 44px. |
| `375–639px` | Hero copy remains above the composer; editorial statements use 34–40px type; lifecycle becomes a two-column node grid or clear vertical sequence. |
| `640–767px` | Preserve generous breathing room while keeping the composer and plan comparison full width; use a two-column steps flow where readable. |
| `768–1023px` | Collapse navigation; maintain a two-column hero when the composer has enough width; reduce section gaps before reducing type. |
| `1024–1279px` | Desktop navigation returns; keep a balanced hero with a readable composer and prevent plan values from colliding. |
| `1280px+` | Use the full editorial composition, visible signal spine, broad negative space, and asymmetric text-to-instrument relationships. |

At every width, the text composer is the easiest element to use. Textareas must remain readable, plans must preserve label/value association, no content may rely on hover, and no page-level horizontal scrolling is permitted.

## 13. Accessibility Rules

Use semantic landmarks and a single logical heading hierarchy. The page should have one `h1`, followed by section `h2` headings and component-level `h3` headings. Navigation must be a real `nav`; plan options should use buttons with `aria-pressed` or an equivalent selected-state model; the textarea needs a visible or screen-reader label.

Maintain WCAG-conscious contrast for body text, labels, focus rings, and disabled states. Never use color alone to communicate risk or protection: pair coral with the word **Downside** and an icon or directional cue; pair green with **Protected**, **Recommended**, or a comparable explicit label.

Support keyboard navigation in DOM order. Focus indicators must be visible on links, buttons, plan rows, menu controls, and the composer. Respect reduced motion, avoid focus traps in the mobile menu, and ensure all touch targets are comfortably tappable.

## 14. Do / Don’t Rules

### Do

- Use light mode as the default and keep the dominant impression warm white, charcoal, and cool gray.
- Let the intent composer act as the page’s primary visual object.
- Use sparse hairline separators and a measured protection signal to explain structure.
- Use sentence case for marketing copy and interface labels.
- Use tabular numerals and clear labels for financial values.
- Make illustrative states unmistakably illustrative and never imply live integrations.
- Use a limited number of filled CTAs and keep secondary actions quiet.
- Keep the interface calm, direct, and financially literate.

### Don’t

- Do not use ORYZO’s logo, product imagery, wording, brown/orange palette, dark theme, or all-uppercase treatment.
- Do not use a dark crypto-terminal canvas, neon effects, glowing blobs, or rainbow palettes.
- Do not fill the page with interchangeable rounded cards or dashboard widgets.
- Do not use giant pill buttons, excessive gradients, glassmorphism, or heavy shadows.
- Do not add charts, live-looking data, fake testimonials, fake metrics, or invented blockchain details.
- Do not imply insurance, guaranteed portfolio protection, automatic trading, or a guaranteed floor.
- Do not use green as a general brand accent or red as decoration.
- Do not rely on tiny, thin, low-contrast labels that fail on mobile.

## 15. Design Tokens

```css
:root {
  /* Colors */
  --color-canvas: #f7f9fa;
  --color-canvas-warm: #fbfcfc;
  --color-surface: #ffffff;
  --color-surface-cool: #f0f4f5;
  --color-surface-raised: #e8eff1;
  --color-ink: #18252d;
  --color-ink-soft: #425760;
  --color-ink-muted: #71838a;
  --color-line: #dce5e8;
  --color-line-strong: #c1d1d6;
  --color-protection: #1599b4;
  --color-protection-soft: #e0f6f9;
  --color-protection-cta: #55cfe5;
  --color-success: #1c9b64;
  --color-success-soft: #e6f6ef;
  --color-risk: #c24c55;
  --color-risk-soft: #fff0f1;
  --color-footer: #1b3038;

  /* Typography */
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --text-display: clamp(44px, 5vw, 68px);
  --text-editorial: clamp(36px, 4.4vw, 60px);
  --text-section: clamp(32px, 3.7vw, 48px);
  --text-instrument: clamp(24px, 2.4vw, 34px);
  --text-body: 16px;
  --text-label: 10px;
  --leading-display: 1.04;
  --leading-editorial: 1.04;
  --leading-body: 1.62;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
  --space-40: 160px;

  /* Shapes and elevation */
  --radius-input: 8px;
  --radius-container: 12px;
  --radius-composer: 16px;
  --radius-status: 999px;
  --border-hairline: 1px solid var(--color-line);
  --shadow-instrument: 0 12px 30px rgba(36, 69, 79, 0.08);
  --shadow-focus: 0 0 0 3px rgba(21, 153, 180, 0.14);
  --ease-out: cubic-bezier(.23, 1, .32, 1);
  --duration-fast: 140ms;
  --duration-standard: 190ms;
}
```

## Approval Gate

This document is the proposed CUSHION design system. **Do not write or modify frontend implementation until the user approves this direction.** After approval, implementation should begin by translating these tokens into the global stylesheet and then composing the landing page around the intent composer, editorial sections, and restrained instrument containers.
