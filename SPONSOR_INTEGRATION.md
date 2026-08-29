# Sponsor Integration — Verified Phase 0 Contract

## Observed integration

- Somnia Shannon Testnet, chain ID `50312`.
- Official RPCs used: `https://dream-rpc.somnia.network` and current kit default `https://api.infra.testnet.somnia.network`.
- Indexer: `https://dev.smk.somnia.host/v1/graphql`.
- SDK: `@somnia-chain/markets-sdk` through `@dreamdex-bot-kit/ec-core`.
- Observed DreamDEX venue: `0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c` (operator 2). Venue IDs move; revalidate.
- Shannon collateral: 6-decimal tUSDC `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`.

## Asset and market discovery architecture

CUSHION is not a BTC/ETH-only architecture. BTC and ETH are the initial MVP assets because compatible live DreamDEX Event Contracts were verified for them during Phase 0. Support for an asset is a derived runtime capability, not a static product declaration.

The discovery pipeline is:

`SUPPORTED ASSET → AVAILABLE DREAMDEX EVENT CONTRACTS → TIME WINDOWS → MARKET ID → YES/NO ORDER BOOK → LIQUIDITY → CUSHION PROTECTION CALCULATION`

The future integration boundary must expose a dynamically discovered registry with this conceptual shape:

```ts
type SupportedAsset = {
  assetId: string;
  displaySymbol: string;
  verification: "verified-live" | "unverified";
  markets: CompatibleEventMarket[];
};

type CompatibleEventMarket = {
  marketId: `0x${string}`;
  venueId: `0x${string}`;
  poolAddress: `0x${string}`;
  marketNonce: bigint;
  underlyingAsset: string;
  condition: "close-at-or-above-opening";
  tradingStart: bigint;
  expiry: bigint;
  intervalSec: bigint;
  status: "Trading" | "Unavailable";
  collateralAddress: `0x${string}`;
  collateralDecimals: number;
  yesOutcomeId: bigint;
  noOutcomeId: bigint;
  yesBook: OrderBook;
  noBook: OrderBook;
};
```

This is a documentation-level contract for later implementation, not Phase 1 code. Concrete field types may follow the supported SDK, but the separation of asset, canonical `marketId`, time window, outcome books, and liquidity is mandatory.

### Registry derivation rules

1. Query the currently configured DreamDEX venue through supported discovery tooling; do not begin with a hardcoded asset allowlist.
2. Filter to compatible binary Event Contracts whose semantics can be interpreted by the protection engine and whose authoritative on-chain status is `Trading`.
3. Group compatible rows by normalized underlying asset, then by time window. Preserve every contract's canonical `marketId` and generation metadata.
4. Load both YES and NO books and measure executable depth. A discovered asset with no compatible, tradable, liquid market is not currently supported for plan construction.
5. Publish an asset as `verified-live` only from current deployed-system evidence. Discovery alone must not imply adequate liquidity or execution readiness.
6. Rebuild or refresh the registry as markets list, expire, finalize, and respawn. Never infer continued support from a prior pool address or previous window.
7. Feed the generic protection engine normalized market/book data. The calculation must not contain branches such as `BTC => ...` or `ETH => ...`.

BTC and ETH may be the only assets initially displayed because they are the only assets verified in Phase 0. SOMI and other Somnia ecosystem assets become eligible automatically only when compatible deployed DreamDEX Event Contracts are discovered and verified. Current SOMI or altcoin Event Contract support is **UNVERIFIED** and must not be claimed.

## Mandatory lifecycle

1. Discover current binaries and explicitly scope the intended venue.
2. Persist `marketId`; pool addresses recycle, while pool + nonce describe a generation.
3. Read `strike`, `intervalSec`, start, and expiry; do not parse question text as state.
4. Require on-chain status `Trading` immediately before every action.
5. Read decimals dynamically; keep price, quantity, cost, and payout as integers/bigints until display.
6. Read the selected YES/NO book directly; distinguish empty arrays from API failure.
7. Quantize to live/configured tick and lot.
8. Use a future nanosecond expiry capped below market expiry.
9. Explicitly simulate the exact call. Current SDK writes skip simulation; post-receipt checking is not a substitute.
10. Require user authorization, then verify receipt **and** DreamDEX order event/state and resulting position.
11. Find settled contracts with `listBinaryMarkets({venueId,status:"Finalized"})`.
12. Redeem explicitly and verify the collateral balance delta.

Current markets are opening-reference binary contracts. A downside plan buys NO and must disclose premium, gross payout, net gain, loss-if-wrong, depth/VWAP, window, timing mismatch, and basis risk.

CUSHION's approved description is **modeled short-duration downside offsets using available Event Contract positions**. It must not describe these positions as delta hedges, conventional options, guaranteed protection, portfolio insurance, or guaranteed portfolio floors.

