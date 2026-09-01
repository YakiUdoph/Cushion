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

## Phase 1B — implemented, live broadcast not exercised by automation

- Connected-wallet Shannon chain enforcement and account-change invalidation.
- Wallet-scoped collateral balance and BinaryPool allowance reads.
- Exact finite approval construction, independent simulation, explicit wallet authorization, receipt verification, and allowance re-read.
- BUY_NO IOC call construction with YES-wire price mapping and fixed maximum collateral bound.
- Pre-authorization market identity, nonce, expiry, book, balance, and allowance refresh.
- Byte-identical order simulation and wallet handoff.
- Authoritative full-fill, partial-fill, no-fill, owner, price, spend, and owned-NO verification.
- Verified local execution metadata and live portfolio refresh.
- Central pre-approval/pre-simulation/pre-signing freshness gate, 30-second quote invalidation, and a documented 10-minute safe execution threshold.
- Explicit market-rollover refresh that invalidates the prior pool, quote, simulation, and allowance assumptions.

Automated validation never invokes a wallet or broadcasts a transaction. A manual dedicated-testnet-wallet exercise remains the final live UX proof. Winning/void redemption remains unverified and outside this phase.
