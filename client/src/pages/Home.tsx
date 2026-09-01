import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  SomniaMarkets,
  SOMNIA_TESTNET_ADDRESSES,
  type BinaryMarket,
  type BinaryOrderBook,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Moon,
  Menu,
  ShieldCheck,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useExecution } from "@/hooks/useExecution";
import {
  buildAssetRegistry,
  calculateProtectionPlans,
  deriveWatchState,
  formatRaw,
  INDEXER_URL,
  intervalLabel,
  plansCollapseAtDepth,
  type ProtectionStyle,
  verifyShannon,
} from "@/lib/cushion";

const exchange = new SomniaMarkets({
  indexerUrl: INDEXER_URL,
  chain: somniaShannon,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});
type LoadState = "loading" | "ready" | "empty" | "error";
const styleCopy: Record<ProtectionStyle, string> = {
  light: "Lower cost, smaller conditional offset.",
  balanced: "A middle ground between cost and potential offset.",
  maximum: "Strongest available offset within current market depth.",
};
const shortAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";

export default function Home() {
  const wallet = useWallet();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [markets, setMarkets] = useState<BinaryMarket[]>([]);
  const [marketState, setMarketState] = useState<LoadState>("loading");
  const [bookState, setBookState] = useState<LoadState>("loading");
  const [rpcDegraded, setRpcDegraded] = useState(false);
  const [book, setBook] = useState<BinaryOrderBook | null>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState<number | null>(null);
  const [refreshNotice, setRefreshNotice] = useState("");
  const [asset, setAsset] = useState("");
  const [marketId, setMarketId] = useState("");
  const [exposure, setExposure] = useState("4000");
  const [style, setStyle] = useState<ProtectionStyle>("balanced");
  const [positions, setPositions] = useState<
    Awaited<ReturnType<typeof exchange.client.getPortfolio>>["positions"]
  >([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioRefresh, setPortfolioRefresh] = useState(0);
  const registry = useMemo(() => buildAssetRegistry(markets), [markets]);
  const selectedAsset =
    registry.find(row => row.symbol === asset) ?? registry[0];
  const selectedMarket =
    selectedAsset?.markets.find(row => row.marketId === marketId) ??
    selectedAsset?.markets[0];

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      verifyShannon(controller.signal),
      exchange.client.listBinaryMarkets({ operatorId: 2, limit: 200 }),
    ])
      .then(([health, rows]) => {
        setRpcDegraded(health.degraded);
        setMarkets(rows);
        setMarketState(rows.length ? "ready" : "empty");
      })
      .catch(() => setMarketState("error"));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!asset && registry[0]) setAsset(registry[0].symbol);
  }, [asset, registry]);
  useEffect(() => {
    if (
      selectedAsset &&
      !selectedAsset.markets.some(row => row.marketId === marketId)
    )
      setMarketId(selectedAsset.markets[0]?.marketId ?? "");
  }, [marketId, selectedAsset]);
  useEffect(() => {
    if (!selectedMarket) {
      setBook(null);
      setBookState("empty");
      return;
    }
    let active = true;
    setBookState("loading");
    exchange.client
      .getBinaryOrderBook(selectedMarket.poolAddress, { depth: 50 })
      .then(next => {
        if (active) {
          setBook(next);
          setQuoteTimestamp(Date.now());
          setBookState(next.noAsks.length ? "ready" : "empty");
        }
      })
      .catch(() => active && setBookState("error"));
    return () => {
      active = false;
    };
  }, [selectedMarket?.marketId]);
  useEffect(() => {
    if (wallet.status !== "CONNECTED" || !wallet.address) {
      setPositions([]);
      return;
    }
    setPortfolioLoading(true);
    exchange.client
      .getPortfolio(wallet.address, { tradesLimit: 25 })
      .then(p => setPositions(p.positions))
      .catch(() => setPositions([]))
      .finally(() => setPortfolioLoading(false));
  }, [portfolioRefresh, wallet.address, wallet.status]);

  const decimals = selectedMarket?.quoteDecimals ?? 6;
  const exposureRaw = useMemo(() => {
    if (!/^\d+(\.\d{0,6})?$/.test(exposure)) return 0n;
    const [whole, fraction = ""] = exposure.split(".");
    return (
      BigInt(whole || "0") * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0").slice(0, decimals) || "0")
    );
  }, [decimals, exposure]);
  const plans = useMemo(
    () => (book ? calculateProtectionPlans(exposureRaw, book, decimals) : []),
    [book, decimals, exposureRaw]
  );
  const plan = plans.find(row => row.style === style) ?? plans[0];
  const depthCollapsed = plansCollapseAtDepth(plans);
  const execution = useExecution({
    wallet,
    market: selectedMarket,
    book,
    plan,
    client: exchange.client,
    quoteTimestamp,
    onVerified: () => setPortfolioRefresh(value => value + 1),
  });
  const refreshProtection = async () => {
    setRefreshNotice("");
    setMarketState("loading");
    setBookState("loading");
    setBook(null);
    setQuoteTimestamp(null);
    try {
      const rows = await exchange.client.listBinaryMarkets({ operatorId: 2, limit: 200 });
      setMarketId("");
      setMarkets(rows);
      setMarketState(rows.length ? "ready" : "empty");
      setRefreshNotice("Market and quote refreshed. Review the new protection values before continuing.");
    } catch {
      setMarketState("error");
      setBookState("error");
    }
  };
  const executionAction = executionButton(
    execution.status,
    wallet,
    execution,
    refreshProtection
  );
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("cushion-theme", next);
    setTheme(next);
  };

  return (
    <main id="top" className="site-shell">
      <AmbientBackdrop />
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">C</span>
            <span className="brand-word">CUSHION</span>
          </a>
          <nav className="desktop-nav">
            <a href="#composer">Create</a>
            <a href="#under">How it works</a>
            <a href="#watch">CUSHION WATCH</a>
          </nav>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <Sun className="theme-sun" size={16} />
            <Moon className="theme-moon" size={16} />
            <span aria-hidden="true" />
          </button>
          <button
            className="button button-primary header-cta"
            onClick={wallet.status === "CONNECTED" ? undefined : wallet.connect}
          >
            <Wallet size={16} />
            {wallet.status === "CONNECTED"
              ? shortAddress(wallet.address)
              : "Connect wallet"}
          </button>
          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-menu">
            <a href="#composer">Create</a>
            <a href="#under">How it works</a>
            <a href="#watch">CUSHION WATCH</a>
          </nav>
        )}
      </header>
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <p className="section-kicker">
              <span />
              Modeled downside offsets · live on Shannon
            </p>
            <h1>
              Keep your crypto.
              <br />
              <em>Cushion the downside.</em>
            </h1>
            <p className="hero-dek">
              Configure an understandable, bounded Event Contract position from
              live DreamDEX markets—without navigating a prediction-market
              terminal.
            </p>
            <a className="button button-primary" href="#composer">
              Build my Cushion <ArrowRight size={17} />
            </a>
            <p className="protocol-line">
              <span />
              Somnia Shannon · DreamDEX Event Contracts · Live market data
            </p>
          </div>
          <div className="hero-field" aria-hidden="true">
            <div className="protection-arc arc-one" />
            <div className="protection-arc arc-two" />
            <div className="orbital">
              <ShieldCheck />
            </div>
            <div className="orbit-point point-one" />
            <div className="orbit-point point-two" />
          </div>
        </div>
      </section>
      <section id="composer" className="product-section">
        <div className="container">
          <div className="product-heading">
            <p className="section-kicker">
              <span />
              Live protection composer
            </p>
            <h2>What are you worried about?</h2>
            <p>
              Tell CUSHION what you’re holding and when you’re worried about the
              downside.
            </p>
          </div>
          {rpcDegraded && (
            <div className="state-banner">
              <CircleAlert size={16} />
              Primary RPC unavailable. Live reads are using the approved Shannon
              fallback.
            </div>
          )}
          <div className="composer-grid">
            <div className="intent-composer">
              <label htmlFor="intent">
                Describe your concern <small>Optional note</small>
              </label>
              <textarea
                id="intent"
                placeholder="For example: I'm holding BTC and I'm worried about the next 24 hours."
                aria-describedby="intent-help"
              />
              <p id="intent-help" className="helper intent-authority">
                <strong>The controls below define your live Cushion.</strong>{" "}
                This optional note is not interpreted or used to calculate the
                quote.
              </p>
              <div className="config-grid">
                <label>
                  What are you protecting?
                  <span className="select-wrap">
                    <select
                      value={asset}
                      onChange={e => setAsset(e.target.value)}
                      disabled={marketState !== "ready"}
                    >
                      <option value="">
                        {marketState === "loading"
                          ? "Loading assets…"
                          : "No assets"}
                      </option>
                      {registry.map(row => (
                        <option key={row.symbol}>{row.symbol}</option>
                      ))}
                    </select>
                    <ChevronDown />
                  </span>
                </label>
                <label>
                  Your exposure
                  <span className="input-unit">
                    <b>USD</b>
                    <input
                      inputMode="decimal"
                      value={exposure}
                      onChange={e => setExposure(e.target.value)}
                    />
                  </span>
                  <small>
                    The approximate value you’re concerned about protecting.
                  </small>
                </label>
                <fieldset>
                  <legend>Protection window</legend>
                  <div className="choice-row">
                    {selectedAsset?.markets.map(row => (
                      <button
                        key={row.marketId}
                        aria-pressed={selectedMarket?.marketId === row.marketId}
                        onClick={() => setMarketId(row.marketId)}
                      >
                        {intervalLabel(row.intervalSeconds)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Protection style</legend>
                  <div className="choice-row">
                    {(
                      ["light", "balanced", "maximum"] as ProtectionStyle[]
                    ).map(value => (
                      <button
                        key={value}
                        aria-pressed={style === value}
                        onClick={() => setStyle(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <p className="helper">
                Available assets and windows come from compatible live DreamDEX
                markets.
              </p>
            </div>
            <aside className="preview-panel">
              <div className="preview-head">
                <span>Your Cushion</span>
                <i>
                  {bookState === "ready" && !["MARKET_CLOSED", "MARKET_STALE", "QUOTE_STALE", "TOO_CLOSE_TO_EXPIRY"].includes(execution.status)
                    ? "LIVE QUOTE"
                    : ["MARKET_CLOSED", "MARKET_STALE", "QUOTE_STALE", "TOO_CLOSE_TO_EXPIRY"].includes(execution.status) ? "QUOTE STALE" : bookState.toUpperCase()}
                </i>
              </div>
              {marketState === "loading" || bookState === "loading" ? (
                <Skeleton />
              ) : marketState === "error" || bookState === "error" ? (
                <Empty
                  title="We couldn’t reach Somnia."
                  body="Live values are unavailable. No fixture data has been substituted."
                />
              ) : !selectedMarket ? (
                <Empty
                  title="No compatible protection is available right now."
                  body="CUSHION only shows protection when a compatible Trading market is available."
                />
              ) : !plan ? (
                <Empty
                  title="There isn’t enough liquidity to build this Cushion safely."
                  body="The live NO book is empty for this protection window."
                />
              ) : (
                <>
                  <dl className="preview-summary">
                    <div>
                      <dt>Asset</dt>
                      <dd>{selectedMarket.asset}</dd>
                    </div>
                    <div>
                      <dt>Window</dt>
                      <dd>
                        {intervalLabel(BigInt(selectedMarket.intervalSec!))}
                      </dd>
                    </div>
                    <div>
                      <dt>Exposure</dt>
                      <dd>${Number(exposure || 0).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Style</dt>
                      <dd>{plan.style}</dd>
                    </div>
                  </dl>
                  <div className="cost-block">
                    <span>Estimated execution cost</span>
                    <strong>
                      {formatRaw(plan.estimatedCost, decimals)} tUSDC
                    </strong>
                    <small>What you are estimated to spend for this position.</small>
                  </div>
                  <div className="cost-block maximum">
                    <span>Maximum authorized cost</span>
                    <strong>
                      {formatRaw(plan.maximumCost, decimals)} tUSDC
                    </strong>
                    <small>The most you authorize. Market prices can move, but CUSHION will not execute above this amount.</small>
                  </div>
                  <DepthVisual book={book} decimals={decimals} />
                  <dl className="detail-list">
                    <div>
                      <dt>Executable protection position</dt>
                      <dd>{formatRaw(plan.quantity, decimals)} shares</dd>
                    </div>
                    <div>
                      <dt>If the Event Contract NO outcome wins</dt>
                      <dd>{formatRaw(plan.grossPayout, decimals)} tUSDC</dd>
                    </div>
                    <div>
                      <dt>Available depth</dt>
                      <dd>{formatRaw(plan.availableDepth, decimals)} shares</dd>
                    </div>
                    <div>
                      <dt>Market expiry</dt>
                      <dd>
                        {new Date(
                          Number(selectedMarket.expiry) * 1000
                        ).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {!plan.fullyExecutable && (
                    <div className="state-banner">
                      <CircleAlert size={16} />
                      Plan is limited by visible liquidity.
                    </div>
                  )}
                </>
              )}
              <button
                className="button button-primary preview-action"
                onClick={executionAction.action}
                disabled={executionAction.disabled}
              >
                {executionAction.label}
              </button>
              {refreshNotice && <p className="read-only-note">{refreshNotice}</p>}
              <ExecutionState execution={execution} decimals={decimals} />
              <p className="read-only-note">
                Every transaction requires confirmation in your connected
                wallet. CUSHION never holds your keys.
              </p>
            </aside>
          </div>
          <div className="plans" aria-label="Protection styles">
            {plans.length ? (
              <>
                {depthCollapsed && (
                  <div className="depth-note">
                    <CircleAlert size={16} />
                    <span>
                      <strong>
                        Current market depth limits these protection levels to
                        the same executable size.
                      </strong>{" "}
                      Each style requests a different amount, but only{" "}
                      {formatRaw(plans[0].availableDepth, decimals)} shares are
                      currently available.
                    </span>
                  </div>
                )}
                {plans.map(row => (
                  <button
                    key={row.style}
                    className={style === row.style ? "selected" : ""}
                    onClick={() => setStyle(row.style)}
                  >
                    <span>
                      <span className="plan-glyph" aria-hidden="true"><ShieldCheck size={16} /></span>
                      {row.style === "balanced" && (
                        <i>
                          <Check size={12} /> Recommended
                        </i>
                      )}
                      <strong>{row.style}</strong>
                      <small>{styleCopy[row.style]}</small>
                    </span>
                    <span>
                      <b>{formatRaw(row.estimatedCost, decimals)} tUSDC</b>
                      <small>estimated cost</small>
                    </span>
                    <span>
                      <b>{formatRaw(row.maximumCost, decimals)} tUSDC</b>
                      <small>maximum authorized</small>
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <Skeleton />
            )}
          </div>
          <details className="risk-details">
            <summary>Why this Cushion?</summary>
            <p>
              This models a fixed conditional payout from a BUY NO Event
              Contract position. It is not continuous loss coverage: timing
              mismatch, basis risk, liquidity, and the opening-reference
              condition affect whether a payout occurs. If the condition is
              wrong at expiry, the position can lose its cost.
            </p>
          </details>
        </div>
      </section>
      <section id="under" className="under-section">
        <div className="container under-layout">
          <div>
            <p className="section-kicker">
              <span />
              Under the cushion
            </p>
            <h2>Protection, without the protocol maze.</h2>
            <p>
              CUSHION turns your risk preference into a bounded Event Contract
              position, reads it through DreamDEX on Somnia, then follows
              authoritative state through resolution.
            </p>
          </div>
          <ol className="life-flow">
            {[
              ["YOU", "Tell CUSHION what you’re worried about"],
              ["CUSHION", "Finds compatible protection"],
              ["DREAMDEX", "Provides the Event Contract and liquidity"],
              ["SOMNIA", "Executes and settles onchain"],
              ["CUSHION WATCH", "Monitors through resolution"],
            ].map(([name, copy]) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{copy}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="watch" className="watch-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <p className="section-kicker">
                <span />
                CUSHION WATCH
              </p>
              <h2>Your Cushions</h2>
            </div>
            <p>
              Track active protection and authoritative resolved positions.
              Wallet-wide history is indexer-derived and may be incomplete for
              legacy markets.
            </p>
          </div>
          {portfolioLoading ? (
            <Skeleton />
          ) : wallet.status !== "CONNECTED" ? (
            <Empty
              title="Connect a wallet to view Cushions."
              body="CUSHION reads positions only. It will not ask you to sign."
            />
          ) : positions.length === 0 ? (
            <Empty
              title="No active Cushions yet."
              body="No non-zero DreamDEX Event Contract positions were found for this wallet."
            />
          ) : (
            <div className="position-list">
              {positions.map(position => {
                const state = deriveWatchState({
                  status: position.market.status,
                  expiry: BigInt(position.market.expiry),
                  voided: position.market.voided,
                  winningOutcome: position.market.winningOutcome,
                  heldOutcome: position.outcomeIndex,
                  balance: BigInt(position.balance),
                });
                return (
                  <article
                    key={`${position.market.id}-${position.outcomeIndex}`}
                    className="position-card"
                  >
                    <div>
                      <span className="status-pill">
                        {state.replace("_", " ")}
                      </span>
                      <h3>
                        {position.market.asset} ·{" "}
                        {position.market.interval ?? "Event"} Cushion
                      </h3>
                      <p>
                        {position.outcomeIndex === 1
                          ? "Downside (NO)"
                          : "Upside (YES)"}{" "}
                        outcome held
                      </p>
                    </div>
                    <dl>
                      <div>
                        <dt>Position</dt>
                        <dd>
                          {formatRaw(
                            BigInt(position.balance),
                            position.market.quoteDecimals
                          )}{" "}
                          shares
                        </dd>
                      </div>
                      <div>
                        <dt>Expires</dt>
                        <dd>
                          {new Date(
                            Number(position.market.expiry) * 1000
                          ).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                    <div className="watch-timeline" aria-label={`${state.replace("_", " ")} lifecycle`}>
                      <span className="watch-node active" /><i /><span className="watch-node" /><i /><span className="watch-node" />
                      <small>Now</small><small>Expiry</small><small>Resolution</small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>CUSHION</strong>
            <p>Keep your crypto. Cushion the downside.</p>
          </div>
          <p>
            Experimental testnet market preview. Conditional payouts are not
            insurance or guaranteed protection. Every transaction requires
            confirmation in your connected wallet.
          </p>
        </div>
      </footer>
    </main>
  );
}

function AmbientBackdrop() {
  return (
    <div className="ambient-backdrop" aria-hidden="true">
      <div className="ambient-glow glow-violet" />
      <div className="ambient-glow glow-cyan" />
      <div className="particle-field" />
      <div className="grid-wave" />
      <div className="noise-overlay" />
    </div>
  );
}

function DepthVisual({ book, decimals }: { book: BinaryOrderBook | null; decimals: number }) {
  const levels = book?.noAsks.slice(0, 5) ?? [];
  if (!levels.length) return null;
  const max = levels.reduce((value, level) => level.quantity > value ? level.quantity : value, 0n);
  if (max === 0n) return null;
  return (
    <div className="depth-visual" aria-label="Live NO liquidity by price level">
      <div><span>Live NO liquidity</span><small>{levels.length} executable levels</small></div>
      <div className="depth-bars">
        {levels.map(level => (
          <span key={level.price.toString()} style={{ "--depth": `${Number((level.quantity * 100n) / max)}%` } as CSSProperties} title={`${formatRaw(level.quantity, decimals)} shares at ${formatRaw(level.price, decimals)}`} />
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="skeleton-stack" aria-label="Loading live data">
      <span />
      <span />
      <span />
    </div>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <CircleAlert />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

type ExecutionController = ReturnType<typeof useExecution>;
type WalletController = ReturnType<typeof useWallet>;

function executionButton(
  status: ExecutionController["status"],
  wallet: WalletController,
  execution: ExecutionController,
  refreshProtection: () => Promise<void>
) {
  if (wallet.status === "WRONG_NETWORK") return { label: "Switch to Somnia", action: wallet.switchNetwork, disabled: false };
  if (wallet.status !== "CONNECTED") return { label: wallet.status === "CONNECTING" ? "Connecting…" : "Connect wallet", action: wallet.connect, disabled: wallet.status === "CONNECTING" };
  switch (status) {
    case "APPROVAL_REQUIRED": return { label: "Enable CUSHION", action: execution.enable, disabled: false };
    case "APPROVAL_SIMULATING": return { label: "Checking approval…", action: execution.enable, disabled: true };
    case "APPROVAL_WAITING_FOR_WALLET": return { label: "Confirm approval in wallet", action: execution.enable, disabled: true };
    case "APPROVAL_SUBMITTED":
    case "APPROVAL_CONFIRMING": return { label: "Confirming approval…", action: execution.enable, disabled: true };
    case "APPROVAL_FAILED": return { label: "Retry enabling CUSHION", action: execution.enable, disabled: false };
    case "READY_FOR_SIMULATION": return { label: "Simulate & review", action: execution.simulate, disabled: false };
    case "SIMULATING": return { label: "Simulating exact order…", action: execution.simulate, disabled: true };
    case "SIMULATION_FAILED": return { label: "Review protection", action: execution.simulate, disabled: false };
    case "SIMULATION_PASSED": return { label: "Confirm Cushion", action: execution.confirm, disabled: false };
    case "WAITING_FOR_WALLET": return { label: "Confirm in your wallet", action: execution.confirm, disabled: true };
    case "TRANSACTION_SUBMITTED":
    case "VERIFYING_DREAMDEX": return { label: "Verifying with DreamDEX…", action: execution.confirm, disabled: true };
    case "MARKET_CLOSED": return { label: "Refresh protection", action: refreshProtection, disabled: false };
    case "MARKET_STALE": return { label: "Refresh protection", action: refreshProtection, disabled: false };
    case "QUOTE_STALE": return { label: "Refresh protection", action: refreshProtection, disabled: false };
    case "TOO_CLOSE_TO_EXPIRY": return { label: "Choose another window", action: refreshProtection, disabled: false };
    case "NO_LIQUIDITY": return { label: "Refresh protection", action: refreshProtection, disabled: false };
    case "PRICE_MOVED": return { label: "Refresh quote", action: refreshProtection, disabled: false };
    case "FULL_FILL": return { label: "Cushion active", action: execution.confirm, disabled: true };
    case "PARTIAL_FILL": return { label: "Partially filled", action: execution.confirm, disabled: true };
    case "NO_FILL": return { label: "Protection wasn’t opened", action: execution.confirm, disabled: true };
    case "INSUFFICIENT_COLLATERAL": return { label: "Insufficient tUSDC", action: execution.refresh, disabled: true };
    case "TRANSACTION_FAILED": return { label: "Transaction failed", action: refreshProtection, disabled: false };
    default: return { label: "Checking readiness…", action: execution.refresh, disabled: true };
  }
}

function ExecutionState({ execution, decimals }: { execution: ExecutionController; decimals: number }) {
  const copy: Partial<Record<ExecutionController["status"], string>> = {
    APPROVAL_REQUIRED: "Authorize the relevant DreamDEX market pool to use the required amount of collateral.",
    SIMULATION_PASSED: "Ready to execute. The exact bounded order passed simulation against your current wallet state.",
    PRICE_MOVED: "The market moved while you were reviewing. Your previous execution package was invalidated.",
    WAITING_FOR_WALLET: "Confirm the exact simulated order in your wallet.",
    TRANSACTION_SUBMITTED: "Protection submitted. Waiting for a Shannon receipt.",
    VERIFYING_DREAMDEX: "Receipt received. Verifying fill events and the resulting owned position.",
    NO_FILL: "Your maximum price was respected. No eligible liquidity was available within it.",
    TRANSACTION_FAILED: "The transaction did not produce a verified Cushion position.",
    INSUFFICIENT_COLLATERAL: "Your wallet does not hold enough collateral for the maximum authorized cost.",
    MARKET_CLOSED: "Protection window closed. This market expired while you were reviewing it. Refresh to use the latest available protection window.",
    MARKET_STALE: "The selected market changed and the previous execution preview was invalidated.",
    QUOTE_STALE: "This quote is no longer current. Refresh protection before continuing.",
    TOO_CLOSE_TO_EXPIRY: "This market is Trading but too close to expiry for a safe approval and execution flow.",
    NO_LIQUIDITY: "The selected plan is no longer executable within your approved maximum price.",
  };
  return (
    <div className="execution-state" aria-live="polite">
      <span>{execution.status.replaceAll("_", " ")}</span>
      {copy[execution.status] && <p>{copy[execution.status]}</p>}
      {execution.snapshot && <p>Wallet collateral: {formatRaw(execution.snapshot.balance, decimals)} tUSDC · Pool allowance: {formatRaw(execution.snapshot.allowance, decimals)} tUSDC</p>}
      {execution.result && <dl><div><dt>Requested</dt><dd>{formatRaw(execution.result.requestedQuantity, decimals)} shares</dd></div><div><dt>Filled</dt><dd>{formatRaw(execution.result.filledQuantity, decimals)} shares</dd></div><div><dt>Actual spend</dt><dd>{formatRaw(execution.result.actualSpend, decimals)} tUSDC</dd></div><div><dt>Unfilled</dt><dd>{formatRaw(execution.result.unfilledQuantity, decimals)} shares</dd></div></dl>}
      {execution.transactionHash && <a href={`https://shannon-explorer.somnia.network/tx/${execution.transactionHash}`} target="_blank" rel="noreferrer">View transaction</a>}
      {execution.failure && <details><summary>Technical details</summary><code>{String(execution.failure)}</code></details>}
    </div>
  );
}
