# AgentGate

**Sybil-resistant access control for Agent ID holders — one verified identity, one pass, one voice.**

AgentGate is a free, open-source primitive that lets any project on BSC gate a mint, an allowlist, an airdrop, or a community board to real Agent ID holders — without building identity verification themselves. One Agent ID equals one verified human (each user can claim only one Agent ID, and it is non-transferable), so gating on Agent ID is gating on verified personhood.

Built for the **Binance Agent ID Hackathon** (18 Nov – 9 Dec 2026). No token sale, no fees, no returns promised — free to use, you only pay network gas.

---

## The Problem

Airdrops, free mints, and allowlists on BSC are routinely drained by sybil farms: one operator spins up hundreds of wallets and takes hundreds of slots meant for real users. Existing fixes are either centralized (off-chain allowlists, KYC forms, Discord roles) or easy to game (holding a token anyone can buy).

Agent ID changes the equation: it is an on-chain, non-transferable identity bound to a verified Binance Wallet user, one per person. But most projects have no simple, reusable way to check it on-chain. AgentGate is that missing piece — a two-contract primitive any project can plug into with a single call.

## How It Works

```
┌─────────────────────┐      balanceOf(user) > 0      ┌──────────────────────────┐
│  Agent ID contract  │ ◄──────────────────────────── │  AgentPass (ERC-721)     │
│  (SPACE ID, ERC-721 │   on-chain verification       │  Soulbound · FREE mint   │
│  non-transferable)  │                               │  1 per Agent ID holder   │
└─────────────────────┘                               └────────────┬─────────────┘
                                                                   │ hasPass(user)
                                                                   ▼
┌─────────────────────┐      isVerifiedAgent(user)    ┌──────────────────────────┐
│  Any third-party    │ ◄──────────────────────────── │  AgentGate (registry)    │
│  project / dApp     │   one-call gate               │  verify() · post() ·     │
│  (mint, allowlist,  │                               │  upvote() · getPost()    │
│   airdrop, board)   │                               └──────────────────────────┘
└─────────────────────┘
```