Read/discovery/dry-run primitives are verified. Real execution and owned-position redemption are **UNVERIFIED**.

## Exact simulation adapter (Phase 0.5A)

The required pre-authorization path is:

`marketId discovery → authoritative marketId/pool/nonce/status binding → book read → bigint tick/lot sizing → build exact placeBinaryOrder call → verify caller balance/allowance or outcome/operator state → eth_call(from,to,data,value) → decode/classify → user authorization later`

The exact binary order target is the selected market's `BinaryPool`; the function is `placeBinaryOrder(uint8,uint256,uint256,uint64,uint8,uint8,address,uint96,uint64)` with selector `0x718c2d4d`. Binary order value is zero. The call contains no market ID, venue ID, signature, or transaction nonce, so those must not be confused with order arguments:

- `marketId`, venue, pool, and pool market nonce are discovery/preflight identity state.
- The user's transaction signature and EVM transaction nonce belong to the later transaction envelope.
- Builder attribution and opaque `userData` default to zero and are not replay nonces.

Use the SDK's `buildPlaceOrder()` when a real trader/wallet client exists: installed source proves it and `placeOrder()` share `binaryOrderCall()`. In a no-key read-only service, reproduce that same installed ABI encoding and emit an unsigned `{from,to,data,value}` simulation request. The exact unsigned call returned to the later signing layer must be the one simulated; rebuilding after market/book/expiry changes invalidates the result and requires resimulation.

### Simulation classifications

- `NETWORK_FAILURE`: transport/timeout/no valid RPC response; may retry the identical call once against the approved 50312 fallback.
- `SIMULATION_REVERT`: EVM returned revert data; decode and do not retry another RPC as a network recovery.
- `INVALID_MARKET`: canonical market binding is absent, recycled, non-Trading, stale, or expired; reject before authorization.
- `INSUFFICIENT_BALANCE`: explicit balance preflight or decoded balance revert.
- `INSUFFICIENT_ALLOWANCE`: explicit allowance/operator preflight or decoded approval revert.

Never retry a deterministic revert across RPCs. Never reuse a successful simulation after any change to caller, market ID, pool/nonce, calldata, value, expiry, or relevant wallet state. A successful `eth_call` proves execution against the chosen block state only; it does not reserve liquidity or guarantee later execution.

Phase 0.5A decoded missing allowance, invalid price, invalid quantity, and expired-order failures. Successful execution and insufficient-balance-after-allowance remain unverified until a dedicated funded wallet is available. No transaction was broadcast.

## Phase 0.5B funded lifecycle gate

Funded validation stopped at wallet preflight. The ignored validation workspace has no `.env` and no wallet/private-key environment variable is set. No signer was instantiated, no approval was prepared for broadcast, no funded-caller simulation was attempted, and no transaction was sent.

The minimum future test state is a dedicated Shannon wallet with native SOMI for gas and enough current collateral for one quantized share. The last exact no-key call reported `ERC20InsufficientAllowance(..., needed=661000)` for its selected market/call, equal to `0.661000` 6-decimal tUSDC; this is dynamic, not a constant. Read balance, allowance, and sell-side operator/inventory state before simulating the exact real-caller call.

Because Step 1 did not pass, approval, authorization, broadcast, acceptance, owned-position, finalization, and redemption gates were not entered. No mainnet path is permitted by this result.

### Continued preflight result

The configured dedicated wallet now passes Shannon preflight: address `0x7bDb8D6608e2366d24C3dF0809838B74E9a2701E`, chain `50312`, `50 STT`, and `500 tUSDC` with contract-read decimals `6`. `.env` was confirmed ignored and untracked before signer use; the key was never printed or persisted.

Dynamic discovery selected BTC 24h market `0x…9a4f` (`Trading`), pool `0xC3F0…5cc8`, nonce `130`, expiry `1787788800`, tick `1000`, lot `1`; NO top ask was `0.722` for 200 shares. The selected pool is the tUSDC spender and current allowance is `0`.

The minimum one-share approval is `approve(pool,722000)` (`0.722000 tUSDC`). Its exact calldata simulated successfully from the real wallet and returned `true`. No approval or order transaction was broadcast. Validation is stopped at the explicit approval gate; once approved, allowance must be re-read and the order re-simulated.

### Phase 0.5C correction and authorization topology

### Phase 0.5D price-drift broadcast stop

The exact approved BUY_NO IOC was not broadcast. Immediate pre-send refresh changed the executable NO ask from the simulated `0.783000` to `0.793000`. CUSHION correctly refused to mutate the approved price/calldata and stopped before signing. This proves the authorization boundary must bind the current executable book and exact bytes; price movement requires reconstruction, resimulation, and fresh approval rather than silent slippage expansion.

### Phase 0.5F bounded ceiling result

