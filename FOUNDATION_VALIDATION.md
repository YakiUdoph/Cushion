# CUSHION Phase 0 — Foundation Validation Report

Validation date: 2026-08-26 (Atlantic/Cape Verde)
Final gate: **YELLOW**
Scope: foundation validation only. No product frontend or application feature was implemented.

## Executive conclusion

Somnia Shannon and DreamDEX Event Contracts expose real primitives for BTC/ETH market discovery, authoritative on-chain status, live books, dry-run order construction, finalized-market discovery, and redemption tooling. The full CUSHION lifecycle is **not proven end to end**: no dedicated funded wallet was available; the current SDK write path skips pre-broadcast simulation; and no real order, acceptance event, owned position, or redemption was verified.

Current Shannon contracts are binary “closes at or above its opening price” windows, not chosen-strike downside instruments. Buying NO provides a fixed payout if the asset finishes below its window opening. It is not delta hedging and has material timing and basis risk.

Status meanings: **PASS** direct evidence; **PARTIAL** verified with material limits; **FAIL** tested and did not meet the requirement; **UNVERIFIED** inadequate direct evidence.

## Sources/tooling

- Official Somnia network docs: <https://docs.somnia.network/developer/network-info>
- Official DreamDEX bot kit: <https://github.com/somnia-chain/dreamdex-bot-kit>
- Official Event Contract reference: <https://docs.dreamdex.io/developers/event-contracts>
- `@somnia-chain/markets-sdk` through `@dreamdex-bot-kit/ec-core`
- Requested RPC: `https://dream-rpc.somnia.network`
- Current kit default testnet RPC: `https://api.infra.testnet.somnia.network`

The current official kit was installed in ignored `.phase0/dreamdex-bot-kit`. No CUSHION dependency or lockfile was changed.

## A. Environment

| Capability | Status | Command and evidence | Blocker / product consequence |
|---|---|---|---|
| Node compatibility | PASS | `node --version` → `v24.18.0`; kit requires `>=20`. `npm.cmd --version` → `11.16.0`; Corepack supplied declared pnpm `10.4.1`. | Use Corepack here; bare pnpm is absent and PowerShell blocks `npm.ps1`. |
| Official tooling | PASS | `git clone --depth 1 …dreamdex-bot-kit`; `npm.cmd install`. Postinstall build passed. | npm audit reported 10 transitive vulnerabilities (1 critical, 5 high); pin/review before shipping. |
| Project typecheck/build | PASS | `corepack.cmd pnpm check`; `corepack.cmd pnpm build`. Both passed; build emitted 1,617 modules. | Build warns of unset analytics placeholders and unresolved `/manus-storage/...png`; unrelated to sponsor feasibility. Initial sandbox build failed on parent-directory access; identical elevated build passed. |
| Chain ID / RPC | PASS | Ten `eth_chainId` requests to requested RPC returned `0xc488` = 50312. | Assert 50312 at every signing boundary. |
| Latency/repetition | PASS | 10/10 requests succeeded: 1223, 401, 360, 389, 347, 290, 284, 309, 290, 291 ms; median ~328 ms. | Use deadlines, retry/backoff, and visible freshness. |
| Timeout behavior | PASS | Controlled unreachable endpoint with 2 s deadline returned timeout after 2,583 ms. | Never map transport failure to “empty market/book.” |

## B. Wallet/network

| Capability | Status | Evidence | Consequence |
|---|---|---|---|
| Dedicated wallet and native balance | UNVERIFIED | No relevant environment-variable names found; doctor printed both keys “not set.” | Provision a dedicated funded Shannon wallet securely in a later validation. |
| Wrong network | PARTIAL | Config and live RPC agreed on 50312; no signer-backed mismatch test. | Refuse signing unless wallet chain is 50312. |
| Insufficient gas | UNVERIFIED | No wallet/signer. | Preflight native balance and give an exact missing-asset message. |
| No client private key | PASS | Repo scan found no key integration; `.env*` ignored; no secret read, logged, or written. | Never introduce `VITE_*PRIVATE_KEY`; sign in wallet or secured server/operator flow. |

## C–D. Market discovery and data correctness

Command: `NETWORK=testnet DRY_RUN=true VENUE_ID=0x6797…a28c npm run ec:doctor`, followed by a read-only `ec-core` SDK probe.

