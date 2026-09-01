import { useCallback, useEffect, useMemo, useState } from "react";
import type { BinaryMarket, BinaryOrderBook, SomniaMarketsClient } from "@somnia-chain/markets-sdk";
import type { Address, Hex } from "viem";
import type { WalletState } from "./useWallet";
import type { ProtectionPlan } from "@/lib/cushion";
import {
  assertMarketExecutable,
  assertExecutionPackageCurrent,
  buildExecutionPackage,
  buildScopedApprovalCall,
  classifySimulationFailure,
  fundingReadiness,
  MIN_SAFE_EXECUTION_TIME_REMAINING,
  QUOTE_FRESHNESS_MS,
  readErc20State,
  readOutcomeBalance,
  simulateExactCall,
  transactionRequest,
  verifyApprovalReceipt,
  verifyOrderReceipt,
  waitForReceipt,
  type ExecutionPackage,
  type FillVerification,
  type SimulationFailure,
} from "@/lib/execution";

export type ExecutionStatus =
  | "DISCONNECTED"
  | "WRONG_NETWORK"
  | "CHECKING"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_SIMULATING"
  | "APPROVAL_WAITING_FOR_WALLET"
  | "APPROVAL_SUBMITTED"
  | "APPROVAL_CONFIRMING"
  | "APPROVAL_CONFIRMED"
  | "APPROVAL_FAILED"
  | "READY_FOR_SIMULATION"
  | "SIMULATING"
  | "SIMULATION_FAILED"
  | "SIMULATION_PASSED"
  | "WAITING_FOR_WALLET"
  | "TRANSACTION_SUBMITTED"
  | "VERIFYING_DREAMDEX"
  | "FULL_FILL"
  | "PARTIAL_FILL"
  | "NO_FILL"
  | "TRANSACTION_FAILED"
  | "PRICE_MOVED"
  | "INSUFFICIENT_COLLATERAL"
  | "MARKET_CLOSED"
  | "MARKET_STALE"
  | "QUOTE_STALE"
  | "TOO_CLOSE_TO_EXPIRY"
  | "NO_LIQUIDITY";

type ExecutionContext = {
  wallet: WalletState;
  market?: BinaryMarket;
  book: BinaryOrderBook | null;
  plan?: ProtectionPlan;
  client: SomniaMarketsClient;
  onVerified?: () => void;
  quoteTimestamp: number | null;
};

type Snapshot = { balance: bigint; allowance: bigint };

function freshnessStatus(error: unknown): ExecutionStatus | null {
  const code = String((error as Error)?.message ?? error);
  if (["MARKET_CLOSED", "MARKET_STALE", "QUOTE_STALE", "TOO_CLOSE_TO_EXPIRY", "NO_LIQUIDITY"].includes(code)) return code as ExecutionStatus;
  if (code.includes("PRICE_MOVED")) return "PRICE_MOVED";
  return null;
}

