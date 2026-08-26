# CUSHION Product Requirements Document

**Version:** 1.0
**Status:** Canonical product source of truth; Phase 1 not started
**Last updated:** 2026-08-26
**Foundation status:** Sponsor-native execution proven on Somnia Shannon; natural finalization and redemption pending

## 1. Product definition

CUSHION is a crypto downside-offset application that helps users translate a simple concern—“What happens if my crypto falls during the next few hours?”—into an understandable, bounded position using live DreamDEX Event Contracts on Somnia.

CUSHION abstracts binary market mechanics, YES/NO pricing, market IDs, BinaryPools, collateral approvals, order-book execution, and settlement. The user should experience a protection-oriented workflow rather than a prediction-market terminal.

Approved product terminology is:

> Modeled short-duration downside offsets using available DreamDEX Event Contracts.

CUSHION must not claim to provide insurance, conventional options, a delta hedge, a guaranteed hedge, guaranteed downside protection, or a guaranteed portfolio floor. Current verified DreamDEX Event Contracts are binary fixed-payout instruments tied to whether an asset closes at or above its window opening price.

**Canonical product statement:**

> CUSHION turns short-term crypto downside anxiety into an understandable, bounded Event Contract position. Instead of asking users to navigate binary markets, order books and settlement mechanics, CUSHION discovers compatible DreamDEX markets, models available downside offsets, caps execution cost, executes on Somnia and monitors the position through resolution.

**Short product line:** Keep your crypto. Cushion the downside.

## 2. Problem

Crypto holders may want to keep an asset while reducing the impact of a possible short-term downside event. Existing approaches can require selling, leverage, liquidation risk, perpetual funding, options knowledge, or manual translation from portfolio risk into binary positions.

CUSHION addresses that translation problem. A user should be able to say, “I hold BTC and I’m worried about the next 24 hours,” and receive a truthful plan derived from currently available, compatible DreamDEX Event Contracts—only when those contracts can responsibly represent a modeled downside offset.

## 3. Core product insight

Ordinary users should not have to begin with “BUY NO,” a binary order book, a `marketId`, or a BinaryPool. CUSHION asks what the user holds, how much exposure concerns them, the relevant horizon, and the desired protection level. Internally, an eligible plan may map to a real BUY_NO Event Contract order.

DreamDEX remains the execution protocol. CUSHION is the discovery, risk-translation, sizing, safety, monitoring, and user-experience layer.

## 4. Native Somnia and DreamDEX architecture

Somnia and DreamDEX are not optional integrations attached to a generic product. The verified native lifecycle is:

`User wallet → Somnia → DreamDEX discovery → marketId → Trading status → YES/NO book → BinaryPool → tUSDC → allowance → exact call construction → independent simulation → bounded IOC execution → DreamDEX events → owned position → finalization → redemption`

DreamDEX supplies the financial execution primitive. CUSHION supplies:

- dynamic discovery and compatibility checks;
- interpretation of binary opening-reference contracts;
- deterministic protection modeling and sizing;
- bounded-cost authorization;
- exact-call simulation and safety checks;
- authoritative execution verification;
- position monitoring and settlement UX.

## 5. Primary user

The primary user is a spot crypto holder who does not want to sell, use leverage, manage liquidation risk, or learn derivatives mechanics, but does want a clearly bounded cost and a plain-language explanation before signing.

Example:

1. The user owns approximately $4,000 of BTC.
2. They are concerned about the next 24 hours.
3. They choose BTC, enter approximate exposure, select 24h, and choose Light, Balanced, or Maximum.
4. CUSHION derives only plans supported by real compatible markets, books, payout rules, and liquidity.

No plan may be fabricated.

## 6. Critical product invariants

