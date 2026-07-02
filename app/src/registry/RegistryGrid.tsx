// Registry grid — Step 3. Read-only coverage surface: every official Sepolia
// pair as a card. No drawer, no actions, no animations (later steps).
import { useEffect, useState } from "react";
import { SEPOLIA_REGISTRY, type OfficialPair } from "./pairs.official";
import { loadRegistry, type RegistryLoad, type SourcedPair } from "./source";
import "./registry.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const scan = (a: string) => `https://sepolia.etherscan.io/address/${a}`;

function AddrRow({ label, addr }: { label: string; addr: string }) {
  return (
    <div className="addr-row">
      <span className="addr-label">{label}</span>
      <a className="addr" href={scan(addr)} target="_blank" rel="noreferrer" title={addr}>
        {short(addr)}
      </a>
      <button
        className="copy"
        onClick={() => navigator.clipboard.writeText(addr)}
        aria-label={`Copy ${label} address ${addr}`}
      >
        copy
      </button>
    </div>
  );
}

function PairCard({ p, startHere, onOpen }: { p: SourcedPair; startHere: boolean; onOpen?: () => void }) {
  return (
    <article className={"pair-card" + (startHere ? " start-here" : "")} aria-label={`${p.symbol} wrapper pair`}>
      {startHere && <div className="start-flag">Start here</div>}
      <header className="pair-head">
        <h3 className="pair-symbol">{p.symbol}</h3>
        {p.source === "local" ? (
          <span className="badge badge-local">Local config · dev-only</span>
        ) : (
          <span className={p.isValid ? "badge badge-valid" : "badge badge-revoked"}>
            {p.isValid ? "Registry: valid" : "Revoked"}
          </span>
        )}
      </header>
      <p className="pair-name">{p.name} · {p.decimals} decimals</p>
      <div className="pair-addrs">
        <AddrRow label="ERC-20 (Public)" addr={p.erc20} />
        <AddrRow label="ERC-7984 (Confidential)" addr={p.wrapper} />
      </div>
      <footer className="pair-foot">
        {p.faucet ? (
          <>
            <span className="badge badge-faucet">Faucet: mint()</span>
            {onOpen && <button className="open-actions" onClick={onOpen}>Open actions →</button>}
          </>
        ) : (
          <span className="badge badge-nofaucet">No faucet / read-only (non-mock)</span>
        )}
      </footer>
    </article>
  );
}

export default function RegistryGrid({ onOpenPair }: { onOpenPair?: (p: OfficialPair) => void }) {
  const [load, setLoad] = useState<RegistryLoad | null>(null);
  useEffect(() => { loadRegistry().then(setLoad); }, []);
  return (
    <section className="registry">
      <div className="hero-banner">
        <h2 className="hero-tagline">The composability entry point for Zama confidential tokens.</h2>
        <p className="hero-core-msg">Deploying your own wrapper is completely unnecessary.</p>
        <p className="hero-desc">
          Browse official Zama Sepolia wrappers, claim mock tokens, wrap into ERC-7984, and decrypt your own confidential balance.
        </p>

        <div className="proof-badges">
          <div className="proof-badge" title="8 official verified wrapper pairs in this registry">
            <span className="badge-icon">✓</span>
            <span className="badge-lbl">8 Official Pairs</span>
          </div>
          <div className="proof-badge" title="Registry validated directly on the Sepolia testnet">
            <span className="badge-icon">🟢</span>
            <span className="badge-lbl">Live Onchain Validation</span>
          </div>
          <div className="proof-badge" title="Decryption is performed using secure EIP-712 permit signatures">
            <span className="badge-icon">🔑</span>
            <span className="badge-lbl">EIP-712 Decrypt</span>
          </div>
          <div className="proof-badge" title="7 faucet-enabled mock tokens available to mint">
            <span className="badge-icon">🎁</span>
            <span className="badge-lbl">7 Faucet Mocks</span>
          </div>
        </div>
      </div>

      <header className="registry-head">
        <h2 className="registry-title">Official Sepolia Wrapper Pairs</h2>
        <p className="registry-sub">
          Primary source: onchain Wrappers Registry{" "}
          <a className="addr" href={scan(SEPOLIA_REGISTRY)} target="_blank" rel="noreferrer">
            {short(SEPOLIA_REGISTRY)}
          </a>
        </p>
        {load === null ? (
          <p className="source-note source-loading">Reading live registry…</p>
        ) : (
          <p className={"source-note " + (load.status === "live" ? "source-live" : "source-snapshot")}>
            {load.note}{load.localCount > 0 ? ` · +${load.localCount} local dev-only pair(s)` : ""}
          </p>
        )}
      </header>

      <div className="pair-grid">
        {(load?.pairs ?? []).map((p) => (
          <PairCard key={p.wrapper} p={p} startHere={p.symbol === "USDCMock"} onOpen={p.faucet && onOpenPair ? () => onOpenPair(p) : undefined} />
        ))}
      </div>
    </section>
  );
}
