import {
  binaryPoolWriteAbi,
  orderBookEventsAbi,
  type BinaryMarket,
  type BinaryOrderBook,
} from "@somnia-chain/markets-sdk";
import {
  decodeErrorResult,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import {
  FALLBACK_RPC,
  PRIMARY_RPC,
  SHANNON_CHAIN_ID,
  rpcCall,
  type ProtectionPlan,
} from "./cushion";

export const EXECUTION_GAS = 10_000_000n;
// Shannon's RPC estimates 0x153431 (1,389,617) for the deployed tUSDC
// approval path. The former 150k envelope deterministically ran out of gas.
export const APPROVAL_GAS = 1_500_000n;
// Two wallet confirmations (approval + order), receipt inclusion, a fresh
// simulation, and human review must all fit inside this window.
export const MIN_SAFE_EXECUTION_TIME_REMAINING = 600n;
export const QUOTE_FRESHNESS_MS = 30_000;
export const ORDER_TTL_SECONDS = 300n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
]);
const erc6909Abi = parseAbi(["function balanceOf(address owner,uint256 id) view returns (uint256)"]);
const binaryPlacedAbi = [
  {
    type: "event",
    name: "BinaryOrderPlaced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      { name: "kind", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
] as const;
const simulationErrorsAbi = parseAbi([
  "error ERC20InsufficientAllowance(address spender,uint256 allowance,uint256 needed)",
  "error ERC20InsufficientBalance(address sender,uint256 balance,uint256 needed)",
  "error InvalidPrice(uint256 price,uint256 tickSize)",
  "error InvalidQuantity(uint256 quantity,uint256 lotSize)",
  "error OrderAlreadyExpired()",
  "error OrderExpiryBeyondMarket(uint64 expiry,uint64 marketExpiry)",
]);

export type UnsignedExecutionCall = {
  from: Address;
  to: Address;
  data: Hex;
  value: bigint;
  gas: bigint;
};

export type ExecutionPackage = {
  chainId: typeof SHANNON_CHAIN_ID;
  caller: Address;
  marketId: Hex;
  pool: Address;
  marketNonce: bigint;
  collateral: Address;
  collateralDecimals: number;
  outcomeToken: Address;
  noOutcomeId: bigint;
  quantity: bigint;
  maximumNoPrice: bigint;
  maximumCost: bigint;
  marketExpiry: bigint;
  orderExpiryNs: bigint;
  quoteFingerprint: string;
  call: UnsignedExecutionCall;
  collateralBalanceBefore: bigint;
  noBalanceBefore: bigint;
};

export type SimulationFailure =
  | "NETWORK_FAILURE"
  | "INSUFFICIENT_ALLOWANCE"
  | "INSUFFICIENT_COLLATERAL"
  | "INVALID_MARKET"
  | "INVALID_PRICE"
  | "INVALID_QUANTITY"
  | "EXPIRED_ORDER"
  | "SIMULATION_REVERT"
  | "OTHER";

export type FreshnessFailure =
  | "MARKET_CLOSED"
  | "MARKET_STALE"
  | "QUOTE_STALE"
  | "TOO_CLOSE_TO_EXPIRY"
  | "NO_LIQUIDITY";

export type RpcReceipt = {
  status: Hex;
  transactionHash: Hex;
  blockNumber: Hex;
  logs: Array<{ address: Address; topics: [Hex, ...Hex[]]; data: Hex }>;
};

export type FillVerification = {
  classification: "FULL_FILL" | "PARTIAL_FILL" | "NO_FILL";
  transactionHash: Hex;
  blockNumber: bigint;
  orderId: bigint | null;
  requestedQuantity: bigint;
  filledQuantity: bigint;
  unfilledQuantity: bigint;
  actualSpend: bigint;
  actualAverageNoPrice: bigint | null;
  ownedPositionVerified: boolean;
};

export function fundingReadiness(balance: bigint, allowance: bigint, required: bigint) {
  if (balance < required) return "INSUFFICIENT_COLLATERAL" as const;
  if (allowance < required) return "APPROVAL_REQUIRED" as const;
  return "READY_FOR_SIMULATION" as const;
}

function quantityAtOrBelow(book: BinaryOrderBook, maxNoPrice: bigint) {
  return book.noAsks.reduce((sum, level) => (level.price <= maxNoPrice ? sum + level.quantity : sum), 0n);
}

export function bookFingerprint(book: BinaryOrderBook) {
  return book.noAsks.map((level) => `${level.price}:${level.quantity}`).join("|");
}

export function buyNoWirePrice(maximumNoPrice: bigint, decimals: number) {
  const one = 10n ** BigInt(decimals);
  if (maximumNoPrice <= 0n || maximumNoPrice >= one) throw new Error("INVALID_PRICE");
  return one - maximumNoPrice;
}

export function buildScopedApprovalCall(owner: Address, token: Address, spender: Address, amount: bigint): UnsignedExecutionCall {
  if (amount <= 0n) throw new Error("INVALID_APPROVAL_AMOUNT");
  return { from: owner, to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }), value: 0n, gas: APPROVAL_GAS };
}

