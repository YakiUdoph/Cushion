import { useEffect, useState } from "react";
import { SHANNON_CHAIN_HEX, SHANNON_CHAIN_ID, PRIMARY_RPC } from "@/lib/cushion";

type EthereumProvider = { request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>; on?(event: string, listener: (...args: unknown[]) => void): void; removeListener?(event: string, listener: (...args: unknown[]) => void): void };
declare global { interface Window { ethereum?: EthereumProvider } }

export type WalletState = { status: "DISCONNECTED" | "CONNECTING" | "WRONG_NETWORK" | "CONNECTED" | "ERROR"; address?: string; chainId?: number; error?: string };

export function useWallet() {
  const [state, setState] = useState<WalletState>({ status: "DISCONNECTED" });
  const refresh = async () => {
    if (!window.ethereum) return setState({ status: "DISCONNECTED" });
    try {
      const [accounts, chainHex] = await Promise.all([window.ethereum.request<string[]>({ method: "eth_accounts" }), window.ethereum.request<string>({ method: "eth_chainId" })]);
      const chainId = Number.parseInt(chainHex, 16);
      if (!accounts[0]) return setState({ status: "DISCONNECTED", chainId });
      setState({ status: chainId === SHANNON_CHAIN_ID ? "CONNECTED" : "WRONG_NETWORK", address: accounts[0], chainId });
    } catch (error) { setState({ status: "ERROR", error: error instanceof Error ? error.message : "Wallet unavailable" }); }
  };
  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.ethereum?.on?.("accountsChanged", listener); window.ethereum?.on?.("chainChanged", listener);
    return () => { window.ethereum?.removeListener?.("accountsChanged", listener); window.ethereum?.removeListener?.("chainChanged", listener); };
  }, []);
  const connect = async () => {
    if (!window.ethereum) return setState({ status: "ERROR", error: "No EVM wallet was detected." });
    setState({ status: "CONNECTING" });
    try { await window.ethereum.request({ method: "eth_requestAccounts" }); await refresh(); } catch (error) { setState({ status: "ERROR", error: error instanceof Error ? error.message : "Connection declined" }); }
  };
  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SHANNON_CHAIN_HEX }] }); }
    catch (error: unknown) {
      const code = (error as { code?: number }).code;
      if (code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: SHANNON_CHAIN_HEX, chainName: "Somnia Shannon Testnet", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }, rpcUrls: [PRIMARY_RPC], blockExplorerUrls: ["https://shannon-explorer.somnia.network"] }] });
      else setState((current) => ({ ...current, status: "ERROR", error: error instanceof Error ? error.message : "Network switch failed" }));
    }
    await refresh();
  };
  return { ...state, connect, switchNetwork };
}
