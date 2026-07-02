import { ethers } from "ethers";
import { ZamaSDK, sepolia, memoryStorage } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { node } from "@zama-fhe/sdk/node";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

if (!process.env.PRIVATE_KEY) {
  throw new Error("Set PRIVATE_KEY first");
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);

console.log("signer:", signer.address);
console.log("signer provider attached:", !!signer.provider);
console.log("provider network:", await provider.getNetwork());

const config = createConfig({
  chains: [sepolia],
  relayers: {
    [sepolia.id]: node()
  },
  signer,
  storage: memoryStorage
});

const sdk = new ZamaSDK(config);
const wrapped = sdk.createWrappedToken("0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639");

console.log("SDK created");
console.log("wrapped token object:", wrapped.constructor.name);
console.log("underlying:", await wrapped.underlying());
