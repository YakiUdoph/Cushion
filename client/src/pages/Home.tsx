/**
 * Approved CUSHION light-first direction: editorial negative space, restrained instrument containers,
 * hairline structure, and the intent composer as the primary product object.
 */
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Github,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

const heroBackground = "/manus-storage/cushion-hero-field_ae0a1dad.jpg";
const flowTexture = "/manus-storage/cushion-flow-texture_a7f99040.jpg";
const watchTexture = "/manus-storage/cushion-watch-texture_1d60ee97.jpg";
const glyph = "/manus-storage/cushion-glyph_72a8c623.png";

const plans = [
  {
    id: "light",
    name: "Light Cushion",
    note: "Lower cost · smaller modeled downside offset",
    cost: "$37",
    offset: "Up to $540",
    tag: "Lower commitment",
  },
  {
    id: "balanced",
    name: "Balanced Cushion",
    note: "Best tradeoff between cost and modeled downside offset",
    cost: "$62",
    offset: "Up to $980",
    tag: "Recommended",
  },
  {
    id: "maximum",
    name: "Maximum Cushion",
    note: "Highest available protection within the stated budget",
    cost: "$79",
    offset: "Up to $1,240",
    tag: "Maximum offset",
  },
];

const steps = [
  ["01", "Tell CUSHION your exposure", "Asset, approximate value, concern, and maximum protection budget."],
  ["02", "CUSHION interprets your intent", "Natural language becomes explicit financial constraints you can inspect."],
  ["03", "Protection plans are calculated", "Cost, timing, liquidity, and modeled downside offset are evaluated."],
  ["04", "You stay in control", "Preview a position before any wallet authorization is requested."],
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" href="#top" aria-label="CUSHION home">
      <img className="brand-mark" src={glyph} alt="" />
      {!compact && <span className="brand-word">CUSHION</span>}
    </a>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <p className="section-kicker"><span />{children}</p>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("balanced");
  const [message, setMessage] = useState("I'm holding $5,240 of ETH. I'm worried it could dump tonight. Don't risk more than $80 protecting me.");
  const [isFinding, setIsFinding] = useState(false);
  const hasIntent = message.trim().length > 0;

  const handlePlaceholder = (label: string) => {
    toast(`${label} is part of the forthcoming product experience.`, {
      description: "This landing page does not connect a wallet or initiate a trade.",
    });
  };

  const handleFindProtection = () => {
    setIsFinding(true);
    window.setTimeout(() => {
      setIsFinding(false);
      toast("Illustrative plans refreshed", {
        description: "This preview is not a live quote, wallet position, or blockchain transaction.",
      });
      document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 650);
  };

  return (
    <main id="top" className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#protection">Protection</a>
            <button type="button" onClick={() => handlePlaceholder("Developer documentation")}>Developers</button>
            <a href="#watch">Roadmap</a>
          </nav>
          <button className="button button-primary header-cta" type="button" onClick={() => scrollTo("composer")}>
            Launch CUSHION <ArrowUpRight size={16} aria-hidden="true" />
          </button>
          <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu" aria-label="Mobile navigation">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works <ArrowRight size={16} /></a>
            <a href="#protection" onClick={() => setMenuOpen(false)}>Protection <ArrowRight size={16} /></a>
            <button type="button" onClick={() => { setMenuOpen(false); handlePlaceholder("Developer documentation"); }}>Developers <ArrowRight size={16} /></button>
            <a href="#watch" onClick={() => setMenuOpen(false)}>Roadmap <ArrowRight size={16} /></a>
            <button className="button button-primary" type="button" onClick={() => { setMenuOpen(false); scrollTo("composer"); }}>Build my Cushion <ArrowUpRight size={16} /></button>
          </div>
        )}
      </header>

      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-art" style={{ backgroundImage: `url(${heroBackground})` }} aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-layout">
          <div className="hero-copy">
            <SectionKicker>Short-duration downside planning</SectionKicker>
            <h1 id="hero-heading">Markets move fast.<br /><em>Your protection should too.</em></h1>
            <p className="hero-dek">Turn short-term BTC or ETH downside exposure into a clear protection plan powered by DreamDEX Event Contracts.</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => scrollTo("composer")}>Build my Cushion <ArrowUpRight size={17} /></button>
              <button className="text-button" type="button" onClick={() => scrollTo("how-it-works")}>See how it works <ArrowDownRight size={17} /></button>
            </div>
            <p className="protocol-line"><span className="protocol-dot" />Built on Somnia <b>•</b> Powered by DreamDEX Event Contracts</p>
          </div>

          <div className="composer-wrap" id="composer">
            <div className="field-orbit field-orbit-one" aria-hidden="true" />
            <div className="field-orbit field-orbit-two" aria-hidden="true" />
            <section className="intent-composer" aria-labelledby="composer-heading">
              <div className="composer-topline">
                <span className="eyebrow"><Sparkles size={13} /> Intent composer</span>
                <span className="preview-pill">Illustrative preview</span>
              </div>
              <h2 id="composer-heading">What are you worried about?</h2>
              <label className="sr-only" htmlFor="intent">Describe your exposure and concern</label>
              <textarea id="intent" value={message} onChange={(event) => setMessage(event.target.value)} aria-describedby="intent-note" aria-required="true" aria-invalid={!hasIntent} />
              <p className={`field-note ${!hasIntent ? "field-note-error" : ""}`} id="intent-note" aria-live="polite"><CircleHelp size={13} /> {hasIntent ? "Say what you hold, what worries you, and your maximum budget." : "Tell us what you hold and what worries you before finding protection."}</p>
              <div className="interpretation-header"><span>We heard</span><span>Preview only · no wallet required</span></div>
              <dl className="interpretation-grid">
                <div><dt>ETH exposure</dt><dd>$5,240</dd></div>
                <div><dt>Risk direction</dt><dd className="risk-text">Downside <ArrowDownRight size={15} /></dd></div>
                <div><dt>Maximum budget</dt><dd>$80</dd></div>
                <div><dt>Protection window</dt><dd>1 hour</dd></div>
              </dl>
              <button className="button button-primary composer-button" type="button" onClick={handleFindProtection} disabled={isFinding || !hasIntent}>
                {isFinding ? <><span className="button-loader" /> Reviewing inputs</> : <>Find protection <ArrowRight size={17} /></>}
              </button>
            </section>
          </div>
        </div>
      </section>

      <section className="plans-section" id="plans" aria-labelledby="plans-heading">
        <div className="section-signal signal-plans" aria-hidden="true"><span>01 / intent</span></div>
        <div className="container signal-layout">
          <div className="signal-spine" aria-hidden="true"><span /></div>
          <div className="plans-intro">
            <SectionKicker>From concern to choice</SectionKicker>
            <h2 id="plans-heading">Pick the tradeoff<br />you can live with.</h2>
            <p>Each option is a product preview designed to make cost and modeled downside offset easier to compare. It is not a live quote or guaranteed portfolio floor.</p>
            <div className="mini-legend"><span><i className="cyan-key" />Protection signal</span><span><i className="green-key" />Recommended state</span></div>
          </div>
          <div className="plan-list" aria-label="Illustrative protection plan options">
            {plans.map((plan, index) => {
              const selected = selectedPlan === plan.id;
              return (
                <button className={`plan-card ${selected ? "is-selected" : ""}`} type="button" key={plan.id} aria-pressed={selected} onClick={() => setSelectedPlan(plan.id)}>
                  <span className="plan-index">0{index + 1}</span>
                  <span className="plan-main"><span className="plan-name-row"><strong>{plan.name}</strong>{plan.id === "balanced" && <span className="recommended"><Check size={12} /> Recommended</span>}</span><span className="plan-note">{plan.note}</span></span>
                  <span className="plan-values"><span><b>{plan.cost}</b><small>est. cost</small></span><span><b>{plan.offset}</b><small>modeled offset</small></span></span>
                  <ChevronRight className="plan-chevron" size={20} aria-hidden="true" />
                </button>
              );
            })}
            <p className="preview-disclaimer">Illustrative product preview. Availability, pricing, and modeled outcomes would depend on the underlying Event Contracts at the time of review.</p>
          </div>
        </div>
      </section>

      <section className="editorial-section" id="protection" aria-labelledby="why-heading">
        <div className="section-signal signal-editorial" aria-hidden="true"><span>02 / outcome</span></div>
        <div className="container editorial-layout">
          <div className="editorial-statement">
            <SectionKicker>Why CUSHION exists</SectionKicker>
            <h2 id="why-heading">You shouldn’t have to sell what you still believe in just because you’re nervous about the next hour.</h2>
          </div>
          <div className="contrast-panel">
            <div className="contrast-row traditional"><span className="contrast-label">Traditional interface</span><p>“BTC <b>UP</b> or <b>DOWN</b>?”</p></div>
            <div className="contrast-arrow"><ArrowDownRight size={18} /></div>
            <div className="contrast-row cushion"><span className="contrast-label">CUSHION</span><p>“I own BTC. Help soften my downside for the next hour.”</p><ShieldCheck size={23} /></div>
            <p className="contrast-footnote">CUSHION starts with the financial outcome you care about, then makes the constraints clear before you decide.</p>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
        <div className="section-signal signal-how" aria-hidden="true"><span>03 / flow</span></div>
        <div className="how-texture" style={{ backgroundImage: `url(${flowTexture})` }} aria-hidden="true" />
        <div className="container">
          <div className="section-header-row">
            <div><SectionKicker>How it works</SectionKicker><h2 id="how-heading">Less trading syntax.<br /><em>More context.</em></h2></div>
            <p>CUSHION turns a straightforward concern into a structure you can inspect—without assuming you speak prediction-market language.</p>
          </div>
          <ol className="steps-flow">
            {steps.map(([number, title, copy]) => <li key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p><span className="step-node" aria-hidden="true" /></li>)}
          </ol>
        </div>
      </section>

      <section className="sponsor-section" id="architecture" aria-labelledby="sponsor-heading">
        <div className="section-signal signal-architecture" aria-hidden="true"><span>04 / settlement</span></div>
        <div className="container sponsor-layout">
          <div className="sponsor-copy">
            <SectionKicker>Inside the product lifecycle</SectionKicker>
            <h2 id="sponsor-heading">Not another prediction-market interface.</h2>
            <p>DreamDEX and Somnia belong inside the protection flow—not in a disconnected logo strip. CUSHION translates the user’s downside concern into a legible path through the underlying infrastructure.</p>
            <button className="text-button" type="button" onClick={() => handlePlaceholder("Architecture documentation")}>View architecture <ArrowRight size={17} /></button>
          </div>
          <div className="lifecycle" aria-label="CUSHION product lifecycle">
            <div className="life-step exposure"><span className="life-no">01</span><span className="life-icon">◎</span><strong>User exposure</strong><small>Asset · concern · budget</small></div>
            <span className="life-link"><ArrowRight size={18} /></span>
            <div className="life-step engine"><span className="life-no">02</span><span className="life-icon">◌</span><strong>CUSHION engine</strong><small>Constraint-aware plans</small></div>
            <span className="life-link"><ArrowRight size={18} /></span>
            <div className="life-step contract"><span className="life-no">03</span><span className="life-icon">◇</span><strong>DreamDEX contract</strong><small>Event-market mechanism</small></div>
            <span className="life-link"><ArrowRight size={18} /></span>
            <div className="life-step settlement"><span className="life-no">04</span><span className="life-icon">✦</span><strong>Somnia settlement</strong><small>Network settlement layer</small></div>
          </div>
        </div>
      </section>

      <section className="watch-section" id="watch" aria-labelledby="watch-heading">
        <div className="section-signal signal-watch" aria-hidden="true"><span>05 / monitor</span></div>
        <div className="watch-art" style={{ backgroundImage: `url(${watchTexture})` }} aria-hidden="true" />
        <div className="container watch-layout">
          <div className="watch-copy">
            <span className="coming-soon">Coming next — CUSHION WATCH</span>
            <h2 id="watch-heading">“Watch my ETH exposure and tell me when short-duration protection becomes attractive.”</h2>
            <p>Our post-hackathon direction is portfolio protection monitoring and alerts—clearly marked as a future capability, not something active today.</p>
          </div>
          <div className="watch-module" aria-label="CUSHION WATCH concept preview">
            <div className="watch-status"><span><i /> Concept preview</span><span>Not active</span></div>
            <div className="watch-asset"><span>Monitored exposure</span><strong>ETH <b>↓</b></strong><small>Short-duration downside signals</small></div>
            <div className="watch-rule"><span className="rule-marker" />Let me know when conditions may warrant a look.</div>
          </div>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-heading">
        <div className="container final-layout">
          <div><SectionKicker>Stay exposed. Stay informed.</SectionKicker><h2 id="final-heading">Don’t predict the market.<br /><em>Protect what you’re already exposed to.</em></h2></div>
          <div className="final-actions"><button className="button button-primary" type="button" onClick={() => scrollTo("composer")}>Launch CUSHION <ArrowUpRight size={17} /></button><button className="text-button" type="button" onClick={() => scrollTo("architecture")}>View architecture <ArrowRight size={17} /></button></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand"><Logo compact /><p>Outcome-first downside planning for BTC and ETH holders.</p></div>
          <nav aria-label="Footer navigation"><a href="#top">CUSHION</a><button onClick={() => handlePlaceholder("Somnia")}>Somnia</button><button onClick={() => handlePlaceholder("DreamDEX")}>DreamDEX</button><button onClick={() => handlePlaceholder("GitHub")}><Github size={14} /> GitHub</button><button onClick={() => handlePlaceholder("Documentation")}>Documentation</button><a href="#watch">Roadmap</a></nav>
          <p className="legal">Experimental hackathon product. Nothing on this page is investment advice, an offer, a live quote, or a guarantee of downside protection.</p>
        </div>
      </footer>
    </main>
  );
}