export function useExecution({ wallet, market, book, plan, client, onVerified, quoteTimestamp }: ExecutionContext) {
  const [status, setStatus] = useState<ExecutionStatus>("DISCONNECTED");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [execution, setExecution] = useState<ExecutionPackage | null>(null);
  const [result, setResult] = useState<FillVerification | null>(null);
  const [transactionHash, setTransactionHash] = useState<Hex | null>(null);
  const [failure, setFailure] = useState<SimulationFailure | string | null>(null);

  const prerequisites = useMemo(() => Boolean(market && book && plan && wallet.address), [book, market, plan, wallet.address]);

  const refreshFunding = useCallback(async () => {
    if (wallet.status !== "CONNECTED" || !wallet.address || !market || !plan) return null;
    setStatus("CHECKING");
    const next = await readErc20State(market.collateral, wallet.address as Address, market.poolAddress);
    setSnapshot(next);
    setStatus(fundingReadiness(next.balance, next.allowance, plan.maximumCost));
    return next;
  }, [market, plan, wallet.address, wallet.status]);

  useEffect(() => {
    setExecution(null); setResult(null); setFailure(null); setTransactionHash(null);
    if (wallet.status === "DISCONNECTED" || wallet.status === "CONNECTING" || wallet.status === "ERROR") { setStatus("DISCONNECTED"); return; }
    if (wallet.status === "WRONG_NETWORK") { setStatus("WRONG_NETWORK"); return; }
    if (!prerequisites) { setStatus("CHECKING"); return; }
    void refreshFunding().catch((error) => { setFailure(classifySimulationFailure(error)); setStatus("TRANSACTION_FAILED"); });
  }, [prerequisites, refreshFunding, wallet.status]);

  useEffect(() => {
    if (!market || wallet.status !== "CONNECTED") return;
    const invalidateIfNeeded = () => {
      const remaining = BigInt(market.expiry) - BigInt(Math.floor(Date.now() / 1000));
      if (remaining <= 0n || market.status !== "Trading") {
        setExecution(null); setStatus("MARKET_CLOSED"); return;
      }
      if (remaining < MIN_SAFE_EXECUTION_TIME_REMAINING) {
        setExecution(null); setStatus("TOO_CLOSE_TO_EXPIRY"); return;
      }
      if (quoteTimestamp && Date.now() - quoteTimestamp > QUOTE_FRESHNESS_MS) {
        setExecution(null); setStatus("QUOTE_STALE");
      }
    };
    invalidateIfNeeded();
    const timer = window.setInterval(invalidateIfNeeded, 1_000);
    return () => window.clearInterval(timer);
  }, [market, quoteTimestamp, wallet.status]);

  const assertWalletChain = async () => {
    if (!window.ethereum || !wallet.address) throw new Error("DISCONNECTED");
    const chainHex = await window.ethereum.request<string>({ method: "eth_chainId" });
    if (Number.parseInt(chainHex, 16) !== 50312) throw new Error("WRONG_NETWORK");
  };

  const enable = async () => {
    if (!market || !plan || !wallet.address || !window.ethereum) return;
    try {
      await assertWalletChain();
      const { onchain, funding: before } = await revalidate(undefined, false);
      if (before.balance < plan.maximumCost) { setStatus("INSUFFICIENT_COLLATERAL"); return; }
      if (before.allowance >= plan.maximumCost) { setSnapshot(before); setStatus("READY_FOR_SIMULATION"); return; }
      const approval = buildScopedApprovalCall(wallet.address as Address, onchain.collateral, onchain.pool, plan.maximumCost);
      setStatus("APPROVAL_SIMULATING");
      await simulateExactCall(approval);
      const latest = await revalidate(undefined, false);
      if (latest.onchain.pool.toLowerCase() !== onchain.pool.toLowerCase() || latest.onchain.collateral.toLowerCase() !== onchain.collateral.toLowerCase()) throw new Error("MARKET_STALE");
      if (latest.funding.balance < plan.maximumCost) { setStatus("INSUFFICIENT_COLLATERAL"); return; }
      if (latest.funding.allowance >= plan.maximumCost) { setSnapshot(latest.funding); setStatus("READY_FOR_SIMULATION"); return; }
      setStatus("APPROVAL_WAITING_FOR_WALLET");
      const hash = await window.ethereum.request<Hex>({ method: "eth_sendTransaction", params: [transactionRequest(approval)] });
      setTransactionHash(hash); setStatus("APPROVAL_SUBMITTED");
      setStatus("APPROVAL_CONFIRMING");
      const receipt = await waitForReceipt(hash);
      const after = await readErc20State(onchain.collateral, wallet.address as Address, onchain.pool);
      if (!verifyApprovalReceipt(receipt, after.allowance, plan.maximumCost)) throw new Error("APPROVAL_FAILED");
      setSnapshot(after); setTransactionHash(null); setStatus("APPROVAL_CONFIRMED");
      setStatus("READY_FOR_SIMULATION");
    } catch (error) {
      setFailure(classifySimulationFailure(error)); setExecution(null); setStatus(freshnessStatus(error) ?? "APPROVAL_FAILED");
    }
  };

  const revalidate = async (expected?: ExecutionPackage, requireAllowance = true) => {
    if (!market || !plan || !wallet.address) throw new Error("INVALID_MARKET");
    await assertWalletChain();
    const [onchain, freshBook, funding] = await Promise.all([
      client.getMarketOnchain(market.marketId),
      client.getBinaryOrderBook(market.poolAddress, { depth: 50 }),
      readErc20State(market.collateral, wallet.address as Address, market.poolAddress),
    ]);
    assertMarketExecutable({ market, onchain, plan, book: freshBook, quoteTimestamp: Date.now() });
    if (funding.balance < plan.maximumCost) throw new Error("INSUFFICIENT_COLLATERAL");
    if (requireAllowance && funding.allowance < plan.maximumCost) throw new Error("INSUFFICIENT_ALLOWANCE");
    if (expected) {
      assertExecutionPackageCurrent({ expected, owner: wallet.address as Address, market, onchain, plan, book: freshBook });
    }
    return { onchain, freshBook, funding };
  };

  const simulate = async () => {
    if (!market || !plan || !wallet.address) return;
    setFailure(null); setStatus("SIMULATING");
    try {
      const { onchain, freshBook, funding } = await revalidate();
      const noBalanceBefore = await readOutcomeBalance(onchain.outcomeToken, wallet.address as Address, onchain.noId);
      const next = buildExecutionPackage({ owner: wallet.address as Address, market, onchain, plan, book: freshBook, collateralBalanceBefore: funding.balance, noBalanceBefore });
      await simulateExactCall(next.call);
      setSnapshot(funding); setExecution(next); setStatus("SIMULATION_PASSED");
    } catch (error) {
      const reason = classifySimulationFailure(error);
      setFailure(reason);
      setStatus(freshnessStatus(error) ?? "SIMULATION_FAILED");
    }
  };

  const confirm = async () => {
    if (!execution || !market || !plan || !wallet.address || !window.ethereum) return;
    try {
      await revalidate(execution);
      setStatus("WAITING_FOR_WALLET");
      const hash = await window.ethereum.request<Hex>({ method: "eth_sendTransaction", params: [transactionRequest(execution.call)] });
      setTransactionHash(hash); setStatus("TRANSACTION_SUBMITTED");
      const receipt = await waitForReceipt(hash);
      setStatus("VERIFYING_DREAMDEX");
      const [collateralAfter, noAfter] = await Promise.all([
        readErc20State(execution.collateral, execution.caller, execution.pool).then((value) => value.balance),
        readOutcomeBalance(execution.outcomeToken, execution.caller, execution.noOutcomeId),
      ]);
      const verified = verifyOrderReceipt({ receipt, execution, collateralBalanceAfter: collateralAfter, noBalanceAfter: noAfter });
      setResult(verified); setStatus(verified.classification);
      if (verified.classification !== "NO_FILL") {
        const record = { wallet: execution.caller, marketId: execution.marketId, pool: execution.pool, asset: market.asset, window: market.intervalSec, outcome: "NO", quantity: verified.filledQuantity.toString(), txHash: verified.transactionHash, orderId: verified.orderId?.toString() ?? null, actualExecutionPrice: verified.actualAverageNoPrice?.toString() ?? null, actualSpend: verified.actualSpend.toString(), maximumAuthorizedCost: execution.maximumCost.toString(), expiry: execution.marketExpiry.toString() };
        localStorage.setItem(`cushion:${execution.caller.toLowerCase()}:${execution.marketId.toLowerCase()}`, JSON.stringify(record));
        onVerified?.();
      }
    } catch (error) {
      setFailure(String((error as Error)?.message ?? "TRANSACTION_FAILED"));
      setExecution(null); setStatus(freshnessStatus(error) ?? "TRANSACTION_FAILED");
    }
  };

  const refresh = async () => { setExecution(null); setResult(null); setFailure(null); await refreshFunding(); };
  return { status, snapshot, execution, result, transactionHash, failure, enable, simulate, confirm, refresh };
}
