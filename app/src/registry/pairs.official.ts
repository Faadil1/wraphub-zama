// Registry-validated Sepolia wrapper pairs — derived VERBATIM from spike artifacts:
// registry.json (S1 LIVE dump, 2026-07-02T01:15:47Z, registry 0x2f0750...128e)
// s2-faucet-results.json (S2 LIVE mints, mint(address,uint256))
// Evidence label: PRESEEDED snapshot of LIVE onchain data. Live onchain read
// replaces/augments this in a later step (hybrid sourcing) — do not hand-edit.

export const SEPOLIA_REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e" as const;
export const SNAPSHOT_AT = "2026-07-02T01:15:47Z" as const;

export type OfficialPair = {
  index: number;
  symbol: string;
  name: string;
  erc20: `0x${string}`;
  wrapper: `0x${string}`;
  decimals: number;
  isValid: boolean;
  /** true = official cTokenMock, faucet-claimable via mint(address,uint256) — proven S2 LIVE */
  faucet: boolean;
};

export const OFFICIAL_PAIRS: OfficialPair[] = [
  { index: 0, symbol: "USDCMock", name: "USD Coin (Mock)",      erc20: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF", wrapper: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639", decimals: 6,  isValid: true, faucet: true },
  { index: 1, symbol: "USDTMock", name: "Tether USD (Mock)",    erc20: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0", wrapper: "0x4E7B06D78965594eB5EF5414c357ca21E1554491", decimals: 6,  isValid: true, faucet: true },
  { index: 2, symbol: "WETHMock", name: "Wrapped Ether (Mock)", erc20: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F", wrapper: "0x46208622DA27d91db4f0393733C8BA082ed83158", decimals: 18, isValid: true, faucet: true },
  { index: 3, symbol: "BRONMock", name: "Bron (Mock)",          erc20: "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E", wrapper: "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891", decimals: 18, isValid: true, faucet: true },
  { index: 4, symbol: "ZAMAMock", name: "Zama (Mock)",          erc20: "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57", wrapper: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB", decimals: 18, isValid: true, faucet: true },
  { index: 5, symbol: "tGBPMock", name: "tGBP (Mock)",          erc20: "0x93c931278A2aad1916783F952f94276eA5111442", wrapper: "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC", decimals: 18, isValid: true, faucet: true },
  { index: 6, symbol: "XAUtMock", name: "Tether Gold (Mock)",   erc20: "0x24377AE4AA0C45ecEe71225007f17c5D423dd940", wrapper: "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7", decimals: 6,  isValid: true, faucet: true },
  { index: 7, symbol: "tGBP",     name: "tGBP",                 erc20: "0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3", wrapper: "0x167DC962808B32CFFFc7e14B5018c0bE06A3A208", decimals: 18, isValid: true, faucet: false },
];
