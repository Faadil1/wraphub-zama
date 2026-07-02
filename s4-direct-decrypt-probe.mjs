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
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
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
    wrapper: CUSDC_WRAPPER
  },
  before: {},
  permit: null,
  encryptedBalanceHandle: null,
  decryptedValues: null,
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

  const publicBalance = await erc20.balanceOf(wallet);
  const encryptedBalanceHandle = await wrapped.confidentialBalanceOf(wallet);

  result.before = {
    publicBalance: publicBalance.toString()
  };
  result.encryptedBalanceHandle = encryptedBalanceHandle;

  console.log("public balance:", publicBalance.toString());
  console.log("encrypted balance handle:", encryptedBalanceHandle);

  console.log("\n--- grant EIP-712 permit for direct user-decryption ---");
  const hadPermitBefore = await sdk.permits.hasPermit([CUSDC_WRAPPER]);
  console.log("had permit before:", hadPermitBefore);

  await sdk.permits.grantPermit([CUSDC_WRAPPER]);

  const hasPermitAfter = await sdk.permits.hasPermit([CUSDC_WRAPPER]);
  console.log("has permit after:", hasPermitAfter);

  result.permit = {
    hadPermitBefore,
    hasPermitAfter
  };

  console.log("\n--- direct decryptValues user-decryption ---");
  const decrypted = await sdk.decryption.decryptValues([
    {
      encryptedValue: encryptedBalanceHandle,
      contractAddress: CUSDC_WRAPPER
    }
  ]);

  result.decryptedValues = decrypted;
  result.decryptedBalance = decrypted[encryptedBalanceHandle]?.toString?.() ?? String(decrypted[encryptedBalanceHandle]);

  console.log("decrypted values:", asJson(decrypted));
  console.log("decrypted balance:", result.decryptedBalance);

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

  console.error("\nS4 direct decrypt failed:");
  console.error(e.shortMessage || e.message);
} finally {
  fs.writeFileSync("s4-direct-decrypt-results.json", asJson(result));
  console.log("\nS4 direct decrypt results written to s4-direct-decrypt-results.json");
  console.log(asJson(result));
  sdk.terminate?.();
}