1. Never promise protection the underlying Event Contract cannot provide.
2. Never fabricate protection percentages, portfolio floors, payouts, supported assets, prices, liquidity, market availability, execution, or settlement state.
3. Prefer not executing over presenting a misleading or economically poor position.
4. Treat a transaction hash or mined receipt as insufficient execution proof; require authoritative DreamDEX event/state evidence and resulting ownership.
5. Never display a winning outcome until authoritative `isResolved` or `isVoided` state establishes it.
6. Preserve protocol quantities, prices, costs, and payouts as integers/bigints until presentation.
7. Bind an authorization artifact to chain ID, caller, `marketId`, pool, market nonce, calldata, value, gas assumptions, and expiry. Any mutation requires resimulation and renewed review.

## 7. Dynamic asset architecture

CUSHION must not be architecturally hardcoded to BTC and ETH. BTC and ETH are initial verified MVP presentation assets because compatible live Event Contracts were discovered during Phase 0.

The runtime support pipeline is:

`SUPPORTED ASSET → COMPATIBLE LIVE EVENT CONTRACTS → TIME WINDOWS → MARKET ID → STATUS → YES/NO BOOK → LIQUIDITY → PROTECTION ELIGIBILITY → CUSHION ENGINE`

An asset becomes protectable only when CUSHION discovers and verifies a compatible deployed Event Contract with authoritative Trading status and sufficient executable liquidity.

**Hard invariant:** Token existence does not equal CUSHION support.

SOMI, Somnia ecosystem tokens, and other crypto assets may become supported automatically when compatible deployed contracts exist. Current SOMI and altcoin Event Contract support is unverified and must not be claimed.

## 8. Core user journey

The target production journey is:

`CONNECT → DISCOVER → CONFIGURE → CALCULATE → PREVIEW → APPROVE → SIMULATE → CONFIRM → EXECUTE → VERIFY → MONITOR → RESOLVE → REDEEM`

### Connect

- Connect an EVM wallet.
- Read address, network, relevant balances, and available compatible assets.
- Provide a clear Somnia network-switch flow when the wallet is on the wrong chain.
- Do not treat `WALLET_CONNECTED` as `READY_TO_EXECUTE`.

### Select exposure

- Ask, “What are you protecting?”
- Show only assets supported by current verified compatible markets.
- Accept approximate asset or USD exposure as appropriate.

### Select horizon

- Derive windows from live compatible markets.
- Phase 0 observed 15m, 1h, 4h, and 24h windows; these are observations, not a permanent menu.
- Never display an unavailable window as executable.

### Select protection plan

- Present Light, Balanced, and Maximum only as calculation-driven UX abstractions.
- Derive every tier from exposure, contract semantics, price, payout, quantity, liquidity, budget, and maximum authorized cost.
- “Maximum” means maximum within policy, budget, and available liquidity—not guaranteed full protection.

### Preview and authorize

- Explain the proposed position, payout condition, estimated cost, maximum authorized cost, quantity, expiry, and limitations.
- Show approval separately when the selected BinaryPool lacks sufficient collateral allowance.
- Require explicit confirmation of the exact simulated order.

### Execute and monitor

- Refresh market and book state immediately before broadcast.
- Enforce the authorized limit without silent substitution.
- Verify receipt, DreamDEX events, fill quantity, actual price/cost, and owned position.
- Create an active CUSHION position only after authoritative verification.

## 9. Protection engine

Inputs may include:

- asset and exposure;
- compatible market and time horizon;
- Event Contract condition and opening-reference semantics;
- current YES/NO books and executable liquidity;
- fixed payout structure;
- quantity, budget, and maximum authorized execution price.

Outputs must explain:

- the proposed Event Contract position and why it was selected;
- estimated and maximum cost;
- payout condition and estimated payout under that condition;
- visible liquidity and expected execution behavior;
- timing, basis, discontinuity, and loss-if-wrong limitations.

The engine must not imply continuous loss coverage. A large intrawindow decline that recovers by expiry can produce no payout, while a small finish below the opening reference can trigger the fixed payout.

## 10. Bounded execution

