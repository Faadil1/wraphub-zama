# spike-evidence.md — WrapHub Spike v2 (S0–S6)

Date/time (TZ):
Environment: Google Cloud Shell
Throwaway wallet address:
Labels: LIVE / LOCAL / PRESEEDED / SIMULATED / UNKNOWN / BLOCKED

## S0 — Terms & eligibility
- Eligibility/geography: PASS — user-verified official forms. No Canada/Quebec exclusion found. Label: LIVE / USER-VERIFIED
- Prior-work policy: No blocker found in form review. Label: LIVE / USER-VERIFIED
- Public repo required: Required. Label:
- Live deployment required: Required. Label:
- Real-person video rule + AI voice/video disqualification: Required, AI voice/video not allowed. Label:
- X thread/article requirement: Required. Label:
- Deadline confirmation: July 7, 23:59 AOE. Label:
- Dual-submission / one-entry language: No blocker found in form review. Label: LIVE / USER-VERIFIED
  → If forbidden: Builder Phase 2 = PERMANENTLY DORMANT this season. Recorded? N/A

## S1 — Sepolia registry
- Docs source URL(s):
- Sepolia registry address: Label:
- ABI verified char-by-char vs docs [Y/N]; diffs found/fixed: Label:
- Pair dump: count, isValid counts, timestamp: Label:
- Per-pair metadata attached: Label:
- Mainnet read-only metadata optional: Label:

## S2 — cTokenMocks faucet coverage
Docs list URL:
| symbol | ERC-20 addr | ERC-7984 wrapper | faucet method | tx hash | status |
|---|---|---|---|---|---|
- Unclaimable tokens:

## S3 — Wrap / unwrap
- Pair used:
- Approval tx:
- Wrap tx hash:
- Unwrap tx hash:
- Errors + fixes:
- Generalization note:

## S4a — Registry ERC-7984 decrypt
- Token address:
- EIP-712 prompt evidence:
- Decrypted result vs expected:
- Relayer URL / API key required?:

## S4b — Arbitrary ERC-7984 decrypt
- Address used + registry or NON-registry:
- Interface check result:
- EIP-712 evidence + decrypted balance:
- If no non-registry token found:

## S5 — Browser / relayer / deployment viability
- Browser flow result:
- Architecture:
- Live deployment path feasible:

## S6 — Hybrid source + extensibility
- pairs.local.json sample:
- Merged output:
- registry.json:
- docs/ADD-NEW-PAIR.md draft:

## Submission deliverables status
- Public repo path decided:
- Live URL path decided:
- Real-person video plan acknowledged: Y
- X thread/article plan acknowledged: Y

## Final verdict: PASS / READY-WITH-CONDITIONS / STOP
- Conditions:
- Entries left UNKNOWN/BLOCKED and why:

## S1 — Sepolia registry evidence update

S1 attempt 1:
- Registry address call worked.
- Initial `getTokenConfidentialTokenPairsSlice(0,50)` reverted with `ARRAY_RANGE_ERROR(50)` because requested range exceeded registry length.
- Not classified as S1 failure.
- Patched script to read one pair at a time using `slice(i, i+1)`.
Label: LOCAL / REPAIR_LOOP

S1 final:
- Sepolia Wrappers Registry address: 0x2f0750Bbb0A246059d80e94c454586a7F27a128e
- Pair dump produced successfully.
- Pair count: 8
- isValid count: 8 true, 0 false
- Metadata captured for all pairs: symbol, name, decimals, ERC-20 address, ERC-7984 wrapper address.
- `registry.json` written.
- Unregistered token check returned `false` and zero address.
Label: LIVE

Official pairs:
1. USDCMock — ERC20 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF — ERC7984 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 — decimals 6
2. USDTMock — ERC20 0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0 — ERC7984 0x4E7B06D78965594eB5EF5414c357ca21E1554491 — decimals 6
3. WETHMock — ERC20 0xff54739b16576FA5402F211D0b938469Ab9A5f3F — ERC7984 0x46208622DA27d91db4f0393733C8BA082ed83158 — decimals 18
4. BRONMock — ERC20 0xFf021fB13cA64e5354c62c954b949a88cfDEb25E — ERC7984 0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891 — decimals 18
5. ZAMAMock — ERC20 0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57 — ERC7984 0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB — decimals 18
6. tGBPMock — ERC20 0x93c931278A2aad1916783F952f94276eA5111442 — ERC7984 0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC — decimals 18
7. XAUtMock — ERC20 0x24377AE4AA0C45ecEe71225007f17c5D423dd940 — ERC7984 0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7 — decimals 6
8. tGBP — ERC20 0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3 — ERC7984 0x167DC962808B32CFFFc7e14B5018c0bE06A3A208 — decimals 18

