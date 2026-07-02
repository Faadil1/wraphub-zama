// s1-registry.mjs — SPIKE PROBE ONLY
// Usage: node s1-registry.mjs

import { ethers } from "ethers";
import { writeFileSync } from "fs";

const REGISTRY = {
  sepolia: {
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    addr: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e"
  }
};

const ABI = [
  "function getTokenConfidentialTokenPairsSlice(uint256 fromIndex, uint256 toIndex) view returns (tuple(address tokenAddress, address confidentialTokenAddress, bool isValid)[])",
  "function getConfidentialTokenAddress(address token) view returns (bool isValid, address confidentialToken)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)"
];

const out = { generatedAt: new Date().toISOString(), networks: {} };

for (const [name, { rpc, addr }] of Object.entries(REGISTRY)) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const reg = new ethers.Contract(addr, ABI, provider);
  const pairs = [];

  console.log(`[${name}] registry: ${addr}`);
  console.log(`[${name}] reading pairs one-by-one...`);

  for (let i = 0; i < 100; i++) {
    try {
      const slice = await reg.getTokenConfidentialTokenPairsSlice(i, i + 1);

      if (!slice || slice.length === 0) {
        console.log(`[${name}] empty slice at index ${i}; stopping`);
        break;
      }

      const p = slice[0];
      let meta = { symbol: "UNKNOWN", name: "UNKNOWN", decimals: null };

      try {
        const erc20 = new ethers.Contract(p.tokenAddress, ERC20_ABI, provider);
        meta = {
          symbol: await erc20.symbol(),
          name: await erc20.name(),
          decimals: Number(await erc20.decimals())
        };
      } catch (e) {
        console.log(`[${name}] metadata failed at index ${i}: ${e.shortMessage || e.message}`);
      }

      pairs.push({
        index: i,
        token: p.tokenAddress,
        wrapper: p.confidentialTokenAddress,
        isValid: p.isValid,
        ...meta
      });

      console.log(`[${name}] pair ${i}:`, pairs[pairs.length - 1]);
    } catch (e) {
      const msg = e.shortMessage || e.message;
      console.log(`[${name}] stop at index ${i}: ${msg}`);
      break;
    }
  }

  out.networks[name] = { registry: addr, pairCount: pairs.length, pairs };

  try {
    const r = await reg.getConfidentialTokenAddress("0x000000000000000000000000000000000000dEaD");
    console.log("[S6] unregistered token returned:", r);
    out.unregisteredTokenCheck = {
      token: "0x000000000000000000000000000000000000dEaD",
      isValid: r[0],
      confidentialToken: r[1]
    };
  } catch (e) {
    console.log("[S6] unregistered token REVERTED:", e.shortMessage || e.message);
    out.unregisteredTokenCheck = { reverted: true, error: e.shortMessage || e.message };
  }
}

writeFileSync("registry.json", JSON.stringify(out, null, 2));
console.log("[S1] registry.json written");
console.log(JSON.stringify(out, null, 2));
