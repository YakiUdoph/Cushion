# CUSHION — Landing-Page Design Direction

## Three Initial Directions

| Theme Name | Very Brief Intro | Probability |
| --- | --- | ---: |
| Signal Room | A dark, calm financial operations room where structured data and quiet signal light create confidence under pressure. The product interface carries the visual drama. | 0.07 |
| Insulated Ledger | A tactile editorial-finance system with paper-like warmth and constructed columns, making protection feel considered rather than speculative. | 0.04 |
| Northern Instrument | A cool, architectural digital instrument built from deep navy glass, icy-blue measurement lines, and sparse scientific notation. | 0.09 |

## Chosen Direction — Signal Room

### Design Movement

**Signal Room** blends editorial finance with a restrained **digital instrument-panel aesthetic**. It takes the clarity of a professional risk desk, removes the pressure and noise, and replaces trading-terminal intimidation with a composed, consumer-first explanation of protection.

### Core Principles

1. **Outcome before mechanism.** The intent composer is the visual protagonist, while Event Contracts remain clearly framed as infrastructure.
2. **Measured depth.** Navy-black surfaces, hairline borders, soft bloom, and low-contrast signal grids create dimensionality without visual clutter or heavy shadow.
3. **Calm asymmetry.** Narrow editorial copy and a wide product interaction sit on offset axes, so the site feels authored rather than template-driven.
4. **Evidence through hierarchy.** Numerical values, labels, recommendation status, and risk semantics use typography, iconography, and position—not color alone.

### Color Philosophy

The canvas is a near-black **midnight navy** so the experience feels financially serious and allows a single icy-aqua signal to carry meaning. **Cushion Cyan** is reserved for intent, active focus, and protection flow; restrained green means positive/protected states only; muted coral marks downside/risk. Pale-blue text is used for exact financial legibility, while low-contrast blue-gray lines create the sense of a controlled environment.

### Layout Paradigm

The page follows a **signal spine** rather than a conventional centered stack. A thin vertical signal trace runs through the long-form desktop composition; each section attaches to it from a different alignment. The hero combines an editorial left rail with the central intent composer, while subsequent sections alternate broad explanatory planes and compact instrument modules. On mobile, this becomes a clear top-to-bottom narrative with the trace as a small left-side accent rather than a decorative obstruction.

### Signature Elements

1. **Protection field:** a softly illuminated cyan perimeter that gathers around the intent composer, selected plan, and lifecycle flow.
2. **Signal ticks:** precise 1px scale marks and small monospaced labels that establish an instrument-like rhythm without becoming a chart.
3. **Cushion glyph:** a segmented orbital mark whose enclosing arc suggests protection around an exposed asset; it appears in the header, favicon, and micro-details.

### Interaction Philosophy

Interactions should confirm control. Focus moves receive a deliberate cyan field, buttons compress slightly on press, and inactive product links explain that the associated feature is coming soon. The text composer has a prominent, legible focus ring and its preview reads like interpretation rather than an automated trade.

### Animation

Nonessential movement remains short, sparse, and purpose-led. On initial load, editorial copy and product modules arrive in a 40–70ms stagger with a slight upward translation and fade. The protection field slowly breathes at low opacity, market-line accents use one quiet sweep, and selected-plan states shift in 180–240ms. All decorative movement disables under `prefers-reduced-motion`.

### Typography System

**Manrope** is the modern, assured sans-serif for headlines, navigation, and financial values; it has compact strength without the generic feel of Inter. **IBM Plex Mono** carries compact labels, timestamps, and numeric microcopy, giving the product an instrument-quality cadence. Headline hierarchy is 56–64px desktop / 38–44px mobile; supporting headings use 28–36px; body text is 16–18px with comfortable line-height; all key numbers use tabular figures.

### Brand Essence

**CUSHION is short-duration downside planning for BTC and ETH holders who want to remain invested without ignoring near-term risk.** Its personality is **calm, exacting, and protective**.

### Brand Voice

Headlines are direct and pressure-aware; calls to action invite a considered next action rather than hype; microcopy explains constraints plainly. Example lines: **“Name the downside you want to soften.”** and **“See the tradeoff before you authorize anything.”**

### Wordmark & Logo

The wordmark uses Manrope’s sturdy geometric forms with a separated, custom **C** motif: an open circular field with a compact inner cushion arc. The standalone logo is a bold segmented orbital protection symbol with no text, legible at favicon scale and strong at header scale.

### Signature Brand Color

**Cushion Cyan — `#7EE6FA`**. It is a cool, highly legible, ownable signal used as a protection indicator—not a blanket decoration.

## Design Tokens

| System | Token Direction |
| --- | --- |
| Canvas | `#07131E` midnight navy, with a deeper `#040B12` outer field |
| Surface hierarchy | Glass navy `#0A1B29`, raised `#0D2233`, and fine white-blue separators at 8–14% opacity |
| Accent semantics | Cushion Cyan `#7EE6FA`; protected green `#7FE2AA`; risk coral `#FF8D91`; no rainbow state palette |
| Typography | Manrope for text and numbers, IBM Plex Mono for product labels and instrumentation |
| Spacing | 4px base; 8, 12, 16, 24, 32, 48, 72, 104, 144 scale |
| Radius | 10px controls, 14px panels, 20px major composer; avoid ubiquitous rounded-card treatment |
| Borders | 1px solid white-blue at 8–14% opacity; cyan only for focus, selected, and active information |
| Motion | 120–240ms deliberate transitions; protection-field ambient motion only when reduced motion is not requested |
| Responsive rules | Composer-first at 320px; compact navigation drawer; editorial signal spine simplifies below 768px; no horizontal overflow |

## Style Decisions

The landing experience will remain interface-led. Generated imagery is used only as a subtle, original background texture and branded mark support; it will not substitute for the actual product interaction or dilute the financial clarity of the page.

The signal spine is a continuous authored instrument trace: each major desktop section attaches to a labeled trace, tick, or node rather than reading as a detached horizontal band. The Cushion glyph recurs as a low-opacity segmented orbital detail in selected product states and monitoring surfaces. Cushion Cyan remains semantic—active intent, selected protection, signal flow, and primary action—while ambient decoration remains navy glass and blue-gray measurement detail.

## Active Revision — Premium Light-First Financial Interface

The active direction supersedes the original dark Signal Room emphasis. CUSHION now uses a warm-white or very light neutral canvas, crisp charcoal typography, cool-gray surfaces, thin borders, and restrained shadows. The cyan/blue accent is reserved for protection intent, primary actions, signal flow, and selected states. Green appears only for protected or successful states; coral appears only for downside/risk. The material language is deliberately closer to wealth-management software than a trading terminal: contained instrument surfaces are bright and legible, while the page avoids dark crypto styling, excessive gradients, glassmorphism, neon effects, and oversized glowing cards.

The product interaction remains the focal point, but the composer is now a precise white instrument panel on a warm canvas rather than a dark glass module. Editorial sections use generous whitespace and stronger charcoal hierarchy; plan cards are crisp, low-radius comparison rows; and the signal spine is expressed through light blue-gray trace lines and restrained cyan nodes.
