# CUSHION Light-First Redesign

- [x] Replace the dark theme tokens with a warm white / light neutral canvas, charcoal typography, cool-gray surfaces, and thin borders.
- [x] Rework the header, hero, composer, plan selector, editorial sections, lifecycle, roadmap teaser, and footer for premium light-first contrast.
- [x] Remove dark glass, neon glow, and heavy shadow treatments while preserving restrained cyan protection semantics.
- [x] Update interaction states, focus rings, risk/protected colors, and disabled/loading states for the light theme.
- [x] Validate at 320px, 390px, 768px, 1024px, and 1440px, including overflow and navigation behavior.
- [ ] Save a checkpoint and deliver the revised project.

## Completed

- [x] Restored the last stable frontend after the accidental capability setup attempts.
- [x] Confirmed the light-first redesign direction from the user brief.
- [x] Preserved the existing landing-page information architecture and product-preview disclaimers.

- [x] Validate the light-first redesign at 1024px and confirm hero, header, and plan layouts remain readable with no overflow.
- [x] Test the mobile navigation in the light-first redesign by verifying the open/close state, anchor links, placeholder action, roadmap link, and composer CTA handlers in source.
- [x] Explicitly verify no horizontal overflow at 320px and 390px in the light-first redesign using responsive full-page captures and the global overflow guard.

## Validation Evidence

The 1024px full-page capture was reviewed: the hero, header, intent composer, and plan rows remain readable with no visible clipping or horizontal overflow. At the mobile breakpoint, the rendered menu toggle changed `aria-expanded` from `false` to `true`, exposed the three anchor links plus the developer and composer actions, and returned to `false` with the menu removed after the second toggle. The rendered document reported `scrollWidth <= innerWidth` during the mobile check.
