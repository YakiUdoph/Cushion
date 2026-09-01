import { describe, expect, it, vi } from "vitest";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeErrorResult,
  encodeEventTopics,
  parseAbiParameters,
  type Address,
  type Hex,
} from "viem";
import { binaryPoolWriteAbi, orderBookEventsAbi, type BinaryMarket, type BinaryOrderBook } from "@somnia-chain/markets-sdk";
import {
  APPROVAL_GAS,
  EXECUTION_GAS,
  assertMarketExecutable,
  assertExecutionPackageCurrent,
  bookFingerprint,
  buildBuyNoOrderCall,
  buildExecutionPackage,
  buildScopedApprovalCall,
  buyNoWirePrice,
  classifySimulationFailure,
  fundingReadiness,
  simulateExactCall,
  verifyApprovalReceipt,
  verifyOrderReceipt,
  type ExecutionPackage,
  type RpcReceipt,
} from "./lib/execution";
import type { ProtectionPlan } from "./lib/cushion";

const owner = "0x0000000000000000000000000000000000000011" as Address;
const pool = "0x0000000000000000000000000000000000000022" as Address;
const collateral = "0x0000000000000000000000000000000000000033" as Address;
const outcomeToken = "0x0000000000000000000000000000000000000044" as Address;
const marketId = `0x${"01".padStart(64, "0")}` as Hex;

const market = {
  id: marketId, marketId, marketType: "BINARY", poolAddress: pool, marketAddress: "0x0000000000000000000000000000000000000055", yesTokenId: "8", noTokenId: "9", collateral, asset: "BTC", question: "BTC", status: "Trading", oracleQuestion: null, strike: "0", tradingStart: "100", expiry: "2000", winningOutcome: null, resolvedAtBlock: null, resolvedAtTimestamp: null, createdByTx: null, voided: false, backing: "0", nonce: "7", intervalSec: "900", operatorId: 2, venueId: "0xvenue", lastPrice: null, lastTradeAt: null, cumulativeBaseVolume: "0", cumulativeQuoteVolume: "0", tradeCount: "0", baseDecimals: 6, quoteDecimals: 6, createdAtTimestamp: "100",
} as BinaryMarket;
const book: BinaryOrderBook = { yesBids: [], yesAsks: [], noBids: [], noAsks: [{ price: 900000n, quantity: 10_000n }] };
const plan: ProtectionPlan = { style: "balanced", requestedQuantity: 1000n, quantity: 1000n, estimatedCost: 802n, maximumCost: 900n, maximumNoPrice: 900000n, grossPayout: 1000n, netGain: 198n, availableDepth: 10_000n, fullyExecutable: true };
const onchain = { pool, nonce: 7n, collateral, decimals: 6, expiry: 2000n, outcomeToken, noId: 9n, status: 1, isResolved: false, isVoided: false };

function execution(quantity = 1000n): ExecutionPackage {
  return buildExecutionPackage({ owner, market, onchain, plan: { ...plan, quantity }, book, collateralBalanceBefore: 1_000_000n, noBalanceBefore: 0n, nowSeconds: 500n });
}

function binaryPlaced(orderId: bigint) {
  return { address: pool, topics: encodeEventTopics({ abi: [{ type: "event", name: "BinaryOrderPlaced", inputs: [{ name: "orderId", type: "uint128", indexed: true }, { name: "kind", type: "uint8", indexed: false }], anonymous: false }], eventName: "BinaryOrderPlaced", args: { orderId } }) as [Hex, ...Hex[]], data: encodeAbiParameters(parseAbiParameters("uint8"), [2]) };
}

function orderPlaced(orderId: bigint) {
  return {
    address: pool,
    topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: "OrderPlaced", args: { orderId } }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      parseAbiParameters("(uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs) placedOrder"),
      [{ orderId, isBid: true, owner, userData: 0n, price: 198000n, fullQuantity: 1000n, quantityRemaining: 0n, expireTimestampNs: 800_000000000n }],
    ),
  };
}

function fill(orderId: bigint, quantity: bigint, yesPrice = 198000n) {
  return { address: pool, topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: "OrderFilled", args: { takerOrderId: orderId, makerOrderId: 2n } }) as [Hex, ...Hex[]], data: encodeAbiParameters(parseAbiParameters("uint256,uint256,uint256,uint256"), [quantity, 0n, 0n, yesPrice]) };
}

