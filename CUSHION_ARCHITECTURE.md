# CUSHION Phase 1A Architecture

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

## Write boundary

There is no approval, order, simulation authorization, claim, private key, signer, or broadcast function in Phase 1A. Wallet access is limited to account discovery and Shannon network switching.
