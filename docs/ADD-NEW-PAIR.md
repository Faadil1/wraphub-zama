# Adding new wrapper pairs to WrapHub

WrapHub uses a hybrid registry source model.

The app separates:

1. Official Sepolia wrapper pairs
2. Live onchain validation
3. Local development-only pairs

This distinction is intentional. WrapHub should not make a local pair look like an official Zama registry pair.

## Official pairs

Official pairs are stored in:

    app/src/registry/pairs.official.ts

These pairs were captured from the official Sepolia Wrappers Registry during the registry spike.

On app load, WrapHub re-validates each official wrapper against the live Sepolia registry contract:

    0x2f0750Bbb0A246059d80e94c454586a7F27a128e

The validation checks whether each confidential wrapper is currently recognized by the live registry.

This means the pair list is evidence-derived, while the validity state is checked live onchain.

## Local development pairs

Local or custom pairs are stored in:

    app/src/registry/pairs.local.json

Use this file for:

- local testing;
- development-only wrappers;
- experimental pairs;
- custom deployments not yet part of the official Sepolia registry.

Local pairs should remain clearly labeled as local or development-only. They should not be presented as official registry pairs unless they are actually validated by the live registry.

## Adding a local pair

Add an entry to app/src/registry/pairs.local.json with the same shape as the existing examples.

Recommended fields:

    {
      "symbol": "MYTOKEN",
      "name": "My Token",
      "underlying": "0x...",
      "wrapper": "0x...",
      "underlyingDecimals": 18,
      "wrapperDecimals": 6,
      "network": "sepolia",
      "source": "local"
    }

After editing the file, run:

    cd app
    npm run build

Then open the dApp locally and confirm that the pair is displayed as a local or development pair, not as an official registry-validated pair.

## Adding a new official pair

If Zama adds a new official wrapper pair to Sepolia, update the official snapshot only after verifying the pair against the live registry.

Recommended process:

1. Confirm the underlying ERC-20 token address.
2. Confirm the ERC-7984 wrapper address.
3. Confirm decimals for both the underlying token and wrapper display.
4. Verify the wrapper against the official Wrappers Registry.
5. Add the pair to app/src/registry/pairs.official.ts.
6. Run a local build.
7. Test the pair in the dApp.
8. Update README evidence if needed.

## Why WrapHub does not treat local pairs as official

Local pairs are useful for builders, but they are not the same as official Zama registry entries.

WrapHub keeps the distinction visible so that judges, users, and developers can trust what the UI is showing:

- official pairs are evidence-derived and live-validated;
- local pairs are configurable and development-only;
- failed registry checks are surfaced honestly.

## Safety rule

Do not add a pair to the official list unless it can be verified against the live Sepolia Wrappers Registry.
