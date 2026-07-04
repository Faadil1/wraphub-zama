// Pair action drawer — Step 5 generalization of the live-tested Step 4 flow.
// Judge path:
 // - faucet mocks: Mint → Shield → Decrypt → Unshield
 // - non-mock official pairs: Shield existing balance → Decrypt → Unshield.
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
type DrawerAction = readonly [title: string, desc: string, state: ActionState, run: () => void | Promise<void>];
const idle = (): ActionState => ({ phase: "idle", txs: [] });

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Tx({ t }: { t: { label: string; hash: string } }) {
  return (
    <div className="tx-row-badge">
      <span className="tx-label-badge">{t.label}</span>
      <a className="tx-link-badge" href={scanTx(t.hash)} target="_blank" rel="noreferrer" title={`View ${t.label} tx on Etherscan`}>
        {t.hash.slice(0, 8)}…{t.hash.slice(-6)} ↗
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
  const MINT_AMOUNT = 10n * 10n ** BigInt(PAIR.decimals);   // 10 display tokens, UNDERLYING units — S2 canon
  const SHIELD_AMOUNT = 1n * 10n ** BigInt(PAIR.decimals);   // 1 display token, UNDERLYING units (shield takes underlying)
  const fmt = (v: bigint) => (Number(v) / 10 ** PAIR.decimals).toFixed(2);
  // ERC-7984 wrappers store confidential amounts in WRAPPER-scale units (uint64-backed;
  // e.g. cWETHMock is 6-dec over an 18-dec underlying). decrypt results and unshield
  // amounts are wrapper-scale. Read wrapper decimals per pair; identical to underlying
  // for 6-dec mocks, so USDCMock behavior is unchanged.
  const [wrapDec, setWrapDec] = useState<number | null>(null);
  const wfmt = (v: bigint) => wrapDec === null ? String(v) : (Number(v) / 10 ** Number(wrapDec)).toFixed(2);
  const UNSHIELD_AMOUNT = wrapDec === null ? null : 1n * 10n ** BigInt(wrapDec); // 1 display token, WRAPPER units
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
    setPublicBal(null); setHandle(null); setHasPermit(null); setPlaintext(null); setWrapDec(null);
    setMint(idle()); setShield(idle()); setDecrypt(idle()); setUnshield(idle());
  };

  const refresh = useCallback(async (s: Session) => {
    const erc20 = new ethers.Contract(PAIR.erc20, ERC20_ABI, s.provider);
    setPublicBal(await erc20.balanceOf(s.address));
    const wrapped = s.sdk.createToken(PAIR.wrapper);
    const h = await wrapped.confidentialBalanceOf(s.address);
    setHandle(String(h));
    // SDK types say number, runtime delivers bigint (ABI uint8) — normalize here.
    setWrapDec(Number(await wrapped.decimals()));
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
    const res = await wrapped.shield(SHIELD_AMOUNT, {
      onApprovalSubmitted: (h: string) => { txs.push({ label: "approve", hash: h }); setShield({ phase: "pending", txs: [...txs] }); },
      onShieldSubmitted:   (h: string) => { txs.push({ label: "shield",  hash: h }); setShield({ phase: "pending", txs: [...txs] }); },
    });
    if (!txs.find((t) => t.hash === res.txHash)) txs.push({ label: "shield", hash: res.txHash });
    setShield({ phase: "done", txs, note: `Shielded ${fmt(SHIELD_AMOUNT)} ${PAIR.symbol} → c${PAIR.symbol}` });
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
    setDecrypt({ phase: "done", txs: [], note: `Decrypted own balance: ${wfmt(BigInt(String(v)))} c${PAIR.symbol} (wrapper units)` });
  }, setDecrypt);

  const doUnshield = guard(async (s) => {
    if (UNSHIELD_AMOUNT === null) throw new Error("Wrapper decimals not loaded yet — reopen the drawer or wait for facts to populate.");
    setUnshield({ phase: "pending", txs: [] });
    // Re-read current confidential handle before unshield so the SDK balance check
    // runs against the live post-shield state, not a stale view.
    await refresh(s);
    const txs: { label: string; hash: string }[] = [];
    const wrapped = s.sdk.createWrappedToken(PAIR.wrapper);
    await wrapped.unshield(UNSHIELD_AMOUNT, {
      onUnwrapSubmitted:   (h: string) => { txs.push({ label: "unwrap", hash: h }); setUnshield({ phase: "pending", txs: [...txs] }); },
      onFinalizing:        ()  => { setUnshield({ phase: "finalizing", txs: [...txs] }); },
      onFinalizeSubmitted: (h: string) => { txs.push({ label: "finalize", hash: h }); setUnshield({ phase: "finalizing", txs: [...txs] }); },
    });
    setUnshield({ phase: "done", txs, note: `Unshielded ${wfmt(UNSHIELD_AMOUNT!)} c${PAIR.symbol} back to ${PAIR.symbol}` });
    setPlaintext(null);
    await refresh(session!);
  }, setUnshield);

  const actions: DrawerAction[] = PAIR.faucet ? [
    ["Step 1: Mint Public Mocks", `Faucet: Claim ${fmt(MINT_AMOUNT)} public mock ${PAIR.symbol} tokens.`, mint, doMint],
    ["Step 2: Shield into Wrapper", `Wrap: Shield ${fmt(SHIELD_AMOUNT)} ${PAIR.symbol} into encrypted, confidential c${PAIR.symbol}.`, shield, doShield],
    ["Step 3: Decrypt own Balance", "Decrypt: Request secure EIP-712 permit and decrypt your confidential wrapper balance.", decrypt, doDecrypt],
    ["Step 4: Unshield to Public", `Unwrap: Unshield 1 display token of c${PAIR.symbol} back to public ERC-20 (unwrap & finalize phases).`, unshield, doUnshield],
  ] : [
    ["Step 1: Shield Existing Balance", `No faucet: shield ${fmt(SHIELD_AMOUNT)} existing ${PAIR.symbol} into encrypted, confidential c${PAIR.symbol}.`, shield, doShield],
    ["Step 2: Decrypt own Balance", "Decrypt: Request secure EIP-712 permit and decrypt your confidential wrapper balance.", decrypt, doDecrypt],
    ["Step 3: Unshield to Public", `Unwrap: Unshield 1 display token of c${PAIR.symbol} back to public ERC-20 (unwrap & finalize phases).`, unshield, doUnshield],
  ];

  return (
    <aside className="drawer" role="dialog" aria-label={`${PAIR.symbol} actions`}>
      <header className="drawer-head">
        <div>
          <h3 className="drawer-title">{PAIR.symbol} → c{PAIR.symbol}</h3>
          <p className="drawer-sub">Interactive Control Console</p>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close action drawer">Close</button>
      </header>

      {connErr ? (
        <div className="err-box">[{connErr.kind}] {connErr.message}</div>
      ) : !session ? (
        <div className="drawer-note">Connecting wallet…</div>
      ) : (
        <>
          <div className="balance-comparison">
            <div className="balance-box public">
              <span className="bal-lbl">Public Balance (ERC-20)</span>
              <span className="bal-val">{publicBal === null ? "…" : `${fmt(publicBal)} ${PAIR.symbol}`}</span>
            </div>
            <div className="balance-box confidential">
              <span className="bal-lbl">Confidential Balance (ERC-7984)</span>
              <span className="bal-val">
                {plaintext === null ? (
                  <span className="bal-placeholder">🔒 Encrypted (Run Step 3)</span>
                ) : (
                  `🔓 ${wfmt(BigInt(plaintext))} c${PAIR.symbol}`
                )}
              </span>
            </div>
          </div>

          <dl className="facts">
            <div><dt>Connected Wallet</dt><dd className="mono" title={session.address}>{shortAddr(session.address)}</dd></div>
            <div><dt>Network Status</dt><dd>Sepolia Testnet ✓</dd></div>
            <div><dt>Decimals Config</dt><dd className="mono">{wrapDec === null ? "…" : `${wrapDec} (Wrapper) / ${PAIR.decimals} (Underlying)`}</dd></div>
            <div><dt>Encrypted Handle</dt><dd className="mono handle">{handle ? `${handle.slice(0, 16)}…` : "…"}</dd></div>
            <div><dt>EIP-712 Permit</dt><dd>{hasPermit === null ? "…" : hasPermit ? "Granted ✓" : "Not Granted"}</dd></div>
          </dl>

          {!PAIR.faucet && (
            <div className="drawer-note">
              No faucet is available for this official non-mock pair. Shield and unshield require an existing public {PAIR.symbol} balance.
            </div>
          )}

          <div className="action-sequence-title">
            {PAIR.faucet ? "Sequential Test Flow (Steps 1 → 4)" : "Non-mock Flow (existing balance required)"}
          </div>

          {actions.map(([title, desc, st, run]) => (
            <section className="action" key={title}>
              <div className="action-head">
                <h4>{title}</h4>
                <PhasePill phase={st.phase} />
              </div>
              <p className="action-desc">{desc}</p>
              {title.includes("Decrypt") && (
                <p className="eip712-plain-note">
                  This signature does not move funds. It grants this wallet permission to view its own confidential balance.
                </p>
              )}
              {st.txs.length > 0 && (
                <div className="tx-list">
                  {st.txs.map((t) => <Tx key={t.hash} t={t} />)}
                </div>
              )}
              {st.note && <p className={st.phase === "error" ? "err-box" : "ok-note"}>{st.note}</p>}
              <button className="run" onClick={run} disabled={st.phase === "pending" || st.phase === "finalizing"}>
                {st.phase === "done" ? "Run again" : "Run Action"}
              </button>
            </section>
          ))}

          {decrypt.phase === "done" && plaintext !== null && (
            <section className="judge-moment-card" aria-label="Judge moment: balance decrypted">
              <div className="judge-moment-badge">BALANCE DECRYPTED</div>
              <p className="judge-moment-desc">
                Only this connected wallet could unlock the confidential balance. The ERC-7984 balance was encrypted onchain and decrypted client-side after an EIP-712 signature.
              </p>
              <div className="judge-moment-value">
                Revealed balance: <span className="mono">{wfmt(BigInt(plaintext))} c{PAIR.symbol}</span>
              </div>
            </section>
          )}
        </>
      )}
    </aside>
  );
}
