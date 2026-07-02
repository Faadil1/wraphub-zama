# WrapHub — Registry with a Pulse

The app that makes deploying your own wrapper unnecessary.
The composability entry point for Zama confidential tokens.

Zama Developer Program Mainnet Season 3 — Bounty Track.

## Status
- [x] Spike S1–S4 LIVE PASS (registry, faucet, shield/unshield, EIP-712 decrypt) — Node
- [ ] S5 browser viability gate (this commit: probe at src/Probe.tsx)
- [ ] Registry grid · action drawer · arbitrary ERC-7984 decrypt · local config

## Live URL
TBD (placeholder — required deliverable)

## Networks
Sepolia (chainId 11155111). Registry: 0x2f0750Bbb0A246059d80e94c454586a7F27a128e

## Registry sourcing
Hybrid: official onchain Wrappers Registry (primary) + pairs.local.json (dev-only, labeled). Details TBD.

## Adding a new pair
docs/ADD-NEW-PAIR.md — TBD.

## Run
npm i && npm run dev

## S5 browser viability result — spike wallet rerun

Verdict: S5_BROWSER_PASS

Browser proof with spike wallet:
- Wallet: 0x48F5b9e0fcC28A62167d45db1bc527da3267d753
- Network: Sepolia
- Browser SDK adapter: `web()` from `@zama-fhe/sdk/web`
- Connected wallet: OK
- `confidentialBalanceOf` returned a non-zero encrypted handle:
  0xc7b8056ee3982a93ccb03982f2fe1dc7ef441f93a4ff0000000000aa36a70500
- EIP-712 permit prompt appeared and was signed.
- `hasPermit([cUSDCMock])` returned true.
- `decryptValues([{ encryptedValue, contractAddress }])` returned plaintext.
- Plaintext result: 0

Interpretation:
- Browser Zama SDK viability is confirmed.
- The wallet had no remaining confidential cUSDCMock balance after S4 cleanup, so plaintext 0 is expected.
- The full browser path is proven:
  connect wallet → read encrypted handle → sign EIP-712 permit → hasPermit true → decryptValues plaintext.

