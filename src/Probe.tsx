// S5 BROWSER VIABILITY PROBE — throwaway gate, not product UI.
// Mirrors the PROVEN Node spike canon (S3/S4) with exactly two substitutions:
//   node() -> web()   and   Wallet(PRIVATE_KEY) -> injected wallet (BrowserProvider).
// Proven call sequence (do not alter): confidentialBalanceOf -> grantPermit -> hasPermit -> decryptValues.
import { useState } from "react";
import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig, type EIP1193Provider } from "@zama-fhe/sdk/ethers";
import { web } from "@zama-fhe/sdk/web";

const USDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639"; // cUSDCMock (S1 LIVE dump)

type Step = { name: string; status: "idle" | "run" | "ok" | "fail"; detail?: string };
const initial: Step[] = [
  { name: "Connect wallet (Sepolia)", status: "idle" },
  { name: "confidentialBalanceOf → handle", status: "idle" },
  { name: "grantPermit (EIP-712 prompt)", status: "idle" },
  { name: "hasPermit", status: "idle" },
  { name: "decryptValues → plaintext", status: "idle" },
];

export default function Probe() {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [verdict, setVerdict] = useState<string>("");
  const set = (i: number, status: Step["status"], detail?: string) =>
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, status, detail } : st)));

  async function run() {
    setSteps(initial); setVerdict("");
    try {
      set(0, "run");
      const eth = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum;
      if (!eth) throw new Error("No injected wallet found. Install MetaMask and retry.");
      const provider = new ethers.BrowserProvider(eth);
      await provider.send("eth_requestAccounts", []);
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== sepolia.id) throw new Error(`Wrong network (chainId ${net.chainId}). Switch wallet to Sepolia.`);
      const addr = (await (await provider.getSigner()).getAddress()) as `0x${string}`;
      set(0, "ok", addr);

      // Browser variant per SDK types: pass raw EIP-1193 provider as { ethereum }.
      const sdk = new ZamaSDK(
        createConfig({
          chains: [sepolia],
          relayers: { [sepolia.id]: web() },
          storage: memoryStorage, // object, not a call — S3 canon
          ethereum: eth as unknown as EIP1193Provider,
        })
      );

      set(1, "run");
      const wrapped = sdk.createToken(USDC_WRAPPER);
      const handle = await wrapped.confidentialBalanceOf(addr);
      set(1, "ok", String(handle));

      set(2, "run");
      await sdk.permits.grantPermit([USDC_WRAPPER]); // EIP-712 signature prompt expected here
      set(2, "ok", "signed");

      set(3, "run");
      const has = await sdk.permits.hasPermit([USDC_WRAPPER]);
      if (!has) throw new Error("hasPermit returned false after grant.");
      set(3, "ok", "true");

      set(4, "run");
      const results = await sdk.decryption.decryptValues([
        { encryptedValue: handle, contractAddress: USDC_WRAPPER },
      ]);
      const value = (results as Record<string, unknown>)[String(handle)];
      set(4, "ok", String(value));
      setVerdict("S5_BROWSER_PASS");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSteps((s) => s.map((st) => (st.status === "run" ? { ...st, status: "fail", detail: msg } : st)));
      setVerdict("S5_BROWSER_BLOCKED: " + msg);
    }
  }

  return (
    <main style={{ fontFamily: "ui-monospace, monospace", maxWidth: 640, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>WrapHub — S5 browser viability probe</h1>
      <p>Target: cUSDCMock decrypt on Sepolia. Probe only — not the product.</p>
      <button onClick={run} style={{ padding: "8px 16px" }}>Run probe</button>
      <ol>
        {steps.map((s) => (
          <li key={s.name} style={{ margin: "8px 0" }}>
            [{s.status.toUpperCase()}] {s.name}
            {s.detail ? <div style={{ opacity: 0.7, wordBreak: "break-all" }}>{s.detail}</div> : null}
          </li>
        ))}
      </ol>
      {verdict && <p style={{ fontWeight: 700 }}>{verdict}</p>}
    </main>
  );
}