The `+0.010` bounded IOC simulated successfully at a `0.752000` maximum NO price, but the pre-sign refresh later observed `0.780000`. The approved ceiling was enforced operationally: CUSHION did not widen the limit, rebuild calldata, sign, or broadcast. Bounded limits prevent excess price exposure but cannot guarantee execution when the market moves beyond the ceiling during human authorization latency.

### Phase 0.5G native execution proof

The fixed-ceiling `0.900000` BUY_NO IOC was broadcast once after exact simulation and explicit authorization. Transaction `0xe6641626c5183747e1fe03ae72cca4925f5ca72e6fbdea141822cc8c8d157412` succeeded at block `471908440` and emitted authoritative DreamDEX order/fill events. The full `1000` raw quantity filled at effective NO price `0.802000`; actual collateral spend was `802` raw tUSDC versus the `900`-raw maximum, and the wallet's NO position increased by `1000` raw.

This proves sponsor-native order execution, strict maximum-price enforcement, price improvement, event decoding, and resulting position ownership on Shannon. It does not yet prove finalization or redemption. The finite allowance fell by the maximum escrow (`900`) rather than net spend (`802`), while the `98`-raw improvement returned to wallet collateral; product allowance UX must account for gross escrow consumption.

### Phase 0.5H settlement pending

The exact owned BTC 24h market remained Trading with `24731` seconds to expiry at the validation read. It was not finalized, resolved, or voided; no payout vector or winning outcome existed. Wallet ownership remained `1000` raw NO, but claimable outcomes were empty, so no redemption call was constructed or simulated. Sponsor integration must distinguish the unresolved contract default `winningOutcome=0` from an authoritative YES result and wait for `isResolved` or `isVoided` plus finalized payout state.

The Phase 0.5B rollover explanation below is superseded. The approved BTC 24h binding remained Trading; the utility drifted to the first result after discovery ordering changed. Sponsor integration must persist the selected market ID and revalidate its pool, nonce, status, expiry, and book rather than silently select another market.

Direct Event Contract buys approve the selected BinaryPool, not a stable/global DreamDEX spender. Permit2 is installed only for complete-set minting through the CollateralRouter; EIP-2612 permit is not supported for direct orders. ERC-6909 operator grants cover sell-side outcome inventory. `placeBinaryOrderFor` exists at ABI level, but its Event Contract delegation lifecycle remains `UNVERIFIED`; protocol-native atomic approval plus order is also `UNVERIFIED`.

Pools recycle across assets, windows, and nonces, so integration must maintain a transparent per-pool authorization inventory. Prior unspent allowance can be reused when an address returns, while finite allowance is consumed by fills. The installed SDK defaults to unlimited approval, but CUSHION must make the scoped-versus-durable exposure decision explicit. Across the audited 200-row history, 15 pool addresses were observed; this is evidence of a reusable finite topology, not a guaranteed cap. Approval UX is therefore `ACCEPTABLE`, with possible first-use approvals for previously unseen pools.

Phase 0.5C was read-only. It did not broadcast an approval or order and did not start Phase 1.

### Phase 0.6 final settlement result

The exact BTC 24h market `0x...9a4f` naturally finalized on Shannon. At block `474419526`, deployed state reported status `4`, nonce `130`, pool `0xC3F0...5cc8`, expiry `1787788800`, `finalized=true`, `isResolved=true`, and `isVoided=false`. The permanent settlement record supplied payout vector `[10000000,0]` over denominator `10000000` with a `0` bps settlement fee, authoritatively proving YES won.

The dedicated wallet still held `1000` raw NO and `0` YES. Official claimability logic returned no claimable outcome and the exact NO payout was `0` raw tUSDC; the contemporaneous collateral balance was `499999198` raw. Losing tokens can remain outstanding but have no payout. No redeem call, simulation, signature, or broadcast was performed merely to force a transaction proof.

The applicable sponsor lifecycle is complete through natural settlement: `REDEMPTION_REQUIRED=NO`, `REDEMPTION_RESULT=NOT_APPLICABLE_POSITION_LOST`, and `FULL_LIFECYCLE=PASS_SETTLEMENT_LOSING_PATH_VERIFIED`. A winning/void redemption balance-delta path remains unverified and must not be presented as proven.

### Historical post-approval result

The explicitly approved transaction was broadcast exactly once: hash `0x045d0dddefac7be69166e6932a1b87752dd4f5cc69121bba9d10b7e36e1fa7fa`, block `471872954`, receipt `success`, and allowance `722000` on the approved pool. Revalidation then found a new ETH 15m `Trading` market (`0x…a3fe`) with pool `0x3124…24a2`, nonce `89`, and NO ask `0.405`; its pool-specific allowance was `0`. The fresh exact one-share BUY_NO simulation reverted, so no additional approval or order transaction was attempted. Market rollover invalidated reuse of the prior approval plan.