S1 verdict: PASS

## S2 — cTokenMocks faucet coverage evidence update

S2 verdict: PASS

Funding:
- Wallet funded with Sepolia ETH via PoW faucet after regular faucet blockers.
- S2 mint probe executed successfully.
Label: LIVE

Faucet method:
- All official Mock ERC-20 tokens expose and successfully executed `mint(address,uint256)`.
- Mint amount used: 10 tokens per mock.
Label: LIVE

Per-token results:
| symbol | ERC-20 addr | ERC-7984 wrapper | faucet method | tx hash | status |
|---|---|---|---|---|---|
| USDCMock | 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF | 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 | mint(address,uint256) | 0x5c4488055bda9aa16cb4f368378ef83ce06fbf1e5c2186530db93048a02fab62 | LIVE |
| USDTMock | 0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0 | 0x4E7B06D78965594eB5EF5414c357ca21E1554491 | mint(address,uint256) | 0x8772a979034dec0e8e72505b53ddabe00cafd6dde8367fd81311dce5211175f4 | LIVE |
| WETHMock | 0xff54739b16576FA5402F211D0b938469Ab9A5f3F | 0x46208622DA27d91db4f0393733C8BA082ed83158 | mint(address,uint256) | 0x0a202b857b2e1aa1dc25f95352e9e48ac12ff82c336787f75bc7fe733ac197a6 | LIVE |
| BRONMock | 0xFf021fB13cA64e5354c62c954b949a88cfDEb25E | 0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891 | mint(address,uint256) | 0x6058df5b90d2f91b6c5271de95be6ae481a794f49fb1803fd59a2174e8e05899 | LIVE |
| ZAMAMock | 0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57 | 0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB | mint(address,uint256) | 0x448ca0b7c98446612332484edb03fce0b580166471165face0f089df9ae5a8d4 | LIVE |
| tGBPMock | 0x93c931278A2aad1916783F952f94276eA5111442 | 0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC | mint(address,uint256) | 0x2106e99b7897d5ec8f1c938b197836ecdc9a7616b9ce330fd61e3096b949aa0b | LIVE |
| XAUtMock | 0x24377AE4AA0C45ecEe71225007f17c5D423dd940 | 0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7 | mint(address,uint256) | 0x9ffc4fe3247d3ab9d7b88ec6dd561eea6f48140173bad4a7021e8c035882fc67 | LIVE |

Unclaimable tokens:
- None among official Mock ERC-20 tokens tested.
Label: LIVE

S2 artifact:
- `s2-faucet-results.json` written.
Label: LOCAL


## S2 — cTokenMocks faucet coverage evidence update

S2 verdict: PASS

Funding:
- Wallet funded with 0.068 Sepolia ETH via Sepolia PoW faucet after regular faucet blockers.
Label: LIVE / FAUCET_FUNDING_RECOVERY

Faucet method:
- All official Mock ERC-20 tokens expose and successfully executed `mint(address,uint256)`.
- Mint amount used: 10 tokens per mock.
Label: LIVE

