import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

// Set this before sending transactions.
// Use a THROWAWAY wallet only.
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ERC20_MINT_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount) public returns (bool)"
];

const registry = JSON.parse(readFileSync("registry.json", "utf8"));
const pairs = registry.networks.sepolia.pairs;

// Official cTokenMocks from registry dump = symbols ending in Mock.
// Treat non-Mock tGBP separately.
const mocks = pairs.filter((p) => p.symbol.endsWith("Mock"));

const provider = new ethers.JsonRpcProvider(RPC);
const signer = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;

const out = {
  generatedAt: new Date().toISOString(),
  wallet: signer?.address || null,
  mocks: []
};

console.log("Wallet:", signer?.address || "NO PRIVATE_KEY SET — read/static checks only");
console.log("Mocks:", mocks.map((m) => m.symbol).join(", "));

for (const p of mocks) {
  const token = new ethers.Contract(p.token, ERC20_MINT_ABI, signer || provider);

  const row = {
    symbol: p.symbol,
    erc20: p.token,
    wrapper: p.wrapper,
    decimals: p.decimals,
    faucetMethod: "mint(address,uint256)",
    status: "UNKNOWN",
    txHash: null,
    before: null,
    after: null,
    error: null
  };

  try {
    const balanceBefore = signer ? await token.balanceOf(signer.address) : null;
    row.before = balanceBefore?.toString() || null;

    if (!signer) {
      row.status = "UNKNOWN";
      row.error = "PRIVATE_KEY not set; mint transaction not attempted.";
      out.mocks.push(row);
      console.log(`[${p.symbol}] PRIVATE_KEY not set; skipping tx.`);
      continue;
    }

    // Tiny test amount: 10 units of token, respecting decimals.
    const amount = ethers.parseUnits("10", p.decimals);

    console.log(`[${p.symbol}] minting 10 tokens to ${signer.address}...`);
    const tx = await token.mint(signer.address, amount);
    row.txHash = tx.hash;
    console.log(`[${p.symbol}] tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[${p.symbol}] confirmed in block ${receipt.blockNumber}`);

    const balanceAfter = await token.balanceOf(signer.address);
    row.after = balanceAfter.toString();
    row.status = "LIVE";
  } catch (e) {
    row.status = "BLOCKED";
    row.error = e.shortMessage || e.message;
    console.log(`[${p.symbol}] failed: ${row.error}`);
  }

  out.mocks.push(row);
}

writeFileSync("s2-faucet-results.json", JSON.stringify(out, null, 2));
console.log("S2 results written to s2-faucet-results.json");
console.log(JSON.stringify(out, null, 2));