Eight markets were confirmed on-chain as status `1` (`Trading`):

| Window | Asset | Market ID | Expiry (Unix s) | Question/outcomes |
|---|---|---|---:|---|
| 15m | ETH | `0x…a362` | 1787757300 | YES at/above opening; NO below opening |
| 15m | BTC | `0x…a361` | 1787757300 | same |
| 1h | ETH | `0x…a360` | 1787760000 | same |
| 1h | BTC | `0x…a35f` | 1787760000 | same |
| 4h | ETH | `0x…a190` | 1787760000 | same |
| 4h | BTC | `0x…a18f` | 1787760000 | same |
| 24h | ETH | `0x…9a50` | 1787788800 | same |
| 24h | BTC | `0x…9a4f` | 1787788800 | same |

`strike="0"` means an opening-price market, not a literal zero-dollar strike. Rows expose separate YES/NO outcome token IDs. BTC/ETH are the Event Contract underlyings; WBTC/WETH spot symbols are not their identity.

| Capability | Status | Evidence / consequence |
|---|---|---|
| Discovery, IDs, status, windows, direction | PASS | Official doctor and SDK returned all fields above. Rediscover continuously and recheck on-chain immediately before action. |
| Pool reuse / canonical identity | PASS | Official kit requires `getMarketOnchain(marketId)` and documents recycled pool addresses. Persist `marketId`; pool + nonce are generation metadata only. |
| Dynamic decimals | PARTIAL | Live market/on-chain rows report 6 decimals. Read the live field/token; never globally hardcode it. |
| USDso behavior | PARTIAL | Current Shannon Event Contracts use **6-decimal tUSDC**, address `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`, not USDso. Official kit documents mainnet USDso as 18 decimals; no mainnet call was made. |
| Integer/bigint handling | PASS (tooling) | Raw prices such as `508000`; `ec-core` retains bigint tick/lot/order values and warns against float writes. |
| Live books | PASS | YES and NO books read for every active market. Every sampled side had 3 visible ask levels totaling 990 shares (200+330+460). |
| Empty book | PASS (code-path) | SDK represents empty books as arrays and callers use optional levels. None sampled was empty. Show “No executable liquidity,” never synthetic depth. |
| Stale/expired detection | PASS (tooling) | Write guards require authoritative status `Trading` and read integer expiry; indexer is explicitly treated as lagging. |

## E. CUSHION feasibility from real book data

Illustration using the captured 24-hour BTC NO asks:

- Exposure `$10,000`; illustrative 10% close-below-opening loss = `$1,000`.
- Budget `$200` tUSDC.
- NO asks: 200 shares @ 0.749, 330 @ 0.755, 460 @ 0.765.
- Buy 200 for `$149.80`, then 66 for `$49.83`: 266 shares for `$199.63`.
- If NO wins: gross payout `$266`; net gain after premium `$66.37`.
- Gross payout offsets 26.6% of the illustrative loss; net gain offsets 6.637%. If NO loses, payout is zero and the premium is lost.

Visible depth does not bind this example, but larger plans walk to worse prices and eventually exhaust it. A large intrawindow drawdown that recovers by expiry pays nothing; a tiny finish below opening pays fully. The user’s entry can differ from the contract opening reference.

| Capability | Status | Consequence |
|---|---|---|
| Deterministic protection sizing | PARTIAL | Real books support budget-capped fixed-payout calculations, but not a chosen strike or continuous portfolio hedge. |
| Cost/payout/offset/liquidity/timing/basis | PASS for the illustration | Display premium, gross payout, net gain, scenario offset, depth/VWAP, expiry mismatch, and opening-reference basis risk. Do not claim delta hedging. |
| Light/Balanced/Maximum tiers | PARTIAL | Compute increasing budget allocations by walking real NO asks. “Maximum” means capped by budget, liquidity, and policy—not full protection. Suppress stale/empty tiers. |

## F–G. Order construction and real write

