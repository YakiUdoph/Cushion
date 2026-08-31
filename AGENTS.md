# CUSHION Agent Rules

## Phase 1A scope

Phase 0 is closed at `GREEN_FULL_LIFECYCLE_PROVEN`. Phase 1A permits frontend and live read-side application work only.

No agent may:

- present mocked integrations as live;
- invent sponsor capabilities;
- bypass failed DreamDEX functionality with fake execution;
- change the core CUSHION product concept without recording the change in `DRIFT_LOG.md`;
- modify the approved design system without recording the change in `DRIFT_LOG.md`;
- broadcast approvals, orders, claims, or any other transaction during Phase 1A;
- add a frontend private key, custodial signer, or automatic trading path.

## Security and evidence

- Never place a private key in frontend/client code, tracked files, commands, output, or logs.
- Never commit `.env` files.
- Use a dedicated testnet wallet only.
- Dry-run and simulate before any write.
- Never send a mainnet transaction.
- A real testnet transaction requires explicit user approval when funds or credentials are required.
- Do not treat a mined transaction alone as proof that DreamDEX accepted an order; verify emitted events or resulting protocol state.
- Mark anything without adequate evidence as `UNVERIFIED`.
- Record technical reality and product consequences truthfully.
- Bind every Event Contract simulation artifact to `marketId`, pool address, pool market nonce, caller, calldata, value, and chain ID; any change requires a new simulation.
- Retry simulation on an approved fallback RPC only for transport failure. Never retry or relabel a deterministic EVM revert as a network error.
- The exact unsigned call presented for later authorization must be byte-identical to the successfully simulated call.