CUSHION distinguishes **estimated execution cost** from **maximum authorized cost**. A BUY_NO IOC may execute against eligible liquidity at or below the user’s NO-price ceiling and receive price improvement. It must never execute above the authorized maximum.

Example presentation:

- Estimated protection cost: 18.42 tUSDC
- Maximum authorized cost: 19.10 tUSDC
- “CUSHION will not execute above your maximum.”

A live quote is never presented as frozen. If price moves beyond the ceiling, the order must not be silently widened or replaced.

## 11. Execution engine

Required lifecycle:

1. Discover the market and bind canonical `marketId`.
2. Verify authoritative Trading status, pool, nonce, venue, expiry, outcomes, collateral, tick, and lot.
3. Read the current YES/NO book and executable depth.
4. Calculate and quantize the position using bigint-safe arithmetic.
5. Read wallet collateral and native gas balances.
6. Read allowance for the exact collateral-token/BinaryPool pair.
7. If needed, construct and simulate a scoped approval; require explicit authorization before broadcast.
8. Construct the exact order with a future nanosecond expiry capped by market expiry.
9. Independently simulate the exact `{from,to,data,value,gas}` call.
10. Revalidate market identity and refresh the book before signing.
11. Enforce the maximum authorized cost and request explicit confirmation.
12. Broadcast once.
13. Verify receipt and authoritative DreamDEX events/state.
14. Verify actual fill, collateral delta, and resulting owned position.

The installed SDK write helper skips simulation, so CUSHION must retain its independent exact-call simulation layer. Transport-only RPC fallback is allowed; deterministic EVM reverts must not be retried as network failures.

## 12. Allowance model

Verified direct-order spender model: **per BinaryPool**.

Track allowance by:

`wallet + collateral token + BinaryPool`

There is no verified stable global spender for direct Event Contract orders. Pool addresses can be recycled across market generations. Allowance remains reusable for the same token/pool pair only while value remains.

Prefer bounded or minimum-safe approvals where practical and clearly explain the security/convenience tradeoff. Do not silently inherit the SDK helper’s unlimited-approval default.

Phase 0 also proved that finite allowance is consumed by gross maximum escrow, not merely net execution cost. In the verified order, allowance fell by 900 raw tUSDC while net spend was 802 raw because 98 raw of price-improvement surplus returned to the wallet.

## 13. Live position experience

After authoritative execution verification, show:

- asset and window;
- status;
- exposure context;
- Event Contract condition;
- entry, maximum authorized, and actual execution prices;
- estimated maximum and actual cost;
- position quantity and outcome held;
- exact market expiry and `marketId`;
- transaction link to an appropriate Somnia explorer;
- settlement and claim state.

## 14. CUSHION WATCH

CUSHION WATCH monitors the exact `marketId`, status, time remaining, owned outcome-token balance, finalization, resolution/void state, authoritative winning outcome, claim eligibility, and redemption state.

Potential statuses:

- Preparing
- Active
- Awaiting Resolution
- Won
- Lost
- Voided
- Claimable
- Redeemed

An unresolved market may expose a numeric default `winningOutcome`. Never display it as a winner until `isResolved` or `isVoided` is authoritative.

## 15. Settlement and redemption

On finalization, read authoritative resolution state and payout configuration for the exact market.

If the position wins, show original cost, position, payout, net result, and claim status. The claim lifecycle is:

`construct → simulate → explicit confirmation → broadcast → receipt → authoritative verification → collateral balance delta`

If the position loses, explain that the conditional payout was not triggered; do not call this system failure. If the market is voided, use the deployed refund/redemption semantics. Phase 0 source inspection established that a void pays both binary sides at 0.5 and does not apply a settlement fee, but actual owned-position void behavior remains unverified unless recorded in foundation evidence.

## 16. Empty states