function receipt(logs: RpcReceipt["logs"]): RpcReceipt {
  return { status: "0x1", transactionHash: `0x${"ab".repeat(32)}`, blockNumber: "0x64", logs };
}

describe("allowance and approval", () => {
  it("distinguishes insufficient allowance from insufficient collateral", () => {
    expect(fundingReadiness(1000n, 899n, 900n)).toBe("APPROVAL_REQUIRED");
    expect(fundingReadiness(899n, 900n, 900n)).toBe("INSUFFICIENT_COLLATERAL");
    expect(fundingReadiness(1000n, 900n, 900n)).toBe("READY_FOR_SIMULATION");
  });

  it("constructs and simulates the exact scoped approval without unlimited allowance", async () => {
    const call = buildScopedApprovalCall(owner, collateral, pool, 900n);
    expect(call.gas).toBe(APPROVAL_GAS);
    expect(call.gas >= 0x153431n).toBe(true);
    const invoke = vi.fn(async () => "0x01" as Hex);
    await expect(simulateExactCall(call, invoke)).resolves.toBe("0x01");
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke.mock.calls[0][2][0]).toMatchObject({ from: owner, to: collateral, data: call.data });
  });

  it("requires receipt success and refreshed sufficient allowance", () => {
    expect(verifyApprovalReceipt(receipt([]), 900n, 900n)).toBe(true);
    expect(verifyApprovalReceipt(receipt([]), 899n, 900n)).toBe(false);
    expect(verifyApprovalReceipt({ ...receipt([]), status: "0x0" }, 900n, 900n)).toBe(false);
  });
});

describe("bounded BUY_NO construction", () => {
  it("maps own NO ceiling to the verified YES wire price and IOC order", () => {
    expect(buyNoWirePrice(900000n, 6)).toBe(100000n);
    const call = buildBuyNoOrderCall({ owner, pool, quantity: 1000n, maximumNoPrice: 900000n, decimals: 6, orderExpiryNs: 700_000000000n });
    expect(call.gas).toBe(EXECUTION_GAS);
    const decoded = decodeFunctionData({ abi: binaryPoolWriteAbi, data: call.data });
    expect(decoded.functionName).toBe("placeBinaryOrder");
    expect(decoded.args).toEqual([2, 100000n, 1000n, 700_000000000n, 2, 0, "0x0000000000000000000000000000000000000000", 0n, 0n]);
  });

  it("binds package identity and invalidates price/expiry changes", () => {
    assertMarketExecutable({ market, onchain, plan, book, nowSeconds: 500n });
    expect(() => assertMarketExecutable({ market, onchain, plan, book: { ...book, noAsks: [{ price: 901000n, quantity: 10_000n }] }, nowSeconds: 500n })).toThrow("NO_LIQUIDITY");
    expect(() => assertMarketExecutable({ market, onchain: { ...onchain, expiry: 500n }, plan, book, nowSeconds: 500n })).toThrow("MARKET_CLOSED");
    expect(execution().quoteFingerprint).toBe(bookFingerprint(book));
  });
});

describe("simulation classification", () => {
  it("classifies deterministic reverts without treating them as transport failures", () => {
    const data = encodeErrorResult({ abi: [{ type: "error", name: "ERC20InsufficientAllowance", inputs: [{ name: "spender", type: "address" }, { name: "allowance", type: "uint256" }, { name: "needed", type: "uint256" }] }], errorName: "ERC20InsufficientAllowance", args: [pool, 0n, 900n] });
    expect(classifySimulationFailure(Object.assign(new Error("execution reverted"), { rpcError: { data } }))).toBe("INSUFFICIENT_ALLOWANCE");
    expect(classifySimulationFailure(new TypeError("fetch failed"))).toBe("NETWORK_FAILURE");
    expect(classifySimulationFailure(new Error("invalid quantity"))).toBe("INVALID_QUANTITY");
  });
});