| Capability | Status | Command/evidence | Blocker / consequence |
|---|---|---|---|
| Dry-run order construction | PARTIAL | Direct official `ec-starter`: `DRY buy 5 …#YES @ ~0.139`, `@ ~0.325`, and BTC 24h `@ ~0.290`; no signer. | Log exact raw price, quantity, order type, expiry, market ID, calldata, and value before any later write. |
| Tick/lot quantization | PASS (tooling) | Testnet config: 6 decimals, tick `1000` raw (=0.001), lot `1` raw. `ec-core` quantizes and avoids generic float price writes. |
| Expiration | PASS (tooling) | Official kit requires a future nanosecond `expireTimestampNs`, capped at market expiry. | Use bigint and window-scaled headroom. |
| Pre-broadcast simulation | **FAIL** | Official `ec-core` states SDK writes use fixed fees, **skip simulation**, and may resolve with a reverted receipt; `assertTxOk` is post-broadcast only. | Add an exact `eth_call`/`simulateContract` layer using the real caller/value/calldata/gas before authorization. |
| Real testnet order, acceptance event, post-state | UNVERIFIED | Prerequisites did not pass; no wallet/funds, no approval request, no transaction. | Later run must require receipt success plus DreamDEX event/order state and resulting position; mined alone is insufficient. |

## H. Failure modes and truthful UI states

| Failure | Status | Required state |
|---|---|---|
| RPC timeout/unreachable | PASS | “Network unavailable; quote not current.” Disable authorization; retry with backoff. |
| DreamDEX API unavailable | PARTIAL | “Market service unavailable,” distinct from zero markets. |
| Empty book | PASS (code-path) | “No executable liquidity.” No plan/order CTA. |
| Stale/expired market | PASS (tooling) | “Window closed/no longer tradable.” Rediscover by market ID. |
| Insufficient gas/collateral | UNVERIFIED | Show exact missing asset/amount; do not broadcast. |
| Wallet rejection | UNVERIFIED | “Authorization cancelled.” Never report an order. |
| Wrong chain | PARTIAL | “Switch to Somnia Shannon (50312).” Disable signing. |
| Invalid quantity/price | PASS (tooling guards) | Explain tick/lot; re-quantize and require review if amount changes. |
| Simulation revert | FAIL for native SDK path | Decode/display revert and do not broadcast; explicit simulation is required first. |
| Broadcast failure | UNVERIFIED | Distinguish no hash from confirmation unknown; never invent an order ID. |

The official `ec:test` Windows harness failed with `spawn npm ENOENT`; direct `npm.cmd run start -w …` worked. This is tooling portability, not protocol evidence.

## I. Settlement/redemption

| Capability | Status | Evidence / consequence |
|---|---|---|
| Finalized discovery | PASS | `listBinaryMarkets({venueId,status:"Finalized"})` returned ten recent BTC/ETH IDs including `0x…a33a` and `0x…a339`. Live `loadMarkets()` intentionally omits finalized binaries. |
| Outcome/finalization read | PASS (tooling) | Snapshot exposes status, finalized, winning outcome, resolved/voided flags, and payout data. |
| Redemption | PARTIAL | Official `ec-settlement`/`maybeClaim` implements explicit claim; payout is not automatic. Dry claim truthfully printed “no PRIVATE_KEY, nothing to claim for.” No owned winning position existed. |
| Natural settlement path | PARTIAL | Naturally finalized markets were observed and the official scan worked; owned-position redeem and balance delta remain unverified. Do not fabricate completion. |

## J. RPC fallback

| Capability | Status | Evidence / consequence |
|---|---|---|
| Official alternative | PASS | Requested official RPC works; current official kit default also worked. |
| Automatic fallback | PARTIAL | Both were tested independently; failover was not exercised. Use an ordered allowlist and verify 50312 on every endpoint. |
| Trust disclosure | PASS | No random public RPC used. Document operators, privacy/retention, rate limits, and consistency before automatic failover. |

## Security result

No key was read, printed, written, or committed. No `.env` was created. No mainnet or testnet transaction was broadcast. No sponsor result was mocked. `.phase0/` is ignored.

## Final gate: YELLOW

**Some primitives work, but CUSHION must be modified around technical limitations.**

Before Phase 1 approval:

1. Position CUSHION as binary, fixed-payout, window-specific protection—not delta hedging or guaranteed loss coverage.
2. Key lifecycle state by `marketId`.
3. Implement exact-call simulation because the SDK write helper skips it.
4. Handle collateral decimals dynamically (Shannon tUSDC 6; mainnet USDso 18).
5. Complete a later funded Shannon lifecycle: secure wallet → balances/wrong-chain/insufficiency checks → exact simulation → explicit approval → minimal order → order event/state → position → natural finalization → redeem → collateral balance delta.