- No compatible contract: “Protection isn’t available for this asset right now.”
- Insufficient liquidity: “There isn’t enough liquidity to build this protection plan safely right now.”
- Window closing: “This protection window is closing. Choose another available period.”
- Settlement pending: “This position is awaiting authoritative market resolution.”

## 17. Error model

At minimum, distinguish:

- `NETWORK_FAILURE`
- `INVALID_MARKET`
- `MARKET_EXPIRED`
- `MARKET_NOT_TRADING`
- `INSUFFICIENT_COLLATERAL`
- `INSUFFICIENT_ALLOWANCE`
- `SIMULATION_REVERT`
- `PRICE_MOVED`
- `INSUFFICIENT_LIQUIDITY`
- `TRANSACTION_REVERTED`
- `ORDER_NOT_FILLED`
- `SETTLEMENT_PENDING`
- `CLAIM_UNAVAILABLE`

Transport failures may retry the byte-identical call once on a verified fallback after checking chain ID. Deterministic reverts must not be relabeled or blindly retried.

## 18. RPC model

Verified Somnia Shannon configuration:

- Chain ID: `50312`
- Primary RPC: `https://dream-rpc.somnia.network`
- Fallback RPC: `https://api.infra.testnet.somnia.network`

Both endpoints independently reported chain 50312. Fallback is for transport failure, not contract rejection.

## 19. Collateral

Verified current Shannon Event Contract collateral:

- Token: tUSDC
- Address: `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`
- Decimals: 6

Read collateral address and decimals dynamically. Do not substitute USDso assumptions into Shannon Event Contract execution.

## 20. Phase-0 verified execution evidence

Phase 0 proved sponsor-native execution on Somnia Shannon:

| Field | Verified value |
|---|---|
| Transaction | `0xe6641626c5183747e1fe03ae72cca4925f5ca72e6fbdea141822cc8c8d157412` |
| Block | `471908440` |
| Chain | `50312` |
| Market ID | `0x0000000000000000000000000000000000000000000000000000000000009a4f` |
| Asset/window | BTC / 24h |
| Order | BUY_NO IOC |
| Quantity | 1000 raw / 0.001 share |
| Maximum NO price | 0.900000 |
| Actual NO execution price | 0.802000 |
| Maximum cost | 0.000900 tUSDC |
| Actual spend | 0.000802 tUSDC |
| Fill | Full fill; taker remainder 0 |
| Order ID | `184467440737095892227` |
| Owned position | 1000 raw NO independently verified |

`BinaryOrderPlaced`, `OrderFilled`, and `OrderPlaced` events were verified, and wallet collateral/position deltas agreed with the fill. Therefore `SPONSOR_NATIVE_EXECUTION_PROVEN=YES`.

At the latest recorded Phase 0.5H read, the market was still Trading, unfinalized, unresolved, and non-voided with 24,731 seconds to expiry. The wallet still held 1000 raw NO, but no claim was available. Settlement and redemption remain pending natural finalization. Full lifecycle proof must not be claimed until `FOUNDATION_VALIDATION.md` records authoritative settlement and, where applicable, redemption evidence.

## 21. Monetization

Potential V1 monetization is a transparent fee on successfully created protection positions. No production fee should be hardcoded before economic and compliance analysis.

Potential CUSHION+ capabilities:

- portfolio monitoring and risk alerts;
- saved preferences and protection-availability alerts;
- advanced analytics and configurable thresholds.

Longer term, CUSHION may expose an API or SDK to wallets, portfolio apps, Somnia ecosystem applications, exchanges, and treasury dashboards, including an embedded “Protect this position with CUSHION” action.

## 22. Post-hackathon roadmap

### Hackathon MVP

Prove live discovery, books, protection modeling, bounded execution, a real DreamDEX order and owned position, monitoring, settlement, and redemption. Execution is proven; settlement/redemption remain pending.

### 0–3 months

- Broader dynamically discovered asset support.
- SOMI and ecosystem support only when compatible contracts exist.
- Improved modeling, CUSHION WATCH, alerts, analytics, and feedback loops.

