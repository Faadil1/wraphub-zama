// Hybrid registry source.
// Priority:
// 1. Use the S1 official snapshot as the canonical official pair list.
// 2. Validate each official wrapper live onchain with isConfidentialTokenValid().
// 3. Add optional local/dev-only pairs from pairs.local.json.
//
// Note:
// Direct registry enumeration methods currently revert from the public RPC ABI surface,
// but isConfidentialTokenValid(address) works live. This keeps the app honest:
// the visible official list comes from S1 evidence, and current wrapper validity
// is checked against the live Sepolia registry.

import { ethers } from "ethers";
import { OFFICIAL_PAIRS, SEPOLIA_REGISTRY, type OfficialPair } from "./pairs.official";
import localConfig from "./pairs.local.json";

export type PairSource = "live" | "snapshot" | "local";
export type SourcedPair = OfficialPair & { source: PairSource };

export type RegistryLoad = {
  pairs: SourcedPair[];
  status: "live" | "snapshot";
  officialCount: number;
  localCount: number;
  note: string;
};

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const LIVE_TIMEOUT_MS = 8000;

const REGISTRY_VALIDATION_ABI = [
  "function isConfidentialTokenValid(address confidentialTokenAddress) view returns (bool)",
];

type LocalPair = {
  symbol: string;
  name: string;
  erc20: string;
  wrapper: string;
  decimals: number;
};

function localPairs(): SourcedPair[] {
  const list = (localConfig as { pairs: LocalPair[] }).pairs ?? [];

  return list
    .filter((p) => /^0x[0-9a-fA-F]{40}$/.test(p.erc20) && /^0x[0-9a-fA-F]{40}$/.test(p.wrapper))
    .map((p, i) => ({
      index: 1000 + i,
      symbol: p.symbol,
      name: p.name,
      erc20: p.erc20 as `0x${string}`,
      wrapper: p.wrapper as `0x${string}`,
      decimals: p.decimals,
      isValid: false,
      faucet: false,
      source: "local" as const,
    }));
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`live registry validation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function readLiveValidatedSnapshot(): Promise<SourcedPair[]> {
  const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true });
  const registry = new ethers.Contract(SEPOLIA_REGISTRY, REGISTRY_VALIDATION_ABI, provider);

  const pairs = await Promise.all(
    OFFICIAL_PAIRS.map(async (p): Promise<SourcedPair> => {
      const isValid = Boolean(
        await withTimeout(
          registry.isConfidentialTokenValid(p.wrapper),
          LIVE_TIMEOUT_MS
        )
      );

      return {
        ...p,
        isValid,
        source: "live" as const,
      };
    })
  );

  if (pairs.length === 0) {
    throw new Error("live registry validation returned 0 pairs");
  }

  return pairs;
}

export async function loadRegistry(): Promise<RegistryLoad> {
  const locals = localPairs();

  try {
    const live = await readLiveValidatedSnapshot();
    const validCount = live.filter((p) => p.isValid).length;

    return {
      pairs: [...live, ...locals],
      status: "live",
      officialCount: live.length,
      localCount: locals.length,
      note: `Live registry validation ✓ — ${validCount}/${live.length} official pairs validated onchain at ${SEPOLIA_REGISTRY.slice(0, 8)}…`,
    };
  } catch (e) {
    const snapshot: SourcedPair[] = OFFICIAL_PAIRS.map((p) => ({
      ...p,
      source: "snapshot" as const,
    }));

    const why = e instanceof Error ? e.message : String(e);

    return {
      pairs: [...snapshot, ...locals],
      status: "snapshot",
      officialCount: snapshot.length,
      localCount: locals.length,
      note: `Snapshot fallback — live registry validation unavailable (${why}). Showing S1 evidence snapshot (8 validated pairs).`,
    };
  }
}
