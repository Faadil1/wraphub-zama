// Registry grid — Step 3. Read-only coverage surface: every official Sepolia
// pair as a card. No drawer, no actions, no animations (later steps).
import { OFFICIAL_PAIRS, SEPOLIA_REGISTRY, SNAPSHOT_AT, type OfficialPair } from "./pairs.official";
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

function PairCard({ p, startHere, onOpen }: { p: OfficialPair; startHere: boolean; onOpen?: () => void }) {
  return (
    <article className={"pair-card" + (startHere ? " start-here" : "")} aria-label={`${p.symbol} wrapper pair`}>
      {startHere && <div className="start-flag">Start here</div>}
      <header className="pair-head">
        <h3 className="pair-symbol">{p.symbol}</h3>
        <span className={p.isValid ? "badge badge-valid" : "badge badge-revoked"}>
          {p.isValid ? "Registry: valid" : "Revoked"}
        </span>
      </header>
      <p className="pair-name">{p.name} · {p.decimals} decimals</p>
      <div className="pair-addrs">
        <AddrRow label="ERC-20" addr={p.erc20} />
        <AddrRow label="ERC-7984" addr={p.wrapper} />
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
  return (
    <section className="registry">
      <header className="registry-head">
        <h2>Official Sepolia wrapper pairs</h2>
        <p className="registry-sub">
          {OFFICIAL_PAIRS.length} pairs · source: onchain Wrappers Registry{" "}
          <a className="addr" href={scan(SEPOLIA_REGISTRY)} target="_blank" rel="noreferrer">
            {short(SEPOLIA_REGISTRY)}
          </a>{" "}
          · snapshot {SNAPSHOT_AT}
        </p>
      </header>
      <div className="pair-grid">
        {OFFICIAL_PAIRS.map((p) => (
          <PairCard key={p.wrapper} p={p} startHere={p.symbol === "USDCMock"} onOpen={p.faucet && onOpenPair ? () => onOpenPair(p) : undefined} />
        ))}
      </div>
    </section>
  );
}