### 3–6 months

- Portfolio-level protection and multi-position strategies.
- Recurring preferences.
- Mobile/PWA and embedded integrations.

### 6–12 months

- CUSHION SDK and API.
- Wallet, portfolio, and ecosystem integrations.

## 23. AI policy

Do not add AI for hackathon marketing. Execution and protection calculations should remain deterministic and auditable wherever possible.

Future AI roles may include natural-language risk intent, scenario explanation, portfolio analysis, alerts, and education. AI must never fabricate markets, prices, liquidity, protection percentages, execution, transaction, or settlement state.

## 24. What CUSHION must not become

CUSHION is not a generic prediction-market terminal, DreamDEX clone, sportsbook, insurance company, conventional options platform, generic AI chatbot, autonomous trading bot, BTC-only application, static dashboard, or fake simulation demo.

If implementation drifts toward any of these, record the drift and stop before continuing.

## 25. Hackathon product story

Begin with the problem:

> I own BTC. I don’t want to sell it. But I’m worried about the next 24 hours.

Then demonstrate:

`Connect wallet → select BTC → enter exposure → select 24h → discover the real DreamDEX market → construct available protection → show estimated and maximum cost → approve → exact simulation → real Somnia transaction → verify DreamDEX fill → show Active → monitor settlement`

Do not open the demo with contract architecture. Show the user problem and product outcome first.

## 26. Success criteria

### Technical

- Live DreamDEX discovery, status, and books.
- Deterministic protection calculations.
- Exact-call simulation and transport-only RPC fallback.
- Real bounded execution and authoritative fill verification.
- Real owned position.
- Settlement and redemption verification.
- No fake integrations.

### Product

A non-expert should understand what is being protected, for how long, estimated and maximum cost, payout condition, and limitations without understanding BinaryPool internals.

### Business

When wallet, collateral, and allowance prerequisites are satisfied, target approximately one minute from short-term downside concern to an active verified CUSHION position.

## 27. Phase 1 definition of done

Phase 1 is not complete because the site looks polished. It requires a real live path:

`CONNECT → DISCOVER → CONFIGURE → PREVIEW → APPROVE → SIMULATE → EXECUTE → VERIFY → MONITOR`

Mocks and fixtures may exist only in clearly isolated development/test paths. No simulated feature may be presented as live.

## 28. Source-of-truth hierarchy

### Technical / product truth

1. Deployed on-chain behavior and verified Phase-0 evidence
2. `FOUNDATION_VALIDATION.md`
3. `SPONSOR_INTEGRATION.md`
4. `CUSHION_PRD.md`
5. `DESIGN.md`

### Agent operating rules

- `AGENTS.md` governs how coding agents must work, validate changes, avoid unsafe assumptions, and handle drift.
- `AGENTS.md` must not override verified deployed protocol behavior or fabricate product requirements.

### Drift / discovery record

- `DRIFT_LOG.md` records known deviations, corrections, conflicts, discoveries, and their resolutions.

If any document conflicts with verified deployed behavior:

- do not silently choose an interpretation;
- preserve verified deployed behavior as technical truth;
- record the conflict in `DRIFT_LOG.md`;
- stop when the conflict materially affects product behavior or execution safety.

## 29. Current gates and pending work

- Sponsor-native execution: **PROVEN**.
- Exact funded simulation: **PROVEN**.
- Maximum-price enforcement and price improvement: **PROVEN**.
- Authoritative full fill and owned position: **PROVEN**.
- Natural finalization of the owned position: **PENDING**.
- Winning/losing/void outcome for the owned position: **PENDING**.
- Claim/redeem transaction and collateral delta: **PENDING**.
- Phase 1: **NOT STARTED**.

The current foundation gate is:

`GREEN_EXECUTION_PROVEN_SETTLEMENT_PENDING`