Until item 5 passes, sponsor-native execution remains **UNVERIFIED** and must not be presented as live.

## Phase 0.5B — Funded Shannon lifecycle validation

**Status: BLOCKED at Step 1 (wallet preflight).**

The requested dedicated wallet was not configured. `.phase0/dreamdex-bot-kit/.env` is absent (the path is gitignored), and no wallet/private-key environment variables are present. No credential was requested, read, printed, or used.

Approval/operator construction for a real wallet, funded-caller simulation, authorization, broadcast, DreamDEX acceptance, owned-position verification, finalization, and redemption were therefore not attempted. This is not a protocol failure and not a simulated success.

The last exact no-key probe gives the future minimum test shape: one quantized BUY_NO share returned `ERC20InsufficientAllowance(..., needed=661000)`, or `0.661000` at Shannon's 6-decimal tUSDC, plus native SOMI for approval/order gas. The required collateral is market/price/quantity dependent and must be read from the current exact call; it must never be hardcoded. The installed writer uses a 10,000,000 gas ceiling and 60 gwei max fee, so native gas sufficiency must be checked explicitly.

**EXECUTION_GATE=YELLOW** — the required wallet is absent; funded simulation, approval, broadcast, acceptance, owned state, and redemption remain unverified.

## Phase 0.5B continuation — funded wallet preflight

Security preflight passed before signer use: `.env` is Git-ignored and untracked, no private-key pattern is tracked, `NETWORK=testnet`, and the primary RPC reports chain `50312`. The private key was loaded only in memory to derive the public address and was never printed or persisted.

Wallet: `0x7bDb8D6608e2366d24C3dF0809838B74E9a2701E`; native balance `50 STT`; collateral `500 tUSDC` (raw `500000000`); collateral decimals read from contract: `6`.

Dynamic discovery selected BTC 24h market `0x…9a4f`, status `Trading`, venue `0x6797…a28c`, BinaryPool `0xC3F0…5cc8`, nonce `130`, expiry `1787788800`, YES outcome `…0355072`, NO outcome `…0355073`, tick `1000`, lot `1`. Top books: YES `0.278/0.305` bid/ask (200 shares), NO `0.695/0.722` (200 shares).

The selected BinaryPool is the tUSDC spender. Current allowance is `0`; minimum one-share BUY_NO approval is `722000` raw (`0.722000 tUSDC`). Exact `approve(pool,722000)` calldata simulated successfully from the real wallet and returned `true`. No approval, order, or other write was broadcast.

**EXECUTION_GATE=YELLOW** — stop at the explicit user-approval gate for the minimum approval transaction. After approval, re-read allowance and re-simulate the exact order before any order authorization.

### Approval broadcast and post-approval revalidation

With explicit user approval, exactly one `approve(pool,722000)` transaction was broadcast on Shannon. Hash: `0x045d0dddefac7be69166e6932a1b87752dd4f5cc69121bba9d10b7e36e1fa7fa`; block `471872954`; receipt `success`; allowance on the approved pool after mining: `722000` raw units. The amount and spender were not increased or changed.

During revalidation, the market rolled. The current market was ETH 15m `0x…a3fe`, status `Trading`, pool `0x3124…24a2`, nonce `89`, expiry `1787760900`, tick `1000`, lot `1`, with NO ask `0.405` for 200 shares. Its pool-specific wallet allowance was `0`, so the prior approval did not carry over. A fresh one-share BUY_NO IOC exact call (wire YES price `595000`, quantity `1000000`, value `0`, gas `10000000`) was simulated and reverted. No second approval or order broadcast was attempted.

**EXECUTION_GATE=YELLOW** — approval execution and receipt verification passed; order simulation did not pass because revalidation selected a new pool with no allowance. Stop without forcing another approval.

## Phase 0.5A — Exact pre-broadcast simulation validation

Validation date: 2026-08-26. This section adds evidence without replacing the original Phase 0 finding: the SDK's locally signed `placeOrder` path still skips simulation. Phase 0.5A tested an independent exact-call adapter and did not broadcast.

### Traced write path from installed source

