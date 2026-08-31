import type {
  BinaryMarket,
  BinaryOrderBook,
  BookLevel,
} from "@somnia-chain/markets-sdk";

export const SHANNON_CHAIN_ID = 50312;
export const SHANNON_CHAIN_HEX = "0xc488";
export const PRIMARY_RPC = "https://dream-rpc.somnia.network";
export const FALLBACK_RPC = "https://api.infra.testnet.somnia.network";
export const INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";
export const DREAMDEX_OPERATOR_ID = 2;

export type RpcHealth = {
  endpoint: string;
  degraded: boolean;
  blockNumber: bigint;
};

type RpcEnvelope<T> = {
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

async function rpcCall<T>(
  endpoint: string,
  method: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!response.ok)
    throw new TypeError(`RPC transport returned ${response.status}`);
  const body = (await response.json()) as RpcEnvelope<T>;
  if (body.error)
    throw Object.assign(new Error(body.error.message), {
      rpcError: body.error,
    });
  if (body.result === undefined)
    throw new TypeError("RPC response had no result");
  return body.result;
}

export async function rpcWithTransportFallback<T>(
  method: string,
  params: unknown[] = [],
  signal?: AbortSignal
) {
  try {
    return {
      value: await rpcCall<T>(PRIMARY_RPC, method, params, signal),
      endpoint: PRIMARY_RPC,
      degraded: false,
    };
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return {
      value: await rpcCall<T>(FALLBACK_RPC, method, params, signal),
      endpoint: FALLBACK_RPC,
      degraded: true,
    };
  }
}

export async function verifyShannon(signal?: AbortSignal): Promise<RpcHealth> {
  const chain = await rpcWithTransportFallback<string>(
    "eth_chainId",
    [],
    signal
  );
  if (Number.parseInt(chain.value, 16) !== SHANNON_CHAIN_ID)
    throw new Error(`Expected Shannon chain ${SHANNON_CHAIN_ID}`);
  const block = await rpcWithTransportFallback<string>(
    "eth_blockNumber",
    [],
    signal
  );
  return {
    endpoint: block.endpoint,
    degraded: chain.degraded || block.degraded,
    blockNumber: BigInt(block.value),
  };
}

export type CompatibleMarket = BinaryMarket & { intervalSeconds: bigint };

export function isCompatibleTradingMarket(
  market: BinaryMarket,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000))
): market is CompatibleMarket {
  if (market.status !== "Trading" || market.operatorId !== DREAMDEX_OPERATOR_ID)
    return false;
  if (!market.asset || !market.nonce || !market.venueId || !market.intervalSec)
    return false;
  const start = BigInt(market.tradingStart);
  const expiry = BigInt(market.expiry);
  return (
    start <= nowSeconds &&
    expiry > nowSeconds &&
    BigInt(market.intervalSec) > 0n
  );
}

export type AssetRegistry = Array<{
  symbol: string;
  markets: CompatibleMarket[];
}>;

