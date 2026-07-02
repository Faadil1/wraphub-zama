// Arbitrary ERC-7984 decrypt — Step 6. Read-only. Bounty requirement:
// "Decrypt balances of any ERC-7984 token in wallet via EIP-712 user-decryption."
// Reuses the validated canon: confidentialBalanceOf -> grantPermit -> hasPermit -> decryptValues.
// ERC-165 detection via SDK-native Token.isConfidential(). No mint/shield/unshield here.
import { useState } from "react";
import { connectSepolia, explainError, type Session } from "../lib/zama";
import "../drawer/drawer.css";
import "./arbitrary.css";

const EXAMPLES = [
  { label: "cUSDCMock (registry)", addr: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639" },
  { label: "cWETHMock (registry)", addr: "0x46208622DA27d91db4f0393733C8BA082ed83158" },
];
const isAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());

type Meta = { symbol: string; name: string; decimals: number | null };
type Result = {
  address: string;
  erc7984: boolean | null;      // ERC-165 check outcome (null = check itself unavailable/failed)
  meta: Meta;
  handle: string | null;
  permit: boolean | null;
  plaintext: string | null;     // raw wrapper-scale units as string
};

export default function ArbitraryDecrypt() {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ kind: string; message: string } | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const fmt = (raw: string, decimals: number | null) =>
    decimals === null ? `${raw} (raw units — decimals unavailable)` :
    `${(Number(BigInt(raw)) / 10 ** Number(decimals)).toFixed(2)}`;

  async function run(addrInput: string) {
    setErr(null); setRes(null);
    const address = addrInput.trim();
    if (!isAddress(address)) {
      setErr({ kind: "BAD_ADDRESS", message: "Not a valid address. Expected 0x followed by 40 hex characters." });
      return;
    }
    try {
      setBusy("Connecting wallet…");
      const s = session ?? (await connectSepolia());
      if (!session) setSession(s);

      const token = s.sdk.createToken(address as `0x${string}`);
      const out: Result = { address, erc7984: null, meta: { symbol: "?", name: "?", decimals: null }, handle: null, permit: null, plaintext: null };

      setBusy("Checking ERC-7984 interface (ERC-165)…");
      try { out.erc7984 = await token.isConfidential(); } catch { out.erc7984 = null; }
      if (out.erc7984 === false) {
        setRes({ ...out });
        setErr({ 
          kind: "NOT_ERC7984", 
          message: "Unsupported Token Standard: This contract does not support the ERC-7984 confidential token standard via ERC-165. Standard ERC-20 tokens (like USDC or WETH) do not support user-side decryption or native encryption. Please use one of our registered wrapper tokens or another valid ERC-7984 wrapper instead." 
        });
        setBusy(null);
        return;
      }
      // erc7984 === null: check unavailable — proceed, but say so honestly in the result.

      setBusy("Reading token metadata…");
      try { out.meta.symbol = await token.symbol(); } catch { /* keep ? */ }
      try { out.meta.name = await token.name(); } catch { /* keep ? */ }
      try { out.meta.decimals = Number(await token.decimals()); } catch { /* keep null */ }
      setRes({ ...out });

      setBusy("Reading confidential balance handle…");
      const h = await token.confidentialBalanceOf(s.address);
      out.handle = String(h);
      setRes({ ...out });

      setBusy("Checking permit…");
      let has = await s.sdk.permits.hasPermit([address as `0x${string}`]);
      if (!has) {
        setBusy("Requesting EIP-712 permit signature…");
        await s.sdk.permits.grantPermit([address as `0x${string}`]);
        has = await s.sdk.permits.hasPermit([address as `0x${string}`]);
      }
      out.permit = has;
      setRes({ ...out });

      setBusy("Decrypting…");
      const results = await s.sdk.decryption.decryptValues([
        { encryptedValue: h, contractAddress: address as `0x${string}` },
      ]);
      out.plaintext = String((results as Record<string, unknown>)[String(h)]);
      setRes({ ...out });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setErr(explainError(e));
    }
  }

  return (
    <section className="arb" aria-label="Decrypt any ERC-7984 token">
      <header>
        <h2 className="arb-title">Decrypt any ERC-7984 balance</h2>
        <p className="arb-sub">
          Paste any Sepolia contract address to check if it supports the ERC-7984 confidential token standard and decrypt your own balance via the secure EIP-712 decryption flow. (Read-only)
        </p>
      </header>

      <div className="arb-input-row">
        <input
          className="arb-input mono"
          placeholder="Paste Sepolia ERC-7984 contract address (0x…)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="ERC-7984 token address"
        />
        <button className="run" onClick={() => run(input)} disabled={!!busy}>
          {busy ? "Decrypting…" : "Decrypt my balance"}
        </button>
      </div>
      <div className="arb-examples">
        Try Registered Wrappers:
        {EXAMPLES.map((x) => (
          <button key={x.addr} className="example" onClick={() => { setInput(x.addr); run(x.addr); }} disabled={!!busy}>
            {x.label}
          </button>
        ))}
      </div>

      {busy && <p className="arb-busy">{busy}</p>}
      {err && <div className="err-box">[{err.kind}] {err.message}</div>}

      {res && (
        <dl className="facts arb-facts">
          <div><dt>Token Contract</dt><dd className="mono">{res.address}</dd></div>
          <div><dt>ERC-7984 Support</dt>
            <dd>{res.erc7984 === true ? "Supported ✓" : res.erc7984 === false ? "Unsupported ✕" : "Check unavailable — attempted anyway"}</dd></div>
          <div><dt>Metadata</dt><dd>{res.meta.symbol} · {res.meta.name} · decimals {res.meta.decimals ?? "?"}</dd></div>
          <div><dt>Encrypted Handle</dt><dd className="mono handle">{res.handle ?? "…"}</dd></div>
          <div><dt>EIP-712 Permit</dt><dd>{res.permit === null ? "…" : res.permit ? "Granted ✓" : "Not Granted"}</dd></div>
          <div><dt>Decrypted Balance</dt>
            <dd className="mono font-bold">{res.plaintext === null ? "…" : `${fmt(res.plaintext, res.meta.decimals)} ${res.meta.symbol}`}</dd></div>
        </dl>
      )}
    </section>
  );
}