1. `@dreamdex-bot-kit/ec-core` `placeLimit()` validates/floors size to lot, rounds outcome price to tick, complements NO price into the pool's YES-price scale, caps expiry at market expiry, checks wallet funding, then calls `exchange.trader.placeOrder()`.
2. SDK `Trader.placeOrder` delegates to `Orders.placeOrder()`.
3. `Orders.placeOrder()` and `buildPlaceOrder()` share the same private `binaryOrderCall()` definition. This is the byte-equivalence seam: the build-only method is documented for unsigned simulation and cannot drift from the sending twin.
4. `binaryOrderCall()` targets the dynamically discovered `onchain.pool` and uses `binaryPoolWriteAbi.placeBinaryOrder`:

```solidity
placeBinaryOrder(
  uint8 kind,
  uint256 price,
  uint256 quantity,
  uint64 expireTimestampNs,
  uint8 orderType,
  uint8 selfMatchingOption,
  address builder,
  uint96 builderFeeBpsTimes1k,
  uint64 userData
) payable returns (bool success, uint128 id)
```

Observed selector: `0x718c2d4d`.

- `kind`: 0 BUY_YES, 1 SELL_YES, 2 BUY_NO, 3 SELL_NO.
- `price`: always YES-price raw units, even for NO; `ec-core` sends `1 - NO-own-price` using integer units.
- `quantity`: raw outcome units.
- `orderType`: 0 limit, 1 FOK, 2 IOC, 3 post-only; self-match defaults to cancel-taker (0).
- Builder, builder fee, and opaque `userData` default to zero. `userData` is not a nonce.
- Binary orders attach `msg.value=0`; the ABI is payable but the installed source states binary pools take no native value.
- Buys escrow ceil-rounded collateral and require ERC-20 allowance from caller to pool. Sells require held outcome inventory and a one-time ERC-6909 `setOperator(pool,true)` grant on the outcome-token singleton; naked shorts are unavailable.
- No `marketId` or `venueId` is in the order calldata. They select and validate the correct market before construction. Because pools recycle, the adapter must bind canonical `marketId` to its authoritative pool + market nonce + Trading status immediately before encoding.
- The contract call has no application signature parameter. A later real transaction must be signed by the caller. The SDK's local signer consumes the EVM account transaction nonce through viem's nonce manager; no transaction nonce appears in function calldata.
- SDK-signed writes use a fixed 10,000,000 gas ceiling, max fee 60 gwei, zero priority fee, and no gas estimation. These transaction-envelope fields do not alter order calldata. Exact simulation uses the same caller, destination, calldata, and value; funded lifecycle validation must additionally check the intended envelope/gas balance.
- Expiry must be future nanoseconds and no later than pool market expiry. Price must follow tick; quantity must follow lot/minimum rules.

### Adapter and live test

Utility: ignored validation file `.phase0/dreamdex-bot-kit/scripts/cushion-simulation.ts`. It contains no signer and only calls `eth_chainId`, contract reads, and `eth_call`.

The adapter dynamically discovered a Trading market with NO ask liquidity rather than selecting BTC/ETH in business logic. Observed test market:

- Symbol `ETH-0-26AUG26-1530/tUSDC` (the discovered asset is evidence, not a hardcode).
- Market ID `0x…a388`; venue `0x6797…a28c`; pool `0xa2522deA9ffD29b38418fB184C0F42e5eB21976A`; nonce 137; on-chain status 1.
- Decimals 6, tick 1000, lot 1; NO best ask 0.02 for 200 shares.
- Constructed BUY_NO IOC: wire YES price `980000`, quantity `1000000` (one share), future expiry capped at market expiry, zero builder/fee/userData, value zero.
- Exact `from`, `to`, `data`, value, selector, and argument vector were emitted. No broadcast API exists in the adapter.

The public test caller `0x000000000000000000000000000000000000dEaD` had collateral balance 0 and pool allowance 0. On the rerun, the valid-shaped call reached contract escrow logic and reverted with decoded `ERC20InsufficientAllowance(pool, 0, 661000)`. This is expected and proves caller state is honored; it is not a simulated success. The required amount varies with the selected market price/quantity and must be read from the revert, not hardcoded.

### Failure classification evidence