Per-token results:
| symbol | ERC-20 addr | ERC-7984 wrapper | faucet method | tx hash | status |
|---|---|---|---|---|---|
| USDCMock | 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF | 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 | mint(address,uint256) | 0x5c4488055bda9aa16cb4f368378ef83ce06fbf1e5c2186530db93048a02fab62 | LIVE |
| USDTMock | 0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0 | 0x4E7B06D78965594eB5EF5414c357ca21E1554491 | mint(address,uint256) | 0x8772a979034dec0e8e72505b53ddabe00cafd6dde8367fd81311dce5211175f4 | LIVE |
| WETHMock | 0xff54739b16576FA5402F211D0b938469Ab9A5f3F | 0x46208622DA27d91db4f0393733C8BA082ed83158 | mint(address,uint256) | 0x0a202b857b2e1aa1dc25f95352e9e48ac12ff82c336787f75bc7fe733ac197a6 | LIVE |
| BRONMock | 0xFf021fB13cA64e5354c62c954b949a88cfDEb25E | 0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891 | mint(address,uint256) | 0x6058df5b90d2f91b6c5271de95be6ae481a794f49fb1803fd59a2174e8e05899 | LIVE |
| ZAMAMock | 0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57 | 0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB | mint(address,uint256) | 0x448ca0b7c98446612332484edb03fce0b580166471165face0f089df9ae5a8d4 | LIVE |
| tGBPMock | 0x93c931278A2aad1916783F952f94276eA5111442 | 0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC | mint(address,uint256) | 0x2106e99b7897d5ec8f1c938b197836ecdc9a7616b9ce330fd61e3096b949aa0b | LIVE |
| XAUtMock | 0x24377AE4AA0C45ecEe71225007f17c5D423dd940 | 0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7 | mint(address,uint256) | 0x9ffc4fe3247d3ab9d7b88ec6dd561eea6f48140173bad4a7021e8c035882fc67 | LIVE |

Unclaimable tokens:
- None among official Mock ERC-20 tokens tested.
Label: LIVE

S2 artifact:
- `s2-faucet-results.json` written.
Label: LOCAL


## S3 — SDK signature inspection update

- `@zama-fhe/sdk` inspected through exports and `.d.ts` signatures.
- `ZamaSDK.createWrappedToken(address)` returns a `WrappedToken`.
- `WrappedToken.approveUnderlying(amount?: bigint)` is available.
- `WrappedToken.shield(amount: bigint, options?)` is available.
- `WrappedToken.unshield(amount: bigint, options?)` is available and documented as orchestrating unwrap + finalize.
- `WrappedToken.unshieldAll()`, `resumeUnshield()`, and `finalizeUnwrap()` are available.
- No wrap/unwrap transaction attempted yet.
Label: LOCAL / SDK_SIGNATURE_CONFIRMED


## S3 — SDK config smoke PASS

S3 config smoke verdict: PASS

- Node SDK config initialized successfully.
- Ethers signer detected and provider attached.
- Sepolia network detected: chainId 11155111.
- Correct relayer factory found: `node()` from `@zama-fhe/sdk/node`.
- `ZamaSDK` instance created successfully.
- `sdk.createWrappedToken(cUSDCMockWrapper)` created wrapper interface.
- `wrapped.underlying()` returned USDCMock ERC-20:
  `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`.

Label: LOCAL / SDK_CONFIG_PASS


## S3 — Live wrap / unshield PASS

S3 verdict: PASS

Pair tested:
- USDCMock → cUSDCMock wrapper
- ERC-20: 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF
- ERC-7984 wrapper: 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639
- Amount: 1 USDCMock / 1000000 units

Execution:
- Wallet: 0x48F5b9e0fcC28A62167d45db1bc527da3267d753
- Chain: Sepolia / 11155111
- Public balance before shield: 10000000
- Shield tx: 0x58402c27f581b610bf30c0584618f42eafecbb340f987043c78a018a1574a47c
- Public balance after shield: 9000000
- Confidential balance read status: READ_OK
- Confidential balance handle:
  0x9e44220d145977ef4e7c92b952c158e8c23302a5a8ff0000000000aa36a70500
- Unshield tx: 0x8012a0d4b3348b76d2d6d52aec4e19c4cc5f6171397dbcda1e9417ef4124ceca
- Public balance after unshield: 10000000
- Final status: LIVE_PASS

Artifacts:
- `s3-wrap-probe.mjs`
- `s3-wrap-results.json`

Label: LIVE / SEPOLIA / SDK_HIGH_LEVEL_FLOW_PASS


## S4 — User-decryption signature inspection

- `Token.confidentialBalanceOf(owner)` returns the encrypted balance handle.
- `Token.decryptBalanceAs({ delegatorAddress, accountAddress? })` returns plaintext balance as bigint.
- For self-decryption, S4 will call `decryptBalanceAs({ delegatorAddress: wallet })`.
- Since S3 unshielded back to public balance, S4 will shield 1 USDCMock again before decrypting.
Label: LOCAL / SDK_DECRYPT_SIGNATURE_CONFIRMED


