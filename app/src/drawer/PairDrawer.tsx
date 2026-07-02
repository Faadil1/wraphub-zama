// Pair action drawer — Step 5 generalization of the live-tested Step 4 flow.
// Judge path per faucet-eligible mock pair: Mint → Shield → Decrypt → Unshield.
// Call sequences are S3/S4/S5 canon — do not alter. No animations.
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { connectSepolia, explainError, type Session } from "../lib/zama";
import type { OfficialPair } from "../registry/pairs.official";
import "./drawer.css";

const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function balanceOf(address) view returns (uint256)",
];
const scanTx = (h: string) => `https://sepolia.etherscan.io/tx/${h}`;

type Phase = "idle" | "pending" | "finalizing" | "done" | "error";
type ActionState = { phase: Phase; txs: { label: string; hash: string }[]; note?: string };
const idle = (): ActionState => ({ phase: "idle", txs: [] });

function Tx({ t }: { t: { label: string; hash: string } }) {
  return (
    <div className="tx-row">
      <span className="tx-label">{t.label}</span>
      <a className="addr" href={scanTx(t.hash)} target="_blank" rel="noreferrer" title={t.hash}>
        {t.hash.slice(0, 10)}…{t.hash.slice(-6)}
      </a>
    </div>
  );
}

function PhasePill({ phase }: { phase: Phase }) {
  const text = { idle: "ready", pending: "pending…", finalizing: "finalizing…", done: "done", error: "error" }[phase];
  return <span className={`phase phase-${phase}`}>{text}</span>;
}

