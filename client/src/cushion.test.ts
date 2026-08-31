import { describe, expect, it } from "vitest";
import {
  buildAssetRegistry,
  calculateProtectionPlans,
  deriveWatchState,
  formatRaw,
  isCompatibleTradingMarket,
  plansCollapseAtDepth,
} from "./lib/cushion";
import type { BinaryMarket, BinaryOrderBook } from "@somnia-chain/markets-sdk";

const market = (extra: Partial<BinaryMarket> = {}) =>
  ({
    marketType: "BINARY",
    id: "0x01",
    marketId: "0x01",
    poolAddress: "0x0000000000000000000000000000000000000001",
    marketAddress: "0x0000000000000000000000000000000000000002",
    yesTokenId: "1",
    noTokenId: "2",
    collateral: "0x0000000000000000000000000000000000000003",
    asset: "BTC",
    question: "BTC",
    status: "Trading",
    oracleQuestion: null,
    strike: "0",
    tradingStart: "100",
    expiry: "1000",
    winningOutcome: null,
    resolvedAtBlock: null,
    resolvedAtTimestamp: null,
    createdByTx: null,
    voided: false,
    backing: "0",
    nonce: "2",
    intervalSec: "900",
    operatorId: 2,
    venueId: "0xvenue",
    lastPrice: null,
    lastTradeAt: null,
    cumulativeBaseVolume: "0",
    cumulativeQuoteVolume: "0",
    tradeCount: "0",
    baseDecimals: 6,
    quoteDecimals: 6,
    createdAtTimestamp: "100",
    ...extra,
  }) as BinaryMarket;

describe("Phase 1A market registry", () => {
  it("requires current DreamDEX Trading markets and excludes expired rows", () => {
    expect(isCompatibleTradingMarket(market(), 500n)).toBe(true);
    expect(
      isCompatibleTradingMarket(market({ status: "Resolved" }), 500n)
    ).toBe(false);
    expect(isCompatibleTradingMarket(market({ expiry: "400" }), 500n)).toBe(
      false
    );
    expect(isCompatibleTradingMarket(market({ operatorId: 3 }), 500n)).toBe(
      false
    );
  });
  it("derives assets and horizons without a static allowlist", () => {
    const registry = buildAssetRegistry(
      [
        market(),
        market({
          id: "0x02",
          marketId: "0x02",
          asset: "ETH",
          intervalSec: "3600",
        }),
      ],
      500n
    );
    expect(registry.map(x => x.symbol)).toEqual(["BTC", "ETH"]);
    expect(registry[1].markets[0].intervalSeconds).toBe(3600n);
  });

  it("does not publish an unsupported asset or unavailable window", () => {
    const registry = buildAssetRegistry(
      [market(), market({ id: "0x02", marketId: "0x02", asset: "SOMI", status: "Listed" })],
      500n,
    );
    expect(registry.find((row) => row.symbol === "SOMI")).toBeUndefined();
    expect(registry[0].markets.some((row) => row.intervalSeconds === 3600n)).toBe(false);
  });
});

describe("bigint protection engine", () => {
  it("sizes Light, Balanced, and Maximum independently when depth is sufficient", () => {
    const book: BinaryOrderBook = {
      yesBids: [],
      yesAsks: [],
      noBids: [],
      noAsks: [{ price: 300000n, quantity: 10000_000000n }],
    };
    const plans = calculateProtectionPlans(4000_000000n, book, 6);
    expect(plans.map((plan) => plan.requestedQuantity)).toEqual([1000_000000n, 2000_000000n, 4000_000000n]);
    expect(plans.map((plan) => plan.quantity)).toEqual([1000_000000n, 2000_000000n, 4000_000000n]);
    expect(plans.every((plan) => plan.fullyExecutable)).toBe(true);
  });

  it("derives the observed 990 shares from 200 + 330 + 460 shares of depth", () => {
    const book: BinaryOrderBook = {
      yesBids: [],
      yesAsks: [],
      noBids: [],
      noAsks: [
        { price: 695000n, quantity: 200_000000n },
        { price: 701000n, quantity: 330_000000n },
        { price: 709000n, quantity: 460_000000n },
      ],
    };
    const plans = calculateProtectionPlans(4000_000000n, book, 6);
    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => plan.requestedQuantity)).toEqual([1000_000000n, 2000_000000n, 4000_000000n]);
    expect(plans.every((plan) => plan.quantity === 990_000000n)).toBe(true);
    expect(plans[1].estimatedCost).toBe(696_470000n);
    expect(plans[1].maximumCost).toBe(701_910000n);
    expect(plans[1].grossPayout).toBe(990_000000n);
    expect(plans[1].netGain).toBe(293_530000n);
    expect(plansCollapseAtDepth(plans)).toBe(true);
    expect(plans.every((plan) => plan.estimatedCost <= plan.maximumCost)).toBe(true);
  });

  it("partially fills a plan when market depth is insufficient", () => {
    const book: BinaryOrderBook = { yesBids: [], yesAsks: [], noBids: [], noAsks: [{ price: 500000n, quantity: 400_000000n }] };
    const plans = calculateProtectionPlans(4000_000000n, book, 6);
    expect(plans.every((plan) => !plan.fullyExecutable && plan.quantity === 400_000000n)).toBe(true);
  });

  it("preserves bigint precision when converting raw collateral for display", () => {
    expect(formatRaw(696_470001n, 6)).toBe("696.47");
    expect(formatRaw(1n, 6, 6)).toBe("0.000001");
  });
  it("returns no fabricated plan for an empty book", () =>
    expect(
      calculateProtectionPlans(
        1_000000n,
        { yesBids: [], yesAsks: [], noBids: [], noAsks: [] },
        6
      )
    ).toEqual([]));
});

describe("WATCH state", () => {
  it("never derives a winner before authoritative resolution", () =>
    expect(
      deriveWatchState(
        {
          status: "Settling",
          expiry: 100n,
          voided: false,
          winningOutcome: 1,
          heldOutcome: 1,
          balance: 1n,
        },
        200n
      )
    ).toBe("AWAITING_RESOLUTION"));
  it("derives claimable and lost only after authoritative state", () => {
    expect(
      deriveWatchState(
        {
          status: "Resolved",
          expiry: 100n,
          voided: false,
          winningOutcome: 1,
          heldOutcome: 1,
          balance: 1n,
        },
        200n
      )
    ).toBe("CLAIMABLE");
    expect(
      deriveWatchState(
        {
          status: "Resolved",
          expiry: 100n,
          voided: false,
          winningOutcome: 0,
          heldOutcome: 1,
          balance: 1n,
        },
        200n
      )
    ).toBe("LOST");
  });
});