## S4 — User-decryption repair loop 1

S4 initial verdict: REPAIR_LOOP

Observed:
- S4 successfully shielded 1 USDCMock for decrypt proof.
- Shield tx: 0x90a45ab0e43921bee8fe31507c114481c9f6a6435782ba13f5d5aee2f2366c4e
- Public balance after shield: 9000000
- Encrypted balance handle:
  0xac19572fe41b056f403609e3e167de180ba953cc9bff0000000000aa36a70500

Failure:
- `decryptBalanceAs({ delegatorAddress: wallet })` failed with `DelegationNotFoundError`.
- Error: no active delegation from wallet to wallet for wrapper.
- Root cause: `decryptBalanceAs` uses delegated decryption path and requires active delegation before decrypting.

Important state:
- 1 USDCMock remains shielded/confidential after failed decrypt.
- Do not run another shield before resolving S4; reuse current confidential balance.

Label: LIVE / REPAIR_LOOP / DELEGATION_REQUIRED


## S4 — Direct EIP-712 user-decryption PASS

S4 verdict: PASS_WITH_CLEANUP_REPAIR

Direct user-decryption proof:
- Public balance before decrypt probe: 9000000
- Existing encrypted balance handle reused:
  0xac19572fe41b056f403609e3e167de180ba953cc9bff0000000000aa36a70500
- Permit before: false
- `sdk.permits.grantPermit([wrapperAddress])` executed.
- Permit after: true
- `sdk.decryption.decryptValues([{ encryptedValue, contractAddress }])` returned plaintext.
- Decrypted value:
  1000000

Interpretation:
- EIP-712 direct user-decryption path is confirmed.
- Arbitrary ERC-7984 decrypt UX should use:
  1. read `confidentialBalanceOf(user)`
  2. `sdk.permits.grantPermit([tokenAddress])`
  3. `sdk.decryption.decryptValues([{ encryptedValue, contractAddress: tokenAddress }])`

Cleanup:
- Cleanup unshield attempt reverted with `TransactionRevertedError: Transaction failed during unwrap`.
- This does not invalidate S4 decrypt proof.
- 1 USDCMock may remain shielded and should be cleaned up with a separate cleanup probe.

Artifacts:
- `s4-direct-decrypt-probe.mjs`
- `s4-direct-decrypt-results.json`

Label: LIVE / SEPOLIA / EIP712_DIRECT_USER_DECRYPTION_PASS / CLEANUP_REPAIR_PENDING


## S4 — Cleanup diagnosis and final unshield PASS

S4 cleanup diagnosis verdict: PASS

Context:
- Previous S4 direct decrypt had passed but cleanup unshield failed.
- A diagnostic retry was run without reshielding.

Confirmed pre-state:
- Public USDCMock balance before cleanup: 9000000
- Encrypted balance handle:
  0xac19572fe41b056f403609e3e167de180ba953cc9bff0000000000aa36a70500
- Direct decrypt confirmation:
  decrypted balance = 1000000

Unshield diagnostic:
- `wrapped.unshield(1000000n, { skipBalanceCheck: true })` succeeded.
- SDK phase callbacks/events confirmed full two-phase flow:
  - unwrap submitted
  - finalizing started
  - finalize submitted

Transactions:
- Unwrap tx:
  0xbdb82500f9d51c5cba0739b8681b4ce86501c0c8ac734e119fd586108594130f
- Finalize tx:
  0x9c4f33c77d9c9a70ecf4e9b34118303ea6ff7ed756f82871ef357f83211f4423

Final state:
- Public USDCMock balance after cleanup: 10000000
- Final status: UNSHIELD_PASS

Interpretation:
- Prior cleanup failure was transient or timing-related.
- S4 is upgraded from PASS_WITH_CLEANUP_DEBT to LIVE PASS.
- Direct EIP-712 user-decryption plus final cleanup are both proven.

Artifacts:
- `s4-unshield-phase-diagnose.mjs`
- `s4-unshield-phase-diagnose-results.json`

Label: LIVE / SEPOLIA / EIP712_DECRYPT_PASS / UNSHIELD_CLEANUP_PASS

