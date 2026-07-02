import fs from "node:fs";
import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { node } from "@zama-fhe/sdk/node";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const AMOUNT = 1_000_000n; // 1 USDCMock, 6 decimals

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

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
    receipt: result.receipt ?? null,
    raw: result
  };
}

if (!process.env.PRIVATE_KEY) {
  throw new Error("Set PRIVATE_KEY first");
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);
const wallet = signer.address;

const erc20 = new ethers.Contract(USDC, ERC20_ABI, provider);

console.log("wallet:", wallet);
console.log("network:", await provider.getNetwork());
console.log("token:", await erc20.symbol(), "decimals:", await erc20.decimals());

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

const beforePublic = await erc20.balanceOf(wallet);
const beforeAllowance = await erc20.allowance(wallet, CUSDC_WRAPPER);
const underlying = await wrapped.underlying();

console.log("underlying:", underlying);
console.log("public balance before:", beforePublic.toString());
console.log("allowance before:", beforeAllowance.toString());

const result = {
  generatedAt: new Date().toISOString(),
  wallet,
  chainId: Number((await provider.getNetwork()).chainId),
  pair: {
    symbol: "USDCMock",
    erc20: USDC,
    wrapper: CUSDC_WRAPPER,
    amount: AMOUNT.toString()
  },
  before: {
    publicBalance: beforePublic.toString(),
    allowance: beforeAllowance.toString()
  },
  shield: null,
  afterShield: null,
  confidentialBalanceRead: null,
  unshield: null,
  afterUnshield: null,
  status: "STARTED",
  error: null
};

try {
  console.log("\n--- shield 1 USDCMock ---");
  const shieldTx = await wrapped.shield(AMOUNT);
  console.log("shield result:", asJson(txSummary(shieldTx)));
  result.shield = txSummary(shieldTx);

  const afterShieldPublic = await erc20.balanceOf(wallet);
  const afterShieldAllowance = await erc20.allowance(wallet, CUSDC_WRAPPER);

  result.afterShield = {
    publicBalance: afterShieldPublic.toString(),
    allowance: afterShieldAllowance.toString()
  };

  console.log("public balance after shield:", afterShieldPublic.toString());
  console.log("allowance after shield:", afterShieldAllowance.toString());

  try {
    const confidentialBalance = await wrapped.confidentialBalanceOf(wallet);
    result.confidentialBalanceRead = {
      status: "READ_OK",
      value: confidentialBalance
    };
    console.log("confidentialBalanceOf:", asJson(confidentialBalance));
  } catch (e) {
    result.confidentialBalanceRead = {
      status: "READ_FAILED",
      error: e.shortMessage || e.message
    };
    console.log("confidentialBalanceOf failed:", e.shortMessage || e.message);
  }

  console.log("\n--- unshield 1 USDCMock ---");
  const unshieldTx = await wrapped.unshield(AMOUNT, { skipBalanceCheck: true });
  console.log("unshield result:", asJson(txSummary(unshieldTx)));
  result.unshield = txSummary(unshieldTx);

  const afterUnshieldPublic = await erc20.balanceOf(wallet);
  const afterUnshieldAllowance = await erc20.allowance(wallet, CUSDC_WRAPPER);

  result.afterUnshield = {
    publicBalance: afterUnshieldPublic.toString(),
    allowance: afterUnshieldAllowance.toString()
  };

  console.log("public balance after unshield:", afterUnshieldPublic.toString());
  console.log("allowance after unshield:", afterUnshieldAllowance.toString());

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

  console.error("\nS3 failed:");
  console.error(e.shortMessage || e.message);
} finally {
  fs.writeFileSync("s3-wrap-results.json", asJson(result));
  console.log("\nS3 results written to s3-wrap-results.json");
  console.log(asJson(result));
  sdk.terminate?.();
}
