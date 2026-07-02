import fs from "node:fs";
import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { node } from "@zama-fhe/sdk/node";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const CUSDC_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const AMOUNT = 1_000_000n;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)"
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
    receiptLogCount: result.receipt?.logs?.length ?? null,
    raw: result
  };
}

if (!process.env.PRIVATE_KEY) throw new Error("Set PRIVATE_KEY first");

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
  before: {},
  unshieldExact: null,
  unshieldAll: null,
  after: {},
  status: "STARTED",
  error: null
};

try {
  const beforePublic = await erc20.balanceOf(wallet);
  const beforeHandle = await wrapped.confidentialBalanceOf(wallet).catch(e => null);

  result.before = {
    publicBalance: beforePublic.toString(),
    confidentialHandle: beforeHandle
  };

  console.log("before public:", beforePublic.toString());
  console.log("before handle:", beforeHandle);

  try {
    console.log("\n--- cleanup exact unshield 1 USDCMock ---");
    const tx = await wrapped.unshield(AMOUNT, { skipBalanceCheck: true });
    result.unshieldExact = txSummary(tx);
    console.log("exact unshield tx:", result.unshieldExact.hash);
  } catch (e) {
    result.unshieldExact = {
      status: "FAILED",
      name: e.name,
      message: e.message,
      code: e.code
    };
    console.log("exact unshield failed:", e.shortMessage || e.message);

    console.log("\n--- fallback cleanup unshieldAll ---");
    const txAll = await wrapped.unshieldAll();
    result.unshieldAll = txSummary(txAll);
    console.log("unshieldAll tx:", result.unshieldAll.hash);
  }

  const afterPublic = await erc20.balanceOf(wallet);
  const afterHandle = await wrapped.confidentialBalanceOf(wallet).catch(e => null);

  result.after = {
    publicBalance: afterPublic.toString(),
    confidentialHandle: afterHandle
  };

  console.log("after public:", afterPublic.toString());
  console.log("after handle:", afterHandle);

  result.status = "CLEANUP_PASS";
} catch (e) {
  result.status = "CLEANUP_FAILED";
  result.error = {
    name: e.name,
    message: e.message,
    shortMessage: e.shortMessage,
    code: e.code,
    stack: e.stack
  };

  console.error("cleanup failed:", e.shortMessage || e.message);
} finally {
  fs.writeFileSync("s4-cleanup-unshield-results.json", asJson(result));
  console.log(asJson(result));
  sdk.terminate?.();
}