| Case | Result | Classification |
|---|---|---|
| Valid-shaped call, zero allowance | `ERC20InsufficientAllowance(pool,0,20000)` | `INSUFFICIENT_ALLOWANCE` |
| Quantity zero | selector `0xeaa68ceb`, installed error `InvalidQuantity(0,1000)` | `SIMULATION_REVERT` / invalid quantity |
| Price one raw unit off tick | `InvalidPrice(980001,1000)` | `SIMULATION_REVERT` / invalid price |
| Past expiry | `OrderAlreadyExpired()` | `SIMULATION_REVERT` / expired order |
| Finalized market ID | rejected before encoding from finalized discovery/status | `INVALID_MARKET` |
| Unreachable primary transport | HTTP fetch failure with no revert data | `NETWORK_FAILURE`; eligible for fallback |
| Same exact call on official fallback | deterministic `ERC20InsufficientAllowance` | no further RPC retry |

Custom revert bytes are useful and decodable. The installed generated error table did not automatically resolve the observed `InvalidQuantity` selector through viem's combined decoder, although the same installed source defines that error. The adapter preserves the selector and decodes its two words explicitly; this mismatch is recorded in `DRIFT_LOG.md`.

Insufficient collateral after sufficient allowance remains **UNVERIFIED** because no funded/approved caller state was available and no state override or fabricated balance was used. Wrong caller state is proven at the allowance boundary. Sell-side insufficient inventory/operator cases also remain unverified in this no-wallet phase.

### RPC fallback result

Both official endpoints independently returned chain ID 50312:

- Primary: `https://dream-rpc.somnia.network`
- Fallback: `https://api.infra.testnet.somnia.network`

The adapter retried identical `from/to/data/value` against the fallback only after a controlled transport failure. It did not retry deterministic reverts. Any endpoint reporting a chain other than 50312 is an invalid endpoint, not a fallback candidate.

## Phase 0.5C approval topology and market rollover

### Phase 0.5D approved-order broadcast guard

The funded exact call for BTC 24h BUY_NO quantity `1000` raw had simulated successfully at NO limit `0.783000` (wire YES price `217000`). At the explicitly authorized broadcast attempt, the mandatory final book refresh showed the best executable NO ask had moved to `0.793000` for `200000000` raw quantity. Because the authorized IOC limit was no longer executable, the guard stopped before signing or sending. No transaction hash exists and wallet, allowance, collateral, and position state were not changed by this attempt. A replacement would require wire price `207000` and collateral cost `793` raw tUSDC for the same quantity, plus a fresh expiry, exact calldata simulation, and explicit user approval.

### Phase 0.5F bounded-order broadcast guard

A fresh funded simulation passed for quantity `1000` raw with a strict maximum NO price `0.752000`, wire YES price `248000`, maximum collateral `752` raw tUSDC, and exact expiry/calldata. At the separately authorized broadcast attempt, the mandatory final refresh returned best NO ask `0.780000` with `200000000` raw available. Because `0.780000 > 0.752000`, the exact IOC could not execute within the approved ceiling. The guard exited before signing or sending (`BROADCAST_OCCURRED=NO`). No hash, receipt, DreamDEX order/fill event, order ID, collateral spend, or position change exists for this attempt.

### Phase 0.5G sponsor-native execution result

The exact funded BUY_NO IOC with quantity `1000` raw, wire YES limit `100000` (maximum NO `0.900000`), maximum escrow `900` raw tUSDC, and approved calldata was broadcast once on Shannon after all final guards passed. Transaction `0xe6641626c5183747e1fe03ae72cca4925f5ca72e6fbdea141822cc8c8d157412` succeeded in block `471908440`.

Authoritative pool logs emitted `BinaryOrderPlaced(kind=2)`, `OrderFilled`, and `OrderPlaced` for order ID `184467440737095892227`, owned by the dedicated wallet. `OrderFilled` reported quantity `1000`, taker remainder `0`, maker fill price `198000` in YES terms, and maker remainder `199999000`. This maps to actual NO execution price `0.802000`, so the order received `0.098000` price improvement versus its `0.900000` maximum and was a `FULL_FILL`.

Wallet state independently verified the result: NO outcome-token balance increased from `0` to `1000` raw, tUSDC decreased from `500000000` to `499999198` raw (actual spend `802`, or `0.000802` tUSDC), and STT decreased from `49.99844153` to `49.993457162`. Allowance decreased from `722000` to `721100`, showing the pool pulled the `900`-raw maximum escrow and returned `98` raw price-improvement surplus to collateral balance while the finite allowance remained consumed by the initial pull. Sponsor-native Event Contract execution is therefore proven. Finalization and redemption remain pending and must be validated separately; Phase 1 did not start.

