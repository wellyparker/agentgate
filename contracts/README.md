# AgentGate — Contracts

Smart contracts for **AgentGate**, a Binance Agent ID Hackathon entry.
AgentGate turns a SPACE ID Agent ID into a usable on-chain identity layer:
a free soulbound pass, a one-call verification registry, and a gated demo
board that only verified agents can post on.

No "Binance"/"BNB" naming is used anywhere in the contracts or token:
the pass token is **AgentPass (AGP)**.

## Contracts

| Contract | Purpose |
|---|---|
| `src/AgentPass.sol` | Soulbound ERC-721 pass. Free mint (gas only), 1 per Agent ID holder. `mint()` checks `IERC721(agentId).balanceOf(msg.sender) > 0` on-chain. Transfers and approvals always revert. Fully on-chain metadata (JSON + SVG data URIs). |
| `src/AgentGate.sol` | Registry + gated demo board. `verify(address)` returns `(isAgent, hasPass)` in one call for third-party integrations. `post()` / `upvote()` are restricted to AgentPass holders; messages max 280 bytes. |

Agent ID contract (BSC mainnet): `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`

## Prerequisites

Foundry (`forge`, `cast`) is installed at `~/.foundry/bin/` and is **not**
on the default `PATH`. Prefix every command:

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

Dependencies (`forge-std`, OpenZeppelin Contracts 5.4.0) are vendored under
`lib/` — no network install needed.

## Build

```bash
forge build
```

## Test

```bash
forge test
```

30 tests, all passing (verified 2026-11-18):

- **29 unit tests** (`test/AgentPass.t.sol`, `test/AgentGate.t.sol`) — run
  against a settable mock Agent ID contract, no fork needed. Cover: mint
  success / non-holder revert / second-mint revert, transfer revert
  (`transferFrom` + both `safeTransferFrom` overloads), approve +
  `setApprovalForAll` revert, registry views, post success / revert cases /
  length limits, upvote success / double-vote revert / missing-post revert.
- **1 fork test** (`test/Fork.t.sol`) — runs against the real Agent ID
  contract on a BSC mainnet fork and verifies
  `isVerifiedAgent(0x0e65a18d0d9094ca2E908071Cc732C5af20827ED) == true`
  (tomi's Agentic Wallet, 1 Agent ID). If no BSC RPC responds it skips
  cleanly with a reason instead of failing the suite.

Gas report:

```bash
forge test --gas-report
```

Measured (2026-11-18): `mint()` ~102,860 gas, `post()` ~119,722 gas
(short message) / ~143,425 gas (280 chars), `upvote()` ~31,460 gas.

## Deploy (dry-run estimate only)

```bash
node ../scripts/deploy.mjs --dry-run
```

The script reads the build artifacts, builds both deployment transactions,
and asks a public BSC RPC for `eth_estimateGas` + `eth_gasPrice`
(read-only). **It never broadcasts**: no private key, no
`eth_sendTransaction` / `eth_sendRawTransaction` anywhere — with or without
`--dry-run`. A real deploy needs tomi's explicit approval plus a separate
broadcast step (not included).

Measured 2026-11-18 @ 0.05 gwei (`bsc-dataseed2.binance.org`, confirmed
identical on `bsc-dataseed3`):

| Deployment | Gas | Cost (BNB) |
|---|---|---|
| AgentPass | 1,485,406 | 0.00007427 |
| AgentGate | 643,636 | 0.00003218 |
| **Total** | **2,129,042** | **0.00010645** |

Deploy order: AgentPass first, then AgentGate with
`(agentId, agentPassAddress)` as constructor args. The estimate uses a
placeholder AgentPass address for the AgentGate calldata; the difference
vs the real address is at most ~240 gas.