export function buildBuyNoOrderCall(input: {
  owner: Address;
  pool: Address;
  quantity: bigint;
  maximumNoPrice: bigint;
  decimals: number;
  orderExpiryNs: bigint;
}): UnsignedExecutionCall {
  if (input.quantity <= 0n) throw new Error("INVALID_QUANTITY");
  const wirePrice = buyNoWirePrice(input.maximumNoPrice, input.decimals);
  return {
    from: input.owner,
    to: input.pool,
    data: encodeFunctionData({
      abi: binaryPoolWriteAbi,
      functionName: "placeBinaryOrder",
      args: [2, wirePrice, input.quantity, input.orderExpiryNs, 2, 0, ZERO_ADDRESS, 0n, 0n],
    }),
    value: 0n,
    gas: EXECUTION_GAS,
  };
}

export function hexQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}` as Hex;
}

export function transactionRequest(call: UnsignedExecutionCall) {
  return { from: call.from, to: call.to, data: call.data, value: hexQuantity(call.value), gas: hexQuantity(call.gas) };
}

export function classifySimulationFailure(error: unknown): SimulationFailure {
  const raw = error as { message?: string; rpcError?: { data?: unknown; message?: string } };
  const message = `${raw?.message ?? ""} ${raw?.rpcError?.message ?? ""}`.toLowerCase();
  const dataValue = raw?.rpcError?.data;
  const data = typeof dataValue === "string" ? dataValue : typeof dataValue === "object" && dataValue && "data" in dataValue ? String((dataValue as { data: unknown }).data) : "";
  if (data.startsWith("0x")) {
    try {
      const decoded = decodeErrorResult({ abi: simulationErrorsAbi, data: data as Hex });
      if (decoded.errorName === "ERC20InsufficientAllowance") return "INSUFFICIENT_ALLOWANCE";
      if (decoded.errorName === "ERC20InsufficientBalance") return "INSUFFICIENT_COLLATERAL";
      if (decoded.errorName === "InvalidPrice") return "INVALID_PRICE";
      if (decoded.errorName === "InvalidQuantity") return "INVALID_QUANTITY";
      if (decoded.errorName === "OrderAlreadyExpired" || decoded.errorName === "OrderExpiryBeyondMarket") return "EXPIRED_ORDER";
    } catch { /* preserve raw revert as SIMULATION_REVERT */ }
    return "SIMULATION_REVERT";
  }
  if (message.includes("allowance")) return "INSUFFICIENT_ALLOWANCE";
  if (message.includes("balance") || message.includes("collateral")) return "INSUFFICIENT_COLLATERAL";
  if (message.includes("invalid market") || message.includes("not trading")) return "INVALID_MARKET";
  if (message.includes("price")) return "INVALID_PRICE";
  if (message.includes("quantity")) return "INVALID_QUANTITY";
  if (message.includes("expired") || message.includes("expiry")) return "EXPIRED_ORDER";
  if (error instanceof TypeError || message.includes("network") || message.includes("fetch")) return "NETWORK_FAILURE";
  return message ? "OTHER" : "SIMULATION_REVERT";
}

export async function simulateExactCall(
  call: UnsignedExecutionCall,
  invoke: typeof rpcCall = rpcCall
) {
  const params = [transactionRequest(call), "latest"];
  try {
    return await invoke<Hex>(PRIMARY_RPC, "eth_call", params);
  } catch (error) {
    if (classifySimulationFailure(error) !== "NETWORK_FAILURE") throw error;
    return invoke<Hex>(FALLBACK_RPC, "eth_call", params);
  }
}

async function readCall<T>(to: Address, data: Hex, decode: (value: Hex) => T): Promise<T> {
  let result: Hex;
  try {
    result = await rpcCall<Hex>(PRIMARY_RPC, "eth_call", [{ to, data }, "latest"]);
  } catch (error) {
    if (classifySimulationFailure(error) !== "NETWORK_FAILURE") throw error;
    result = await rpcCall<Hex>(FALLBACK_RPC, "eth_call", [{ to, data }, "latest"]);
  }
  return decode(result);
}

export async function readErc20State(token: Address, owner: Address, spender: Address) {
  const [balance, allowance] = await Promise.all([
    readCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [owner] }), (data) => decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data })),
    readCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "allowance", args: [owner, spender] }), (data) => decodeFunctionResult({ abi: erc20Abi, functionName: "allowance", data })),
  ]);
  return { balance, allowance };
}

export async function readOutcomeBalance(token: Address, owner: Address, id: bigint) {
  return readCall(token, encodeFunctionData({ abi: erc6909Abi, functionName: "balanceOf", args: [owner, id] }), (data) => decodeFunctionResult({ abi: erc6909Abi, functionName: "balanceOf", data }));
}

export function assertMarketExecutable(input: { market: BinaryMarket; onchain: { pool: Address; nonce: bigint; collateral: Address; expiry: bigint; status: number; isResolved: boolean; isVoided: boolean }; plan: ProtectionPlan; book: BinaryOrderBook; nowSeconds?: bigint; quoteTimestamp?: number; nowMs?: number }) {
  const now = input.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  if (input.market.marketId.toLowerCase() !== input.market.id.toLowerCase()) throw new Error("MARKET_STALE");
  if (input.market.status !== "Trading" || input.onchain.status !== 1 || input.onchain.isResolved || input.onchain.isVoided || input.onchain.expiry <= now) throw new Error("MARKET_CLOSED");
  if (input.onchain.pool.toLowerCase() !== input.market.poolAddress.toLowerCase() || input.onchain.nonce !== BigInt(input.market.nonce ?? "-1") || input.onchain.collateral.toLowerCase() !== input.market.collateral.toLowerCase()) throw new Error("MARKET_STALE");
  if (input.onchain.expiry - now < MIN_SAFE_EXECUTION_TIME_REMAINING) throw new Error("TOO_CLOSE_TO_EXPIRY");
  if (input.quoteTimestamp !== undefined && (input.nowMs ?? Date.now()) - input.quoteTimestamp > QUOTE_FRESHNESS_MS) throw new Error("QUOTE_STALE");
  if (!input.book.noAsks.length || quantityAtOrBelow(input.book, input.plan.maximumNoPrice) < input.plan.quantity) throw new Error("NO_LIQUIDITY");
}

export function assertExecutionPackageCurrent(input: { expected: ExecutionPackage; owner: Address; market: BinaryMarket; onchain: { pool: Address; nonce: bigint; expiry: bigint }; plan: ProtectionPlan; book: BinaryOrderBook; nowMs?: number }) {
  const nowMs = input.nowMs ?? Date.now();
  if (input.expected.orderExpiryNs <= BigInt(nowMs) * 1_000_000n) throw new Error("MARKET_CLOSED");
  const unchanged = input.expected.caller.toLowerCase() === input.owner.toLowerCase()
    && input.expected.marketId.toLowerCase() === input.market.marketId.toLowerCase()
    && input.expected.pool.toLowerCase() === input.onchain.pool.toLowerCase()
    && input.expected.marketNonce === input.onchain.nonce
    && input.expected.marketExpiry === input.onchain.expiry
    && input.expected.quoteFingerprint === bookFingerprint(input.book)
    && input.expected.maximumCost === input.plan.maximumCost
    && input.expected.maximumNoPrice === input.plan.maximumNoPrice
    && input.expected.quantity === input.plan.quantity;
  if (!unchanged) throw new Error("MARKET_STALE");
}

export function buildExecutionPackage(input: {
  owner: Address;
  market: BinaryMarket;
  onchain: { pool: Address; nonce: bigint; collateral: Address; decimals: number; expiry: bigint; outcomeToken: Address; noId: bigint };
  plan: ProtectionPlan;
  book: BinaryOrderBook;
  collateralBalanceBefore: bigint;
  noBalanceBefore: bigint;
  nowSeconds?: bigint;
}): ExecutionPackage {
  const now = input.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const expirySeconds = now + ORDER_TTL_SECONDS < input.onchain.expiry - 1n ? now + ORDER_TTL_SECONDS : input.onchain.expiry - 1n;
  const orderExpiryNs = expirySeconds * 1_000_000_000n;
  const call = buildBuyNoOrderCall({ owner: input.owner, pool: input.onchain.pool, quantity: input.plan.quantity, maximumNoPrice: input.plan.maximumNoPrice, decimals: input.onchain.decimals, orderExpiryNs });
  return { chainId: SHANNON_CHAIN_ID, caller: input.owner, marketId: input.market.marketId, pool: input.onchain.pool, marketNonce: input.onchain.nonce, collateral: input.onchain.collateral, collateralDecimals: input.onchain.decimals, outcomeToken: input.onchain.outcomeToken, noOutcomeId: input.onchain.noId, quantity: input.plan.quantity, maximumNoPrice: input.plan.maximumNoPrice, maximumCost: input.plan.maximumCost, marketExpiry: input.onchain.expiry, orderExpiryNs, quoteFingerprint: bookFingerprint(input.book), call, collateralBalanceBefore: input.collateralBalanceBefore, noBalanceBefore: input.noBalanceBefore };
}

export async function waitForReceipt(hash: Hex, timeoutMs = 120_000, pollMs = 1_000): Promise<RpcReceipt> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let receipt: RpcReceipt | null;
    try {
      receipt = await rpcCall<RpcReceipt | null>(PRIMARY_RPC, "eth_getTransactionReceipt", [hash]);
    } catch (error) {
      if (classifySimulationFailure(error) !== "NETWORK_FAILURE") throw error;
      receipt = await rpcCall<RpcReceipt | null>(FALLBACK_RPC, "eth_getTransactionReceipt", [hash]);
    }
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error("RECEIPT_TIMEOUT");
}

export function verifyApprovalReceipt(receipt: RpcReceipt, allowanceAfter: bigint, required: bigint) {
  return receipt.status === "0x1" && allowanceAfter >= required;
}

export function verifyOrderReceipt(input: { receipt: RpcReceipt; execution: ExecutionPackage; collateralBalanceAfter: bigint; noBalanceAfter: bigint }): FillVerification {
  if (input.receipt.status !== "0x1") throw new Error("TRANSACTION_FAILED");
  let orderId: bigint | null = null;
  const fills: Array<{ quantity: bigint; yesPrice: bigint }> = [];
  for (const log of input.receipt.logs) {
    if (log.address.toLowerCase() !== input.execution.pool.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: binaryPlacedAbi, data: log.data, topics: log.topics, strict: true });
      if (decoded.eventName === "BinaryOrderPlaced" && decoded.args.kind === 2) orderId = decoded.args.orderId;
    } catch { /* another pool event */ }
  }
  if (orderId != null) {
    let orderOwnerVerified = false;
    for (const log of input.receipt.logs) {
      if (log.address.toLowerCase() !== input.execution.pool.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: orderBookEventsAbi, data: log.data, topics: log.topics, strict: true });
        if (decoded.eventName === "OrderPlaced" && decoded.args.orderId === orderId && decoded.args.placedOrder.owner.toLowerCase() === input.execution.caller.toLowerCase()) orderOwnerVerified = true;
        if (decoded.eventName === "OrderFilled" && decoded.args.takerOrderId === orderId) fills.push({ quantity: decoded.args.quantityFilled, yesPrice: decoded.args.fillPrice });
      } catch { /* binary-specific or unrelated event */ }
    }
    if (!orderOwnerVerified) throw new Error("ORDER_OWNERSHIP_UNVERIFIED");
  }
  if (orderId == null) throw new Error("DREAMDEX_ORDER_UNVERIFIED");
  const filledQuantity = fills.reduce((sum, fill) => sum + fill.quantity, 0n);
  const one = 10n ** BigInt(input.execution.collateralDecimals);
  if (filledQuantity > input.execution.quantity) throw new Error("INVALID_FILL_QUANTITY");
  if (fills.some((fill) => one - fill.yesPrice > input.execution.maximumNoPrice)) throw new Error("MAXIMUM_PRICE_EXCEEDED");
  const computedSpend = fills.reduce((sum, fill) => sum + (fill.quantity * (one - fill.yesPrice) + one - 1n) / one, 0n);
  const balanceSpend = input.execution.collateralBalanceBefore > input.collateralBalanceAfter ? input.execution.collateralBalanceBefore - input.collateralBalanceAfter : 0n;
  const positionDelta = input.noBalanceAfter > input.execution.noBalanceBefore ? input.noBalanceAfter - input.execution.noBalanceBefore : 0n;
  const ownedPositionVerified = filledQuantity > 0n && positionDelta >= filledQuantity;
  if (filledQuantity > 0n && !ownedPositionVerified) throw new Error("OWNED_POSITION_UNVERIFIED");
  const actualSpend = balanceSpend || computedSpend;
  if (actualSpend > input.execution.maximumCost) throw new Error("MAXIMUM_COST_EXCEEDED");
  const actualAverageNoPrice = filledQuantity ? (actualSpend * one) / filledQuantity : null;
  const classification = filledQuantity === 0n ? "NO_FILL" : filledQuantity >= input.execution.quantity ? "FULL_FILL" : "PARTIAL_FILL";
  return { classification, transactionHash: input.receipt.transactionHash, blockNumber: BigInt(input.receipt.blockNumber), orderId, requestedQuantity: input.execution.quantity, filledQuantity, unfilledQuantity: input.execution.quantity > filledQuantity ? input.execution.quantity - filledQuantity : 0n, actualSpend, actualAverageNoPrice, ownedPositionVerified };
}
