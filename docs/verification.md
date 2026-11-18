# docs/verification.md — Verifying AgentGate Source Code on BscScan

Goal: both AgentGate contracts show **verified source code** on BscScan, as the Binance Agent ID Hackathon requires ("deployed smart contracts on BNB Chain with source code verified and open-sourced on BscScan").

Status: **not yet executed** — contracts are not deployed yet. Run this walkthrough immediately after deployment.

---

## Context: which API to use

- **BscScan's legacy v1 API is deprecated.** Do not use old `api.bscscan.com/api` v1 guides without checking they still work.
- **Etherscan's unified v2 API (`api.etherscan.io/v2/api`) does NOT cover BSC on the free plan** — BSC (chain 56) is paid-only there. Do not rely on the Etherscan key for BSC verification.
- **Primary path below uses a free BscScan API key** obtained directly from bscscan.com. BscScan still issues free API keys to registered accounts.
- Where a step below is marked **"confirm at execution time"**, it means the exact endpoint/flag has not been re-verified against BscScan's current docs — check https://docs.bscscan.com/ before running it. Do not improvise a different verifier.

---

## Path A (primary): BscScan API key + Foundry

### A1. Get a free BscScan API key (tomi's hands — ~5 minutes)

1. Go to https://bscscan.com/ and create a free account (or log in).
2. Open **My Account → API Keys** (or "API-KEYs" in the left menu).
3. Click **Add** to create a new API key. Name it e.g. `agentgate`.
4. Copy the key. **Do not paste it into chat, X, Telegram, or the repo.** Hand it to the agent via the secure channel, or keep it in a local `.env` file that is never committed.
5. The free key is enough for verification (a few calls); rate limits do not matter here.

### A2. Verify with Foundry

Prerequisites: the contracts are deployed, and you have the deployed addresses + the exact compiler settings used at deploy (Foundry records these in `broadcast/` and `out/` — verify from the same checkout that deployed, so settings match automatically). The project compiles with **solc 0.8.24, optimizer enabled, 200 runs** (see `contracts/foundry.toml`).

Constructor signatures (from the actual source — do not guess):
- `AgentPass`: `constructor(address agentId_)` — pass the Agent ID contract `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`.
- `AgentGate`: `constructor(address agentId_, address agentPass_)` — pass the Agent ID contract, then the deployed AgentPass address.

```bash
# From the contracts/ directory, with the deploy already done.
cd contracts
export BSCSCAN_API_KEY='<paste-key-here>'   # never commit this

# AgentPass — constructor takes the Agent ID contract address
forge verify-contract \
  --chain-id 56 \
  --etherscan-api-key "$BSCSCAN_API_KEY" \
  <AGENTPASS_ADDRESS> \
  src/AgentPass.sol:AgentPass \
  --constructor-args $(cast abi-encode "constructor(address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f)

# AgentGate — constructor takes (Agent ID address, AgentPass address)
forge verify-contract \
  --chain-id 56 \
  --etherscan-api-key "$BSCSCAN_API_KEY" \
  <AGENTGATE_ADDRESS> \
  src/AgentGate.sol:AgentGate \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f <AGENTPASS_ADDRESS>)
```

Notes:

- `--chain-id 56` tells Foundry to use the BscScan verifier. **Confirm at execution time** whether your Foundry version also needs `--verifier-url https://api.bscscan.com/api` (older versions) or resolves it from the chain ID automatically (newer versions). If verification fails with an endpoint error, add the explicit `--verifier-url` flag and retry.
- If the constructor signature differs from the ones above, rebuild the `--constructor-args` from the actual signature in `src/*.sol`. Getting the args wrong is the most common verification failure — double-check against the deploy script.
- If the deploy used optimizer settings or a specific solc version, Foundry reads them from `foundry.toml` automatically. Verify from the same repo state that deployed.
- A successful run prints `Contract successfully verified` (or similar). Save the output.