describe("central execution freshness gate", () => {
  const check = (overrides: Partial<Parameters<typeof assertMarketExecutable>[0]> = {}) =>
    assertMarketExecutable({ market, onchain, plan, book, nowSeconds: 500n, quoteTimestamp: 10_000, nowMs: 10_000, ...overrides });

  it("invalidates a displayed quote when its market expires", () => {
    expect(() => check({ onchain: { ...onchain, expiry: 500n } })).toThrow("MARKET_CLOSED");
  });

  it("blocks approval when the market expires immediately beforehand", () => {
    expect(() => check({ nowSeconds: 2000n })).toThrow("MARKET_CLOSED");
  });

  it("blocks simulation when the market expires after approval", () => {
    expect(() => check({ onchain: { ...onchain, status: 4, isResolved: true } })).toThrow("MARKET_CLOSED");
  });

  it("blocks signing when the exact simulated package expires", () => {
    expect(() => assertExecutionPackageCurrent({ expected: execution(), owner, market, onchain, plan, book, nowMs: 900_000 })).toThrow("MARKET_CLOSED");
  });

  it("rejects a Trading to Finalized status transition", () => {
    expect(() => check({ market: { ...market, status: "Finalized" } as BinaryMarket })).toThrow("MARKET_CLOSED");
  });

  it("rejects market nonce or pool rollover", () => {
    expect(() => check({ onchain: { ...onchain, nonce: 8n } })).toThrow("MARKET_STALE");
  });

  it("rejects a replacement market using a different pool", () => {
    const replacement = "0x0000000000000000000000000000000000000066" as Address;
    expect(() => check({ onchain: { ...onchain, pool: replacement } })).toThrow("MARKET_STALE");
  });

  it("does not carry an old pool allowance to a replacement pool", () => {
    expect(fundingReadiness(1000n, 0n, 900n)).toBe("APPROVAL_REQUIRED");
  });

  it("invalidates a quote after the freshness timeout", () => {
    expect(() => check({ quoteTimestamp: 1_000, nowMs: 31_001 })).toThrow("QUOTE_STALE");
  });

  it("distinguishes a Trading market that is too close to expiry", () => {
    expect(() => check({ onchain: { ...onchain, expiry: 1099n } })).toThrow("TOO_CLOSE_TO_EXPIRY");
  });

  it("rejects an empty post-expiration book", () => {
    expect(() => check({ book: { ...book, noAsks: [] } })).toThrow("NO_LIQUIDITY");
  });

  it("blocks approval for a stale selected pool before call construction", () => {
    expect(() => check({ market: { ...market, poolAddress: "0x0000000000000000000000000000000000000066" } as BinaryMarket })).toThrow("MARKET_STALE");
  });

  it("blocks Confirm Cushion when a simulated package's book changed", () => {
    const changedBook = { ...book, noAsks: [{ price: 899000n, quantity: 10_000n }] };
    expect(() => assertExecutionPackageCurrent({ expected: execution(), owner, market, onchain, plan, book: changedBook, nowMs: 600_000 })).toThrow("MARKET_STALE");
  });
});

describe("authoritative fill verification", () => {
  it("verifies a full fill, price improvement, spend, and owned-position delta", () => {
    const verified = verifyOrderReceipt({ receipt: receipt([binaryPlaced(1n), orderPlaced(1n), fill(1n, 1000n)]), execution: execution(), collateralBalanceAfter: 999_198n, noBalanceAfter: 1000n });
    expect(verified.classification).toBe("FULL_FILL");
    expect(verified.actualSpend).toBe(802n);
    expect(verified.actualAverageNoPrice).toBe(802000n);
    expect(verified.actualAverageNoPrice! < plan.maximumNoPrice).toBe(true);
    expect(verified.ownedPositionVerified).toBe(true);
  });

  it("reports partial fill and the unfilled IOC quantity", () => {
    const verified = verifyOrderReceipt({ receipt: receipt([binaryPlaced(1n), orderPlaced(1n), fill(1n, 1000n)]), execution: execution(2000n), collateralBalanceAfter: 999_198n, noBalanceAfter: 1000n });
    expect(verified.classification).toBe("PARTIAL_FILL");
    expect(verified.unfilledQuantity).toBe(1000n);
  });

  it("treats receipt success with no protocol fill as NO_FILL", () => {
    const verified = verifyOrderReceipt({ receipt: receipt([binaryPlaced(1n), orderPlaced(1n)]), execution: execution(), collateralBalanceAfter: 1_000_000n, noBalanceAfter: 0n });
    expect(verified.classification).toBe("NO_FILL");
    expect(verified.ownedPositionVerified).toBe(false);
  });

  it("rejects a fill when resulting owned position cannot be verified", () => {
    expect(() => verifyOrderReceipt({ receipt: receipt([binaryPlaced(1n), orderPlaced(1n), fill(1n, 1000n)]), execution: execution(), collateralBalanceAfter: 999_198n, noBalanceAfter: 0n })).toThrow("OWNED_POSITION_UNVERIFIED");
  });
});