### Phase 0.5H finalization tracking

Read-only tracking at chain time `1787764069` found exact market `0x...9a4f` still authoritative `Trading`, nonce `130`, expiry `1787788800`, with `24731` seconds remaining. It was neither finalized, resolved, nor voided. Indexer payout numerators/denominator and winning outcome remained null. The on-chain helper's numeric `winningOutcome=0` is not meaningful while `isResolved=false`; installed settlement source explicitly guards this empty-vector default, so the winner is `UNKNOWN`.

The dedicated wallet still owned exactly `1000` raw NO and `0` YES on outcome-token singleton `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9`. Claimable outcomes were empty and estimated current payout was zero because the market is unresolved. The frozen settlement fee read was `0` bps; after a normal resolution a winner would therefore pay according to the finalized payout vector without a settlement-fee deduction, while a void would pay each side `0.5`. No redemption calldata was constructed or simulated because no claim is available. Full lifecycle remains pending natural finalization.

Installed `@somnia-chain/markets-sdk` source establishes the direct buy path as `placeOrder/buildPlaceOrder -> binaryOrderCall -> BinaryPool.placeBinaryOrder`. Buy collateral approval names the dynamically selected BinaryPool as spender. The deployed tUSDC allowance revert independently identifies that same pool as spender. No stable global spender exists for direct Event Contract orders; the stable CollateralRouter is used only by complete-set mint/redeem variants.

| Authorization mechanism | Finding |
|---|---|
| ERC-20 allowance to selected BinaryPool | `SUPPORTED` |
| EIP-2612 permit for a direct order | `NOT_SUPPORTED` |
| Permit2 for a direct order | `NOT_SUPPORTED`; installed support is limited to complete-set minting |
| ERC-6909 operator authorization | `SUPPORTED_FOR_SELLS_ONLY`; it authorizes outcome inventory, not BUY_NO collateral |
| Delegated `placeBinaryOrderFor` workflow | `UNVERIFIED`; the ABI entry exists, but no installed Event Contract SDK grant/signing workflow or live proof was found |
| Atomic approve-and-order | `UNVERIFIED`; external smart-account batching is possible in principle, but no protocol-native Event Contract batch executor was evidenced |

The SDK convenience helper defaults to `approve(pool,maxUint256)`. CUSHION must not silently inherit this exposure: use an explicit scoped amount unless the user deliberately chooses otherwise, and always re-read allowance. Finite allowances are reduced by collateral `transferFrom`, so address reuse does not imply that an already-consumed amount remains available.

A read-only snapshot of eight current markets and 200 finalized rows found 15 distinct BinaryPool addresses. Pools were recycled across assets, windows, and increasing market nonces. The approved `0xC3F0Bb8cD90d3fFa6a3e4982bCD6698f27Af5cc8` pool appeared at nonces 127-130 across ETH 1h, BTC 15m, ETH 15m, and the current BTC 24h generation. Approval is therefore keyed to wallet + collateral token + pool address, not asset, window, market ID, or nonce. The observed count of 15 is not a protocol maximum.

The Phase 0.5B claim that the approved market rolled away is corrected: BTC 24h market `0x...9a4f`, pool `0xC3F0...5cc8`, nonce `130`, remained current and Trading with allowance `722000`. The utility selected the first item in a reordered discovery result (ETH 15m). That was selection drift, not rollover. Future validation must retain and revalidate the bound market ID.

Approval UX is `ACCEPTABLE`: a small observed pool set can be reused by address, although a first encounter with another pool requires approval and exact-minimum approvals are consumed by fills. At the snapshot, the safest next test remained BTC 24h `0x...9a4f` on the already-approved pool, with about 28,086 seconds remaining. Its one-share NO ask had moved to `0.744000` tUSDC, but a sub-one-share quantity respecting lot/minimum rules could fit within the existing `722000` allowance; no new approval is required for that recommended test. Refresh every market and wallet input before later simulation. No transaction was broadcast in Phase 0.5C.

### Phase 0.5A gate

**SIMULATION_GATE=YELLOW** — exact independent pre-broadcast simulation is structurally proven, produces useful deterministic revert information, and supports transport-only RPC fallback. A funded caller with the real collateral allowance/operator state is still required to prove a successful simulation and the complete balance-vs-allowance classification.
