// Hybrid registry source — Step 7.
// Priority: (1) LIVE onchain Wrappers Registry read (primary source of truth),
// (2) S1 snapshot fallback if the live read fails, plus (3) local dev-only pairs
// from pairs.local.json, always labeled, never presented as official.
//
// Important: do not request an oversized slice. The S1 spike proved that
// getTokenPairsSlice(0,50) can revert when the requested range exceeds the
// current registry length. This loader first tries the live length, then falls
// back to the known S1 official count of 8 for a bounded live read.
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
const S1_OFFICIAL_COUNT = OFFICIAL_PAIRS.length;

const REGISTRY_ABI = [
  "function getTokenPairsLength() view returns (uint256)",
  "function getTokenPairsSlice(uint256 fromIndex, uint256 toIndex) view returns (tuple(address tokenAddress, address confidentialTokenAddress, bool isValid)[])",
];

const ERC20_META_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

const LIVE_TIMEOUT_MS = 8000;

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
      setTimeout(() => rej(new Error(`live registry read timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Known faucet eligibility from S2 evidence, keyed by wrapper address. */
const FAUCET_BY_WRAPPER = new Map(OFFICIAL_PAIRS.map((p) => [p.wrapper.toLowerCase(), p.faucet]));

async function readPairSlice(
  reg: ethers.Contract,
  from: bigint,
  to: bigint
): Promise<{ tokenAddress: string; confidentialTokenAddress: string; isValid: boolean }[]> {
  return await withTimeout(reg.getTokenPairsSlice(from, to), LIVE_TIMEOUT_MS);
}

async function readLiveSlice(reg: ethers.Contract): Promise<{ tokenAddress: string; confidentialTokenAddress: string; isValid: boolean }[]> {
  try {
    const rawCount = await withTimeout(reg.getTokenPairsLength(), LIVE_TIMEOUT_MS);
    const count = Number(rawCount);

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error(`invalid live registry length: ${String(rawCount)}`);
    }

    return await readPairSlice(reg, 0n, BigInt(count));
  } catch (e) {
    // Some SDK/contract surfaces have historically exposed length awkwardly.
    // The S1 snapshot proved exactly 8 official pairs; use that as the bounded
    // live retry before falling back to snapshot.
    const bounded = await readPairSlice(reg, 0n, BigInt(S1_OFFICIAL_COUNT));
    if (bounded.length === 0) {
      const why = e instanceof Error ? e.message : String(e);
      throw new Error(`live length read failed (${why}) and bounded live read returned 0 pairs`);
    }
    return bounded;
  }
}

async function readLive(): Promise<SourcedPair[]> {
  const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true });
  const reg = new ethers.Contract(SEPOLIA_REGISTRY, REGISTRY_ABI, provider);

  const slice = await readLiveSlice(reg);

  const pairs: SourcedPair[] = [];
  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    let symbol = "?";
    let name = "?";
    let decimals = 18;

    try {
      const erc20 = new ethers.Contract(row.tokenAddress, ERC20_META_ABI, provider);
      [symbol, name, decimals] = await withTimeout(
        Promise.all([erc20.symbol(), erc20.name(), erc20.decimals().then(Number)]),
        LIVE_TIMEOUT_MS
      );
    } catch {
      // metadata optional; keep placeholders
    }

    pairs.push({
      index: i,
      symbol,
      name,
      erc20: row.tokenAddress as `0x${string}`,
      wrapper: row.confidentialTokenAddress as `0x${string}`,
      decimals: Number(decimals),
      isValid: row.isValid,
      faucet: FAUCET_BY_WRAPPER.get(row.confidentialTokenAddress.toLowerCase()) ?? false,
      source: "live",
    });
  }

  if (pairs.length === 0) throw new Error("live registry read returned 0 pairs");
  return pairs;
}

export async function loadRegistry(): Promise<RegistryLoad> {
  const locals = localPairs();

  try {
    const live = await readLive();
    return {
      pairs: [...live, ...locals],
      status: "live",
      officialCount: live.length,
      localCount: locals.length,
      note: `Live onchain registry ✓ — ${live.length} official pairs read from ${SEPOLIA_REGISTRY.slice(0, 8)}…`,
    };
  } catch (e) {
    const snapshot: SourcedPair[] = OFFICIAL_PAIRS.map((p) => ({ ...p, source: "snapshot" as const }));
    const why = e instanceof Error ? e.message : String(e);
    return {
      pairs: [...snapshot, ...locals],
      status: "snapshot",
      officialCount: snapshot.length,
      localCount: locals.length,
      note: `Snapshot fallback — live read unavailable (${why}). Showing S1 evidence snapshot (8 official pairs).`,
    };
  }
}