1. **Mint a pass (free).** An Agent ID holder calls `AgentPass.mint()`. The contract checks `balanceOf(caller) > 0` on the Agent ID contract (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`) and mints exactly one soulbound AgentPass (non-transferable) to them. No payment, no approval, no signature beyond the mint transaction itself.
2. **Gate anything.** `AgentGate.isVerifiedAgent(address)` answers in one call whether an address holds an Agent ID; `hasPass(address)` checks the AgentPass; `verify(address)` returns both statuses at once. Any project can use AgentGate as its access-control oracle.
3. **Prove it live.** AgentGate ships a demo board (`post`, `upvote`, `getPost`, `postCount`) that only pass-holders can use — a working, sybil-resistant community space, not a slide deck.

## Features

- **One person, one pass** — enforced on-chain by the Agent ID contract itself; no off-chain list, no admin discretion.
- **Soulbound** — AgentPass is non-transferable, so passes cannot be bought, sold, or farmed and resold.
- **Free** — mint costs 0. No mint fee, no protocol fee, no token. Users pay only BSC network gas.
- **One-call integration** — third-party projects gate with a single read call (`isVerifiedAgent`, `hasPass`, or `verify`); no fork, no dependency, no SDK.
- **Live demo board** — pass-gated posting and upvoting, proving the primitive end to end.
- **Zero admin power** — neither contract has an owner or any admin function; the Agent ID and AgentPass references are immutable. See [Owner Permissions](#owner-permissions).

## Contracts (BSC mainnet, chain ID 56)

| Contract | Address | Status |
| --- | --- | --- |
| Agent ID (SPACE ID, external) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | Live (reference) |
| AgentPass (ERC-721 soulbound) | **To be deployed** | ⏳ Pending deployment |
| AgentGate (registry + board) | **To be deployed** | ⏳ Pending deployment |

> Source code will be verified on BscScan immediately after deployment. See [`docs/verification.md`](docs/verification.md).

## Repository Structure

```
agentgate/
├── README.md               # This file
├── SUBMIT.md               # Hackathon submission pack (descriptions, checklist)
├── PROMOTION.md            # X threads, Telegram posts, 30-address outreach plan
├── docs/
│   └── verification.md     # BscScan / Sourcify verification walkthrough
├── contracts/              # Foundry project (solc 0.8.24, optimizer on, 200 runs)
│   ├── foundry.toml
│   ├── src/
│   │   ├── AgentPass.sol   # Soulbound ERC-721, free 1-per-Agent-ID mint
│   │   └── AgentGate.sol   # Registry (verify) + pass-gated demo board
│   └── test/
│       ├── AgentPass.t.sol
│       └── MockAgentId.sol
└── frontend/               # Static frontend (GitHub Pages)
    ├── index.html
    ├── app.js
    ├── config.js           # Contract addresses (TBD until deploy)
    └── styles.css
```

## For End Users

1. Claim a free Agent ID in the Binance App (Wallet → homepage banner → Agent ID). One per user, non-transferable.
2. Open the AgentGate frontend: **https://wellyparker.github.io/agentgate/** *(expected GitHub Pages URL — confirm once Pages is enabled)*.
3. Connect your wallet and click **Mint Pass** — free, you only pay network gas. One pass per Agent ID.
4. Use your pass on the demo board: post and upvote. Only pass-holders can participate.

You never share a seed phrase, private key, API secret, or pairing code with AgentGate. The frontend never asks for them. Every transaction is one you review and confirm yourself in your own wallet.

## For Developers

### One-line integration

Gate any function to verified Agent ID holders with a single call to the AgentGate registry:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentGate {
    function isVerifiedAgent(address user) external view returns (bool);
}

contract MyMint {
    IAgentGate public constant GATE = IAgentGate(0x0000000000000000000000000000000000000000); // TODO: AgentGate address after deploy

    function mint() external {
        require(GATE.isVerifiedAgent(msg.sender), "AgentGate: Agent ID required");
        // ... your mint logic — now sybil-resistant
    }
}
```

Prefer gating on the pass instead of the raw Agent ID? Use `hasPass(msg.sender)`. Need both
statuses at once? `verify(address)` returns `(isAgent, hasPass)` in a single view call.

### Interface reference

**AgentPass** — ERC-721 soulbound (transfers blocked), symbol `AGP`.

| Function | Description |
| --- | --- |
| `mint()` | Free mint, 1 per Agent ID holder. Reverts if caller holds no Agent ID or already minted. |
| `tokenOf(address)` | Returns the pass token ID owned by an address (reverts if none). |
| `hasPass(address)` | `true` if the address holds an AgentPass. |
| `totalMinted()` | Total passes minted so far. |

**AgentGate** — registry + demo board.

| Function | Description |
| --- | --- |
| `isVerifiedAgent(address)` | View: `true` if the address holds an Agent ID. The one-call gate. |
| `hasPass(address)` | View: `true` if the address holds an AgentPass. |
| `verify(address)` | View: returns `(isAgent, hasPass)` — both statuses in one call. |
| `post(string)` | Pass-holders only: publish a board post (max 280 bytes). Returns the post ID. |
| `upvote(uint256)` | Pass-holders only: upvote a post (one vote per pass per post). |
| `getPost(uint256)` | View: returns a post's `(author, message, timestamp)`. |
| `upvotes(uint256)` | View: upvote count of a post. |
| `postCount()` | View: total posts on the board. |

### Build & test

```bash
cd contracts
forge build
forge test
```

## Security & Compliance

AgentGate is built to comply with every safety red line of the Binance Agent ID Hackathon. Each rule, and how we meet it:

| Hackathon red line | How AgentGate complies |
| --- | --- |
| No web-based QR login for Agentic Wallet | No login at all. The frontend is a static page; users connect their own wallet. No QR codes, no pairing codes, no sessions stored anywhere. |
| No bypassing user transaction confirmation | Every action is a normal on-chain transaction the user reviews and confirms in their own wallet. No prompts, skills, or automation that skip confirmation. |
| No unauthorized asset transfers | The contracts move no user assets. No scheduled collection, no automatic transfers, no bundled extra transfers, no approvals requested (mint is free; no token approval is ever needed). |
| Contracts open-source, owner permissions disclosed | Full source in this repo (MIT), verified on BscScan after deploy. Owner permissions are listed below — there are none: no owner, no admin functions, immutable references. |
| No impersonation of the Binance brand | Project name **AgentGate**, token **AgentPass / AGP**, domain `wellyparker.github.io` — none use "Binance" or "BNB". "Binance Agent ID Hackathon" is named only as the contest this project enters, and "BNB Chain"/"BSC" only as the chain name. |
| No collection of sensitive credentials | We never ask for seed phrases, private keys, API secrets, or pairing codes — in the product, the docs, or the promotion. |
| No promised returns | AgentGate promises no returns, income, or rewards of any kind. AgentPass has no monetary value and is non-transferable. |
| Trading products must show risk warnings | AgentGate is not a trading product; it has no trading, swaps, or price exposure. |
| Agent ID must not be a wallet-lookup tool | AgentGate checks only whether *the caller's own address* holds an Agent ID, to gate *their own* access. It provides no name-to-wallet lookup for other people. |
| No volume / mass-account manipulation | Growth is organic only: real Agent ID holders trying a free product. No fake accounts, no paid interactions, no wash activity. See [`PROMOTION.md`](PROMOTION.md). |

### Owner Permissions

Disclosed in full, as required — the short version is that **there are none**:

- **Neither contract has an owner.** There is no `Ownable`, no admin role, and no admin-only function in either contract. After deployment, nobody — not even the deployer — can change any setting.
- **AgentPass:** the Agent ID contract address is `immutable`, set once in the constructor. Minting is permissionless but gated by Agent ID + 1-per-address; nobody can mint passes to arbitrary addresses, transfer or burn user passes, pause minting, or change metadata (token URIs are generated fully on-chain). The contract holds no funds and accepts no payments.
- **AgentGate:** the Agent ID and AgentPass addresses are `immutable`. Verification reads the pass contract on-chain, so results cannot be forged. Nobody can remove or edit board posts. The contract holds no funds.
- Neither contract requests token approvals or has any withdrawal function.

## Costs

- Minting an AgentPass: **free** (0 payment). Users pay only BSC network gas for their own transactions.
- Using AgentGate as a gate: **free** — read calls cost nothing; integrators pay only their own gas.
- No fees, no premium tier, no token sale — now or planned.

## License

MIT. See `LICENSE` (to be added at repo creation).

## Disclaimer

AgentGate is an independent hackathon project and is not affiliated with, endorsed by, or sponsored by Binance or BNB Chain. AgentPass is a non-transferable access pass with no monetary value; holding one promises no returns, income, rewards, or future airdrop. Use at your own risk; verify contract addresses on BscScan before interacting.
