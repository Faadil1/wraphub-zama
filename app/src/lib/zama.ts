// Shared browser SDK bootstrap. Mirrors the VALIDATED S5 probe canon exactly:
// web() relayer, storage: memoryStorage (object), createConfig({ ethereum }).
// Probe.tsx keeps its own inline copy on purpose — do not refactor the probe.
import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig, type EIP1193Provider } from "@zama-fhe/sdk/ethers";
import { web } from "@zama-fhe/sdk/web";

export type Session = {
  sdk: ZamaSDK;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  address: `0x${string}`;
};

export class WalletError extends Error {
  kind: "NO_WALLET" | "WRONG_NETWORK";
  constructor(kind: "NO_WALLET" | "WRONG_NETWORK", msg: string) { super(msg); this.kind = kind; }
}

export async function connectSepolia(): Promise<Session> {
  const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!eth) throw new WalletError("NO_WALLET", "No wallet found. Install MetaMask, then reload.");
  const provider = new ethers.BrowserProvider(eth as ethers.Eip1193Provider);
  await provider.send("eth_requestAccounts", []);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== sepolia.id)
    throw new WalletError("WRONG_NETWORK", `Wallet is on chainId ${net.chainId}. Switch to Sepolia (11155111) and retry.`);
  const signer = await provider.getSigner();
  const address = (await signer.getAddress()) as `0x${string}`;
  const sdk = new ZamaSDK(
    createConfig({
      chains: [sepolia],
      relayers: { [sepolia.id]: web() },
      storage: memoryStorage,
      ethereum: eth,
    })
  );
  return { sdk, provider, signer, address };
}

/** Human message + classification for drawer error states. */
export function explainError(e: unknown): { kind: string; message: string } {
  if (e instanceof WalletError) return { kind: e.kind, message: e.message };
  const any = e as { code?: unknown; message?: string; shortMessage?: string };
  const msg = any?.shortMessage || any?.message || String(e);
  if (any?.code === 4001 || any?.code === "ACTION_REJECTED" || /reject/i.test(msg))
    return { kind: "USER_REJECTED", message: "Signature or transaction was rejected in the wallet. Retry when ready." };
  if (/relayer|decrypt|permit/i.test(msg))
    return { kind: "RELAYER_OR_DECRYPT", message: `Relayer/decryption error: ${msg}` };
  if (/insufficient|revert|gas|nonce/i.test(msg))
    return { kind: "TX_FAILED", message: `Transaction failed: ${msg}` };
  return { kind: "UNKNOWN", message: msg };
}
