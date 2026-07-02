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
  return JSON.stringify(value, (_, v) => {
    if (typeof v === "bigint") return v.toString();
    if (v instanceof Error) {
      return {
        name: v.name,
        message: v.message,
        shortMessage: v.shortMessage,
        code: v.code,
        reason: v.reason,
        data: v.data,
        info: v.info,
        cause: v.cause,
        stack: v.stack
      };
    }
    return v;
  }, 2);
}

function err(e) {
  return {
    name: e?.name,
    message: e?.message,
    shortMessage: e?.shortMessage,
    code: e?.code,
    reason: e?.reason,
    data: e?.data,
    info: e?.info,
    cause: e?.cause,
    stack: e?.stack
  };
}

if (!process.env.PRIVATE_KEY) throw new Error("Set PRIVATE_KEY first");

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);
const wallet = signer.address;
const erc20 = new ethers.Contract(USDC, ERC20_ABI, provider);

const sdkEvents = [];
const phaseEvents = [];

const config = createConfig({
  chains: [sepolia],
  relayers: { [sepolia.id]: node() },
  signer,
  storage: memoryStorage,
  logger: console,
  onEvent: (event) => {
    sdkEvents.push(event);
    console.log("SDK_EVENT", asJson(event));
  }
});

const sdk = new ZamaSDK(config);
const wrapped = sdk.createWrappedToken(CUSDC_WRAPPER);

const result = {
  generatedAt: new Date().toISOString(),
  wallet,
  before: {},
  decryptConfirm: {},
  phaseEvents,
  sdkEvents,
  unshield: null,
  unwrapOnly: null,
  resume: null,
  after: {},
  status: "STARTED"
};

try {
  const publicBefore = await erc20.balanceOf(wallet);
  const handleBefore = await wrapped.confidentialBalanceOf(wallet);

  result.before = {
    publicBalance: publicBefore.toString(),
    encryptedBalanceHandle: handleBefore
  };

  console.log("before public:", publicBefore.toString());
  console.log("before handle:", handleBefore);

  await sdk.permits.grantPermit([CUSDC_WRAPPER]);

  const decrypted = await sdk.decryption.decryptValues([
    { encryptedValue: handleBefore, contractAddress: CUSDC_WRAPPER }
  ]);

  const decryptedBalance = decrypted[handleBefore]?.toString?.() ?? String(decrypted[handleBefore]);

  result.decryptConfirm = {
    decrypted,
    decryptedBalance
  };

  console.log("decrypted balance:", decryptedBalance);

  console.log("\n--- unshield with callbacks ---");

  try {
    const tx = await wrapped.unshield(AMOUNT, {
      skipBalanceCheck: true,
      onUnwrapSubmitted: (txHash) => {
        phaseEvents.push({ phase: "onUnwrapSubmitted", txHash });
        console.log("CALLBACK onUnwrapSubmitted:", txHash);
      },
      onFinalizing: () => {
        phaseEvents.push({ phase: "onFinalizing" });
        console.log("CALLBACK onFinalizing");
      },
      onFinalizeSubmitted: (txHash) => {
        phaseEvents.push({ phase: "onFinalizeSubmitted", txHash });
        console.log("CALLBACK onFinalizeSubmitted:", txHash);
      }
    });

    result.unshield = {
      status: "PASS",
      txHash: tx.txHash ?? tx.hash ?? tx.transactionHash,
      raw: tx
    };
    result.status = "UNSHIELD_PASS";
  } catch (e) {
    result.unshield = {
      status: "FAILED",
      error: err(e)
    };
    console.log("unshield failed:", e.shortMessage || e.message);
  }

  // If unwrap was submitted but finalization failed, try resumeUnshield.
  const unwrapSubmitted = phaseEvents.find(e => e.phase === "onUnwrapSubmitted");

  if (result.unshield?.status === "FAILED" && unwrapSubmitted?.txHash) {
    console.log("\n--- resumeUnshield from submitted unwrap tx ---");
    try {
      const resumed = await wrapped.resumeUnshield(unwrapSubmitted.txHash, {
        onFinalizing: () => {
          phaseEvents.push({ phase: "resume:onFinalizing" });
          console.log("CALLBACK resume:onFinalizing");
        },
        onFinalizeSubmitted: (txHash) => {
          phaseEvents.push({ phase: "resume:onFinalizeSubmitted", txHash });
          console.log("CALLBACK resume:onFinalizeSubmitted:", txHash);
        }
      });

      result.resume = {
        status: "PASS",
        txHash: resumed.txHash ?? resumed.hash ?? resumed.transactionHash,
        raw: resumed
      };
      result.status = "RESUME_PASS";
    } catch (e) {
      result.resume = {
        status: "FAILED",
        error: err(e)
      };
      console.log("resume failed:", e.shortMessage || e.message);
      result.status = "UNSHIELD_FAILED_AFTER_UNWRAP_SUBMITTED";
    }
  } else if (result.unshield?.status === "FAILED") {
    result.status = "UNSHIELD_FAILED_BEFORE_UNWRAP_SUBMITTED";
  }

  const publicAfter = await erc20.balanceOf(wallet);
  const handleAfter = await wrapped.confidentialBalanceOf(wallet).catch(e => null);

  result.after = {
    publicBalance: publicAfter.toString(),
    encryptedBalanceHandle: handleAfter
  };

  console.log("after public:", publicAfter.toString());
  console.log("after handle:", handleAfter);
} finally {
  fs.writeFileSync("s4-unshield-phase-diagnose-results.json", asJson(result));
  console.log("\nwritten s4-unshield-phase-diagnose-results.json");
  console.log(asJson(result));
  sdk.terminate?.();
}
