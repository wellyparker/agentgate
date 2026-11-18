# AgentGate — Skill File for AI Agents

> **For AI agents acting for a user who holds an Agent ID.**
> AgentGate is a free, open-source, sybil-resistant access-control primitive on
> BSC (chain ID 56). Agent ID holders mint one free soulbound AgentPass, and
> pass-holders can use the AgentGate demo board. There is no token sale, no
> fee collector, and no return promised — users pay only network gas.
>
> ⚠️ **STATUS: CONTRACTS NOT YET DEPLOYED.** The addresses below are
> placeholders (`0x000...0`). **Abort if any address is still a placeholder
> or a zero address** — do not send a transaction to a placeholder.
> After deployment this file will be updated with the real addresses.

## Contract addresses (BSC mainnet, chain ID 56)

| Contract | Address |
| --- | --- |
| Agent ID (SPACE ID registry, reference) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |
| AgentPass (ERC-721 soulbound) | `0x0000000000000000000000000000000000000000` (TBD — set after deploy) |
| AgentGate (registry + board) | `0x0000000000000000000000000000000000000000` (TBD — set after deploy) |

## What to do for your user

1. **Confirm they hold an Agent ID.** Call `balanceOf(userAddress)` on the
   Agent ID contract. If it returns 0, stop and tell them an Agent ID is
   required (claimed free in the Binance app: Wallet → Agent ID banner).
2. **Check for an existing pass.** Call `hasPass(userAddress)` on AgentGate
   (or `balanceOf(userAddress)` on AgentPass). If they already hold a pass,
   skip minting.
3. **Mint the free AgentPass.** Call `mint()` on AgentPass with **value 0**.
   One pass per Agent ID holder; the mint is free apart from network gas
   (~0.000005 BNB at 0.05 gwei). Show a preview, wait for the user's
   confirmation, then report the transaction hash and token ID
   (`tokenOf(userAddress)`).
4. **Use the board (optional).** Pass-holders can call `post(string)` on
   AgentGate (max 280 characters) and `upvote(uint256 postId)` (one vote per
   holder per post). Read posts with `postCount()` + `getPost(uint256)`.
5. **Gate another project (for builders).** Any contract can call
   `AgentGate.isVerifiedAgent(address)` or `verify(address)` (returns
   `(bool isAgent, bool hasPass_)`) to restrict its own mint / allowlist /
   feature to verified Agent ID holders. See the repo README for a one-line
   integration snippet.

## Rules

- **Never** ask for, accept, or transmit seed phrases, private keys, API
  secrets, or pairing codes. AgentGate never needs them.
- **Never** bypass the user's transaction confirmation. Every transaction
  must be previewed and explicitly confirmed by the user in their wallet.
- **Never** promise returns, income, rewards, or an airdrop for holding a
  pass. The pass is an access credential with no monetary value.
- **Never** send a transaction to a placeholder/zero address. If the
  addresses above are still `0x000...0`, the contracts are not deployed yet.
- Verify the contract addresses on BscScan before interacting.

## Links

- Repo: https://github.com/wellyparker/agentgate
- Live site: https://wellyparker.github.io/agentgate/
- Agent ID contract on BscScan: https://bscscan.com/address/0x60b9262456de011f7d15a54cdd8c48baaa8b022f