export function buildAssetRegistry(
  markets: BinaryMarket[],
  nowSeconds?: bigint
): AssetRegistry {
  const grouped = new Map<string, CompatibleMarket[]>();
  for (const market of markets) {
    if (!isCompatibleTradingMarket(market, nowSeconds)) continue;
    const symbol = market.asset.trim().toUpperCase();
    const normalized = Object.assign(market, {
      intervalSeconds: BigInt(market.intervalSec!),
    });
    grouped.set(symbol, [...(grouped.get(symbol) ?? []), normalized]);
  }
  return [...grouped.entries()]
    .map(([symbol, rows]) => ({
      symbol,
      markets: rows.sort((a, b) =>
        Number(a.intervalSeconds - b.intervalSeconds)
      ),
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function intervalLabel(seconds: bigint) {
  if (seconds % 86400n === 0n) return `${seconds / 86400n}d`;
  if (seconds % 3600n === 0n) return `${seconds / 3600n}h`;
  if (seconds % 60n === 0n) return `${seconds / 60n}m`;
  return `${seconds}s`;
}

export type ProtectionStyle = "light" | "balanced" | "maximum";
export type ProtectionPlan = {
  style: ProtectionStyle;
  requestedQuantity: bigint;
  quantity: bigint;
  estimatedCost: bigint;
  maximumCost: bigint;
  grossPayout: bigint;
  netGain: bigint;
  availableDepth: bigint;
  fullyExecutable: boolean;
};

function sweep(levels: BookLevel[], target: bigint, one: bigint) {
  let remaining = target;
  let cost = 0n;
  let filled = 0n;
  let worstPrice = 0n;
  for (const level of levels) {
    const take = remaining < level.quantity ? remaining : level.quantity;
    cost += (take * level.price + one - 1n) / one;
    filled += take;
    if (take > 0n) worstPrice = level.price;
    remaining -= take;
    if (remaining === 0n) break;
  }
  return { cost, filled, worstPrice };
}

export function calculateProtectionPlans(
  exposureRaw: bigint,
  book: BinaryOrderBook,
  decimals: number
): ProtectionPlan[] {
  const asks = [...book.noAsks].sort((a, b) => (a.price < b.price ? -1 : 1));
  const depth = asks.reduce((sum, level) => sum + level.quantity, 0n);
  if (exposureRaw <= 0n || depth === 0n) return [];
  const one = 10n ** BigInt(decimals);
  const ratios: Array<[ProtectionStyle, bigint]> = [
    ["light", 2500n],
    ["balanced", 5000n],
    ["maximum", 10000n],
  ];
  return ratios
    .map(([style, bps]) => {
      const desired = (exposureRaw * bps) / 10000n;
      const { cost, filled, worstPrice } = sweep(asks, desired, one);
      const maximumCost = (filled * worstPrice + one - 1n) / one;
      return {
        style,
        requestedQuantity: desired,
        quantity: filled,
        estimatedCost: cost,
        maximumCost,
        grossPayout: filled,
        netGain: filled > cost ? filled - cost : 0n,
        availableDepth: depth,
        fullyExecutable: filled === desired,
      };
    })
    .filter(plan => plan.quantity > 0n);
}

export function plansCollapseAtDepth(plans: ProtectionPlan[]) {
  return (
    plans.length > 1 &&
    plans.every(
      plan => !plan.fullyExecutable && plan.quantity === plans[0].quantity
    )
  );
}

export type WatchState =
  | "ACTIVE"
  | "AWAITING_RESOLUTION"
  | "WON"
  | "LOST"
  | "VOIDED"
  | "CLAIMABLE"
  | "REDEEMED";

export function deriveWatchState(
  input: {
    status: string;
    expiry: bigint;
    voided: boolean;
    winningOutcome: number | null | undefined;
    heldOutcome: number;
    balance: bigint;
    redeemed?: boolean;
  },
  now = BigInt(Math.floor(Date.now() / 1000))
): WatchState {
  if (input.redeemed) return "REDEEMED";
  if (input.voided && ["Voided", "Finalized"].includes(input.status))
    return input.balance > 0n ? "CLAIMABLE" : "VOIDED";
  const authoritative =
    ["Resolved", "Finalized"].includes(input.status) &&
    input.winningOutcome != null;
  if (authoritative) {
    if (input.winningOutcome === input.heldOutcome)
      return input.balance > 0n ? "CLAIMABLE" : "WON";
    return "LOST";
  }
  return input.expiry <= now || ["Locked", "Settling"].includes(input.status)
    ? "AWAITING_RESOLUTION"
    : "ACTIVE";
}

export function formatRaw(value: bigint, decimals: number, digits = 2) {
  const one = 10n ** BigInt(decimals);
  const whole = value / one;
  const fraction = (value % one)
    .toString()
    .padStart(decimals, "0")
    .slice(0, digits)
    .padEnd(digits, "0");
  return `${whole.toLocaleString()}${digits ? `.${fraction}` : ""}`;
}
