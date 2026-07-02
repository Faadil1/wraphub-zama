import fs from "node:fs";
import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { node } from "@zama-fhe/sdk/node";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const AMOUNT = 1_000_000n; // 1 USDCMock

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function asJson(value) {
  return JSON.stringify(
    value,
    (_, v) => typeof v === "bigint" ? v.toString() : v,
    2
  );
}

function txSummary(result) {
  if (!result) return null;
  return {
    hash: result.hash ?? result.txHash ?? result.transactionHash ?? null,
    receiptLogCount: result.receipt?.logs?.length ?? null,
    raw: result
  };
}

async function retryDecrypt(fn, attempts = 6, delayMs = 10000) {
  let lastError = null;

  for (let i = 1; i <= attempts; i++) {
    try {
      console.log(`decrypt attempt ${i}/${attempts}`);
      return await fn();
    } catch (e) {
      lastError = e;
      console.log(`decrypt attempt ${i} failed:`, e.shortMessage || e.message);
      if (i < attempts) await sleep(delayMs);
    }
  }

  throw lastError;
}

if (!process.env.PRIVATE_KEY) {
  throw new Error("Set PRIVATE_KEY first");
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);
const wallet = signer.address;

const erc20 = new ethers.Contract(USDC, ERC20_ABI, provider);

const config = createConfig({
  chains: [sepolia],
  relayers: {
    [sepolia.id]: node()
  },
  signer,
  storage: memoryStorage
});

const sdk = new ZamaSDK(config);
const wrapped = sdk.createWrappedToken(CUSDC_WRAPPER);

const result = {
  generatedAt: new Date().toISOString(),
  wallet,
  chainId: Number((await provider.getNetwork()).chainId),
  token: {
    symbol: "USDCMock",
    erc20: USDC,
    wrapper: CUSDC_WRAPPER,
    amount: AMOUNT.toString()
  },
  before: {},
  shield: null,
  afterShield: {},
  encryptedBalanceHandle: null,
  decryptedBalance: null,
  cleanupUnshield: null,
  afterCleanup: {},
  status: "STARTED",
  error: null
};

try {
  console.log("wallet:", wallet);
  console.log("network:", await provider.getNetwork());
  console.log("token:", await erc20.symbol(), "decimals:", await erc20.decimals());

  const beforePublic = await erc20.balanceOf(wallet);
  const beforeHandle = await wrapped.confidentialBalanceOf(wallet).catch(e => null);

  result.before = {
    publicBalance: beforePublic.toString(),
    confidentialHandle: beforeHandle
  };

  console.log("public balance before:", beforePublic.toString());
  console.log("confidential handle before:", beforeHandle);

  if (beforePublic < AMOUNT) {
    throw new Error(`Not enough USDCMock public balance. Need ${AMOUNT}, have ${beforePublic}`);
  }

  console.log("\n--- shield 1 USDCMock for decrypt proof ---");
  const shieldTx = await wrapped.shield(AMOUNT);
  result.shield = txSummary(shieldTx);
  console.log("shield tx:", result.shield.hash);

  const afterShieldPublic = await erc20.balanceOf(wallet);
  const encryptedBalanceHandle = await wrapped.confidentialBalanceOf(wallet);

  result.afterShield = {
    publicBalance: afterShieldPublic.toString()
  };
  result.encryptedBalanceHandle = encryptedBalanceHandle;

  console.log("public balance after shield:", afterShieldPublic.toString());
  console.log("encrypted balance handle:", encryptedBalanceHandle);

  console.log("\n--- decrypt confidential balance via EIP-712 user-decryption ---");
  const decrypted = await retryDecrypt(() =>
    wrapped.decryptBalanceAs({
      delegatorAddress: wallet
    })
  );

  result.decryptedBalance = decrypted.toString();

  console.log("decrypted balance:", decrypted.toString());

  console.log("\n--- cleanup: unshield 1 USDCMock back to public balance ---");
  const unshieldTx = await wrapped.unshield(AMOUNT, { skipBalanceCheck: true });
  result.cleanupUnshield = txSummary(unshieldTx);
  console.log("cleanup unshield tx:", result.cleanupUnshield.hash);

  const afterCleanupPublic = await erc20.balanceOf(wallet);
  const afterCleanupHandle = await wrapped.confidentialBalanceOf(wallet).catch(e => null);

  result.afterCleanup = {
    publicBalance: afterCleanupPublic.toString(),
    confidentialHandle: afterCleanupHandle
  };

  console.log("public balance after cleanup:", afterCleanupPublic.toString());
  console.log("confidential handle after cleanup:", afterCleanupHandle);

  result.status = "LIVE_PASS";
} catch (e) {
  result.status = "FAILED";
  result.error = {
    name: e.name,
    message: e.message,
    shortMessage: e.shortMessage,
    code: e.code,
    stack: e.stack
  };

  console.error("\nS4 failed:");
  console.error(e.shortMessage || e.message);
} finally {
  fs.writeFileSync("s4-decrypt-results.json", asJson(result));
  console.log("\nS4 results written to s4-decrypt-results.json");
  console.log(asJson(result));
  sdk.terminate?.();
}
