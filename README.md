# WrapHub — Registry with a Pulse

**The composability entry point for Zama confidential tokens.**

Live dApp: https://faadil1.github.io/wraphub-zama/

WrapHub turns the Zama Sepolia wrappers registry into a usable web app.

Instead of forcing every builder or user to deploy their own wrapper, WrapHub lets them discover official wrapper pairs, claim mock tokens, shield ERC-20 tokens into ERC-7984 confidential tokens, decrypt their own confidential balances through EIP-712, and unshield back to public ERC-20 tokens.

## Why WrapHub matters

Zama confidential tokens are powerful, but the wrapper layer can be hard to reason about for users and builders.

WrapHub provides one interface for:

- browsing official ERC-20 to ERC-7984 wrapper pairs on Sepolia;
- claiming official mock tokens when a faucet is available;
- wrapping public ERC-20 tokens into confidential ERC-7984 tokens;
- decrypting a user's own confidential balance with EIP-712 user decryption;
- unwrapping confidential balances back to public ERC-20 tokens;
- testing arbitrary ERC-7984 balance decryption by pasted token address;
- extending the app with local development-only pairs.

## Live app

- Public dApp: https://faadil1.github.io/wraphub-zama/
- Network: Sepolia
- Registry contract: `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`

## Implemented bounty requirements

| Requirement | Status |
|---|---|
| Public live web dApp | Implemented |
| Sepolia support | Implemented |
| Browse official ERC-20 to ERC-7984 wrapper pairs | Implemented |
| Claim official cTokenMock test tokens | Implemented for faucet-enabled mock tokens |
| Wrap / shield ERC-20 into ERC-7984 | Implemented |
| Unwrap / unshield ERC-7984 back to ERC-20 | Implemented |
| EIP-712 user decryption of confidential balances | Implemented |
| Arbitrary ERC-7984 decrypt by pasted address | Implemented |
| Hybrid registry plus local development source | Implemented |
| Documentation for adding new pairs | See `docs/ADD-NEW-PAIR.md` |

## Official Sepolia pairs

WrapHub displays the official Sepolia wrapper pairs captured during the registry spike and re-validates each wrapper live against the official Sepolia Wrappers Registry.

The app includes:

- USDCMock
- USDTMock
- WETHMock
- BRONMock
- ZAMAMock
- tGBPMock
- XAUtMock
- tGBP

The mock pairs expose faucet/mint actions when available. Non-mock registry pairs are treated honestly according to their available contract capabilities.

## Registry sourcing model

WrapHub uses a hybrid source model:

1. Official snapshot: the official Sepolia wrapper pairs captured during the registry spike are stored in the app.
2. Live onchain validation: on app load, each official wrapper is checked against the live Sepolia Wrappers Registry using `isConfidentialTokenValid`.
3. Local development config: custom or development-only pairs can be added through a local config file and are clearly separated from official registry-valid pairs.

This avoids pretending that local configuration is official registry data while still allowing builders to test custom wrappers.

If the registry is temporarily unavailable, the app keeps the evidence-derived official snapshot visible and labels the state honestly.

## Main user flow

Recommended demo path:

1. Connect a wallet on Sepolia.
2. Open the USDCMock pair.
3. Mint mock USDC.
4. Shield USDCMock into cUSDCMock.
5. Sign the EIP-712 user-decryption permit.
6. Decrypt the confidential balance in-browser.
7. Unshield back to public USDCMock.

## Arbitrary ERC-7984 decrypt

WrapHub also includes an arbitrary decrypt tab.

A user can paste an ERC-7984 token address on Sepolia and attempt to decrypt their own balance through the same EIP-712 self-decryption flow.

The app performs address validation and ERC-165 capability detection before attempting decrypt operations.

## Evidence

The project was built through staged proof gates:

- Registry discovery and pair verification.
- Faucet/mint proof for official mock tokens.
- Live USDCMock shield and unshield proof.
- EIP-712 self-decryption proof using permit then decryptValues.
- Browser dApp viability proof with MetaMask on Sepolia.
- GitHub Pages deployment proof.

Key proven implementation details:

- direct EIP-712 self-decryption path;
- wrapper decimal normalization;
- two-phase unshield/finalize states;
- arbitrary ERC-7984 detection;
- wallet address masking in the demo UI.

## Local development

Install and run locally:

    cd app
    npm install
    npm run dev

Build:

    cd app
    npm run build

## Deployment

The app is deployed to GitHub Pages through GitHub Actions.

Production build output is generated from the app folder and published from app/dist.

## License

MIT