### A3. Fallback inside Path A: verify through the BscScan web form

If the CLI fails twice, verify manually (no API key needed for this route):

1. Open the contract page on https://bscscan.com/ → **Contract → Verify and Publish**.
2. Choose compiler type "Solidity (Single file)" or "Solidity (Standard JSON input)" — Standard JSON is more reliable for multi-file Foundry projects; export it with `forge build --extra-output` / the build info JSON from `out/build-info/`. **Confirm at execution time** which input BscScan's current form accepts cleanly.
3. Paste the source, set the exact compiler version + optimizer settings from `foundry.toml`, paste constructor args (ABI-encoded hex from the deploy transaction's input data, after the bytecode).
4. Submit and wait for the "successfully verified" confirmation.

---

## Path B (backup): Sourcify

Sourcify verification is independent of BscScan's API key and BscScan displays a Sourcify badge on contracts verified there. Use it as a backup (or in addition — both badges is strictly better).

```bash
cd contracts

# AgentPass — constructor takes the Agent ID contract address
forge verify-contract \
  --chain-id 56 \
  --verifier sourcify \
  <AGENTPASS_ADDRESS> \
  src/AgentPass.sol:AgentPass \
  --constructor-args $(cast abi-encode "constructor(address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f)

# AgentGate — constructor takes (Agent ID address, AgentPass address)
forge verify-contract \
  --chain-id 56 \
  --verifier sourcify \
  <AGENTGATE_ADDRESS> \
  src/AgentGate.sol:AgentGate \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f <AGENTPASS_ADDRESS>)
```

Notes:

- Sourcify needs no API key.
- Sourcify requires an **exact match** (bytecode + metadata hash). Verifying from the same checkout/settings as the deploy is what makes this pass.
- After Sourcify verification, check the BscScan contract page — it should show the Sourcify verification badge. **Confirm at execution time** that BscScan still surfaces Sourcify-verified contracts this way; if it does not, Path A remains the required route for the hackathon's "verified on BscScan" rule.

---

## Post-verification checklist

For **each** contract (AgentPass, AgentGate):

- [ ] BscScan contract page shows a green **"Contract Source Code Verified"** checkmark / "Verified" badge.
- [ ] The **Contract** tab displays the full source code (not just bytecode).
- [ ] The **Read Contract** tab shows the expected functions (`mint`, `hasPass`, `tokenOf`, `totalMinted` for AgentPass; `isVerifiedAgent`, `hasPass`, `verify`, `post`, `upvote`, `getPost`, `upvotes`, `postCount` for AgentGate).
- [ ] The **Write Contract** tab is usable (connect wallet → functions listed).
- [ ] Compiler version + optimizer settings shown on BscScan match `foundry.toml`.
- [ ] The deployed bytecode's constructor args match the deploy (spot-check: `tokenOf` / `postCount` read calls return sane values).
- [ ] The contract addresses are recorded in `README.md` and `SUBMIT.md` (replace the "To be deployed" slots) and the frontend config.
- [ ] The Sourcify check (Path B) is done as well, or explicitly skipped with a reason noted here.

## Troubleshooting (common failures)

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Contract source code already verified" | Already done — check the page. | Nothing to do; confirm the displayed source is yours. |
| Bytecode mismatch / "does not match" | Wrong compiler version, optimizer settings, or constructor args. | Re-verify from the exact deploy checkout; re-derive constructor args from the deploy tx input. |
| API key / 401 / rate-limit error | Wrong key, or key not yet active. | Re-copy the key from bscscan.com; wait a few minutes after creating it; retry. |
| "Smart contract not found" / wrong chain | Address is not on BSC mainnet, or chain-id flag wrong. | Confirm the address + chain ID 56. |
| Sourcify "perfect match" fails but "partial" passes | Metadata hash differs (e.g. different file paths). | Partial match is still useful, but re-verify from the exact deploy environment for a perfect match. |
