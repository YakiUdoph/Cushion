# CUSHION Implementation Roadmap

## Phase 1A — implemented read foundation

- EIP-1193 wallet connection and Shannon switching.
- Verified RPC health with transport-only fallback.
- Dynamic DreamDEX Event Contract discovery and asset/window registry.
- Live four-sided book read and NO-side depth.
- Bigint Light/Balanced/Maximum modeling.
- Estimated versus maximum authorized cost preview.
- Read-only wallet position discovery and authoritative WATCH derivation.
- Honest loading, empty, degraded, and failure states.

## Review items before Phase 1B

- Validate plan allocation policy and maximum-price buffer with product/risk review.
- Confirm live venue/operator policy remains operator 2 or replace it with an authoritative venue registry.
- Add quote refresh intervals and stale-age policy.
- Resolve SDK portfolio fill history’s documented recycled-pool cost-basis gap before showing actual cost/PnL.
- Complete browser/device responsive QA and accessibility audit.

## Phase 1B — not started

Future writes require exact unsigned-call construction, identity binding, independent byte-identical simulation, explicit authorization, bounded approval policy, pre-send refresh, one-time broadcast, and authoritative DreamDEX event/position verification. Winning/void redemption remains unverified and must retain that label.