export default function PairDrawer({ pair, onClose }: { pair: OfficialPair; onClose: () => void }) {
  const PAIR = pair;
  const MINT_AMOUNT = 10n * 10n ** BigInt(PAIR.decimals); // 10 display tokens — S2 canon
  const FLOW_AMOUNT = 1n * 10n ** BigInt(PAIR.decimals);  // 1 display token — S3 canon
  const fmt = (v: bigint) => (Number(v) / 10 ** PAIR.decimals).toFixed(2);
  const [session, setSession] = useState<Session | null>(null);
  const [connErr, setConnErr] = useState<{ kind: string; message: string } | null>(null);
  const [publicBal, setPublicBal] = useState<bigint | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [hasPermit, setHasPermit] = useState<boolean | null>(null);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [mint, setMint] = useState<ActionState>(idle());
  const [shield, setShield] = useState<ActionState>(idle());
  const [decrypt, setDecrypt] = useState<ActionState>(idle());
  const [unshield, setUnshield] = useState<ActionState>(idle());

  const reset = () => {
    setPublicBal(null); setHandle(null); setHasPermit(null); setPlaintext(null);
    setMint(idle()); setShield(idle()); setDecrypt(idle()); setUnshield(idle());
  };

  const refresh = useCallback(async (s: Session) => {
    const erc20 = new ethers.Contract(PAIR.erc20, ERC20_ABI, s.provider);
    setPublicBal(await erc20.balanceOf(s.address));
    const wrapped = s.sdk.createToken(PAIR.wrapper);
    const h = await wrapped.confidentialBalanceOf(s.address);
    setHandle(String(h));
    setHasPermit(await s.sdk.permits.hasPermit([PAIR.wrapper]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAIR.wrapper, PAIR.erc20]);

  useEffect(() => {
    reset();
    (async () => {
      try {
        const s = session ?? (await connectSepolia());
        if (!session) setSession(s);
        await refresh(s);
      } catch (e) {
        setConnErr(explainError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAIR.wrapper]);

  const guard = (fn: (s: Session) => Promise<void>, set: (a: ActionState) => void) => async () => {
    if (!session) return;
    try { await fn(session); }
    catch (e) {
      const x = explainError(e);
      set({ phase: "error", txs: [], note: `[${x.kind}] ${x.message}` });
    }
  };

  const doMint = guard(async (s) => {
    setMint({ phase: "pending", txs: [] });
    const erc20 = new ethers.Contract(PAIR.erc20, ERC20_ABI, s.signer);
    const tx = await erc20.mint(s.address, MINT_AMOUNT);
    setMint({ phase: "pending", txs: [{ label: "mint", hash: tx.hash }] });
    await tx.wait();
    setMint({ phase: "done", txs: [{ label: "mint", hash: tx.hash }], note: `Minted ${fmt(MINT_AMOUNT)} ${PAIR.symbol}` });
    await refresh(s);
  }, setMint);

  const doShield = guard(async (s) => {
    setShield({ phase: "pending", txs: [] });
    const txs: { label: string; hash: string }[] = [];
    const wrapped = s.sdk.createWrappedToken(PAIR.wrapper);
    const res = await wrapped.shield(FLOW_AMOUNT, {
      onApprovalSubmitted: (h: string) => { txs.push({ label: "approve", hash: h }); setShield({ phase: "pending", txs: [...txs] }); },
      onShieldSubmitted:   (h: string) => { txs.push({ label: "shield",  hash: h }); setShield({ phase: "pending", txs: [...txs] }); },
    });
    if (!txs.find((t) => t.hash === res.txHash)) txs.push({ label: "shield", hash: res.txHash });
    setShield({ phase: "done", txs, note: `Shielded ${fmt(FLOW_AMOUNT)} → c${PAIR.symbol}` });
    setPlaintext(null); // stale after balance change
    await refresh(s);
  }, setShield);

  const doDecrypt = guard(async (s) => {
    setDecrypt({ phase: "pending", txs: [] });
    const wrapped = s.sdk.createToken(PAIR.wrapper);
    const h = await wrapped.confidentialBalanceOf(s.address);
    setHandle(String(h));
    if (!(await s.sdk.permits.hasPermit([PAIR.wrapper]))) {
      await s.sdk.permits.grantPermit([PAIR.wrapper]); // EIP-712 prompt
    }
    setHasPermit(true);
    const results = await s.sdk.decryption.decryptValues([{ encryptedValue: h, contractAddress: PAIR.wrapper }]);
    const v = (results as Record<string, unknown>)[String(h)];
    setPlaintext(String(v));
    setDecrypt({ phase: "done", txs: [], note: `Decrypted own balance: ${fmt(BigInt(String(v)))} c${PAIR.symbol}` });
  }, setDecrypt);

  const doUnshield = guard(async (s) => {
    setUnshield({ phase: "pending", txs: [] });
    const txs: { label: string; hash: string }[] = [];
    const wrapped = s.sdk.createWrappedToken(PAIR.wrapper);
    await wrapped.unshield(FLOW_AMOUNT, {
      onUnwrapSubmitted:   (h: string) => { txs.push({ label: "unwrap", hash: h }); setUnshield({ phase: "pending", txs: [...txs] }); },
      onFinalizing:        ()  => { setUnshield({ phase: "finalizing", txs: [...txs] }); },
      onFinalizeSubmitted: (h: string) => { txs.push({ label: "finalize", hash: h }); setUnshield({ phase: "finalizing", txs: [...txs] }); },
    });
    setUnshield({ phase: "done", txs, note: `Unshielded ${fmt(FLOW_AMOUNT)} back to ${PAIR.symbol}` });
    setPlaintext(null);
    await refresh(session!);
  }, setUnshield);

  return (
    <aside className="drawer" role="dialog" aria-label={`${PAIR.symbol} actions`}>
      <header className="drawer-head">
        <div>
          <h3 className="drawer-title">{PAIR.symbol} → c{PAIR.symbol}</h3>
          <p className="drawer-sub">Judge path: Mint → Shield → Decrypt → Unshield</p>
        </div>
        <button className="tab" onClick={onClose}>Close</button>
      </header>

      {connErr ? (
        <div className="err-box">[{connErr.kind}] {connErr.message}</div>
      ) : !session ? (
        <div className="drawer-note">Connecting wallet…</div>
      ) : (
        <>
          <dl className="facts">
            <div><dt>Wallet</dt><dd className="mono">{session.address}</dd></div>
            <div><dt>Network</dt><dd>Sepolia ✓</dd></div>
            <div><dt>Public {PAIR.symbol}</dt><dd className="mono">{publicBal === null ? "…" : fmt(publicBal)}</dd></div>
            <div><dt>Encrypted handle</dt><dd className="mono handle">{handle ?? "…"}</dd></div>
            <div><dt>Permit</dt><dd>{hasPermit === null ? "…" : hasPermit ? "granted" : "not granted"}</dd></div>
            <div><dt>Decrypted balance</dt><dd className="mono">{plaintext === null ? "— (run Decrypt)" : `${fmt(BigInt(plaintext))} c${PAIR.symbol}`}</dd></div>
          </dl>

          {([
            ["1 · Mint (faucet)", `Mint ${fmt(MINT_AMOUNT)} ${PAIR.symbol} via mint()`, mint, doMint],
            ["2 · Shield", `Wrap ${fmt(FLOW_AMOUNT)} ${PAIR.symbol} → encrypted c${PAIR.symbol}`, shield, doShield],
            ["3 · Decrypt", "EIP-712 permit, then decrypt your own confidential balance", decrypt, doDecrypt],
            ["4 · Unshield", `Unwrap ${fmt(FLOW_AMOUNT)} back — two onchain phases (unwrap, finalize)`, unshield, doUnshield],
          ] as const).map(([title, desc, st, run]) => (
            <section className="action" key={title}>
              <div className="action-head">
                <h4>{title}</h4>
                <PhasePill phase={st.phase} />
              </div>
              <p className="action-desc">{desc}</p>
              {st.txs.map((t) => <Tx key={t.hash} t={t} />)}
              {st.note && <p className={st.phase === "error" ? "err-box" : "ok-note"}>{st.note}</p>}
              <button className="run" onClick={run} disabled={st.phase === "pending" || st.phase === "finalizing"}>
                {st.phase === "done" ? "Run again" : "Run"}
              </button>
            </section>
          ))}
        </>
      )}
    </aside>
  );
}
