# WrapHub — Registry with a Pulse

Bounty-first spike for the Zama Developer Program Mainnet Season 3.

WrapHub turns the Zama Sepolia Wrappers Registry into a usable product:
browse official ERC-20 ↔ ERC-7984 pairs, mint official mock tokens, shield, decrypt confidential balances with EIP-712 user-decryption, and unshield.

## Current status

Core Sepolia spike: PASS

- S1 Registry probe: PASS
- S2 Faucet/mint official mocks: PASS
- S3 Shield/unshield official pair: LIVE PASS
- S4 EIP-712 direct user-decryption: LIVE PASS
- S4 unshield cleanup diagnosis: LIVE PASS

## Important implementation note

For self-decryption, do not use `decryptBalanceAs`.

Correct direct EIP-712 user-decryption path:

```js
await sdk.permits.grantPermit([wrapperAddress]);

const values = await sdk.decryption.decryptValues([
  { encryptedValue: handle, contractAddress: wrapperAddress }
]);
]);

`decryptBalanceAs` is for delegated decryption and requires an active delegation.

## Next phase

S5 browser dApp viability gate:

- Vite + React + TypeScript
- Browser wallet connection
- Browser ZamaSDK config
- USDCMock confidential balance decrypt proof in browser

