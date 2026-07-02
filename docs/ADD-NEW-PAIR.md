# Adding a new ERC-20 ↔ ERC-7984 pair to WrapHub

WrapHub uses a **hybrid registry source**:

1. **Official onchain Wrappers Registry (primary source of truth).**
   On load, WrapHub reads `getTokenPairsSlice` from the Sepolia registry at
   `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` and renders every pair it returns,
   including its onchain `isValid` flag and live ERC-20 metadata. **You do not need
   to change any code for a pair that is added to the official registry — WrapHub
   discovers it automatically on the next load.** (Registry writes are owner-only;
   pairs are added by the Zama protocol team.)

2. **S1 evidence snapshot (fallback).**
   If the live read fails (RPC outage, offline demo), WrapHub falls back to the
   verified snapshot in `app/src/registry/pairs.official.ts` (captured from the
   live registry on 2026-07-02, see `registry.json` at the repo root) and labels
   the grid "Snapshot fallback" so nobody mistakes stale data for live data.

3. **Local config (custom / dev-only pairs).**
   For pairs that are *not* in the official registry — e.g. a wrapper you deployed
   yourself for development — add them to `app/src/registry/pairs.local.json`:

   ```json
   {
     "pairs": [
       {
         "symbol": "MYTOKENMock",
         "name": "My Token (Mock)",
         "erc20": "0xYourErc20Address...",
         "wrapper": "0xYourErc7984WrapperAddress...",
         "decimals": 18
       }
     ]
   }
   ```

   Rebuild (`npm run build`) or let the dev server hot-reload. Local pairs render
   with a **"Local config · dev-only"** badge, are never shown as
   "Registry: valid", and are read-only (no faucet/wrap actions) — WrapHub does
   not pretend a local pair is official. To decrypt a local wrapper balance, use
   the **Decrypt any token** tab, which works with any ERC-7984 address.

## Worked example

Add this to `pairs.local.json` (using the official cUSDCMock addresses purely to
demonstrate the mechanics — in practice you'd use your own deployment):

```json
{
  "pairs": [
    {
      "symbol": "DEMOLocal",
      "name": "Demo Local Pair",
      "erc20": "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
      "wrapper": "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
      "decimals": 6
    }
  ]
}
```

Reload: a ninth card appears with the blue "Local config · dev-only" badge and no
action button. Remove the entry to return to the 8 official pairs.

## How validity is decided

- Official pairs: `isValid` comes from the onchain registry row, re-read on every load.
- Local pairs: always displayed as local/dev-only. If your pair later gets added to
  the official registry, delete it from `pairs.local.json` — the live read takes over.
