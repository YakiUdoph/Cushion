# CUSHION Phase 1A/1B Architecture

Phase 1A is a browser read application. It contains no signing or broadcast path.

## Data flow

`EIP-1193 wallet → Shannon chain validation → DreamDEX indexer discovery → Trading/expiry compatibility filter → live NO book → bigint protection engine → execution preview`

`Connected wallet → DreamDEX portfolio index → authoritative market lifecycle fields → CUSHION WATCH state`

The official `@somnia-chain/markets-sdk` 0.28.1 supplies binary market, book, and portfolio reads. Markets are keyed by canonical `marketId`; pool address and market nonce remain generation metadata. Asset and horizon controls are derived from currently compatible operator-2 Trading markets and never from a static BTC/ETH list.

## RPC and failures

The primary Shannon RPC is `https://dream-rpc.somnia.network`; the approved fallback is `https://api.infra.testnet.somnia.network`. Fallback occurs only for fetch/HTTP transport failures. JSON-RPC errors are propagated and are not retried as network failures. Every initial live load verifies chain ID 50312.

Indexer failure, no markets, empty books, and stale/closed markets remain distinct UI states. Production code never substitutes fixtures.

## Protection model

Plan calculations retain prices, quantities, costs, and payouts as bigint raw units. Light, Balanced, and Maximum request 25%, 50%, and 100% of stated exposure respectively, capped by visible NO ask depth. Estimated cost walks the live book; maximum authorized cost uses the worst crossed price. These are deterministic modeled offsets, not guaranteed continuous protection.

When visible depth is below even the Light request, all styles can truthfully collapse to the same executable result. For example, a $4,000 exposure requests 1,000 / 2,000 / 4,000 shares while levels of 200 + 330 + 460 expose only 990 shares; every style is capped at 990. The UI explains this constraint instead of manufacturing plan differentiation.

## WATCH invariant

A numeric winner is ignored until status is authoritatively `Resolved` or `Finalized`; void state is separately gated. Portfolio discovery is indexer-based and may be incomplete for legacy positions.

## Phase 1B connected-wallet execution

Phase 1A remains the read foundation. Phase 1B adds one bounded write path: a connected Shannon wallet can approve the selected BinaryPool for the exact maximum collateral amount and submit a BUY_NO immediate-or-cancel order. The browser never receives, stores, or derives a private key; every write is presented to the user's EIP-1193 wallet.

The execution artifact binds chain ID, caller, canonical `marketId`, pool, pool nonce, collateral, market expiry, quote fingerprint, quantity, ceiling, maximum cost, calldata, value, and gas. Immediately before confirmation the application re-reads wallet/chain, on-chain market identity and status, expiry headroom, live book, collateral balance, and pool-specific allowance. Any change invalidates the artifact. The exact order bytes are independently simulated; the same object is then handed to the wallet without mutation.

Approval, simulation, and confirmation share one authoritative freshness gate. A quote is actionable for at most 30 seconds and is invalidated immediately when its market closes. CUSHION requires at least 600 seconds of market life before any write path; this deliberately reserves time for a finite approval, receipt confirmation, fresh order simulation, human review, wallet confirmation, and order inclusion. A Trading market below that threshold is labeled too close to expiry rather than safely executable. Refresh is an explicit user action: it rediscovers markets, clears the old quote/package, re-reads the replacement pool's allowance, and requires review of new values.

Receipt status is necessary but not sufficient. Verification requires the pool's BUY_NO `BinaryOrderPlaced`, the matching `OrderPlaced` owner, matching taker `OrderFilled` events when present, price/cost bounds, and the connected wallet's resulting NO-token balance. A successful IOC receipt with an authoritative order but zero fill is `NO_FILL`, never active protection. Verified full and partial fills are saved as local display metadata and the live portfolio is refreshed.

No agent or automated test broadcasts a transaction. Claims, redemption, server signing, private-key input, automatic execution, and mainnet writes remain outside Phase 1B.
