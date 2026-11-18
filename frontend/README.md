# AgentGate — Frontend

Static single-page frontend for **AgentGate**, a sybil-resistant access
primitive for Agent ID holders: a free soulbound **AgentPass** (one per
Agent ID) plus an on-chain **board** only pass-holders can use.

**Stack: vanilla HTML + CSS + JavaScript. Zero runtime dependencies, zero
CDN.** The app talks to the chain with `window.ethereum` and plain
`fetch` JSON-RPC calls, using a tiny built-in ABI encoder/decoder
(~60 lines in `app.js`). There is no build step — the files in this
directory are the deployed site, ready for GitHub Pages as-is.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: header, status panel, mint card, board, footer |
| `styles.css` | All styling (dark theme, mobile-friendly, no external assets) |
| `config.js` | Contract addresses, chain config, minimal ABIs, function selectors |
| `app.js` | Wallet connect, chain switch, status reads, mint/post/upvote, board |

## Run locally

Any static server works. From this directory:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or:

```bash
npx serve .
```

No build, no install, no environment variables.

## After deploy — set the contract addresses

Edit **only `config.js`**:

```js
AGENT_PASS_ADDRESS: "0x...",  // deployed AgentPass contract
AGENT_GATE_ADDRESS: "0x...",  // deployed AgentGate contract
```

Both are currently `0x0000000000000000000000000000000000000000` (TBD).
Until they are set, the UI shows a "Contracts deploying soon" banner,
keeps the Agent ID check working, and disables minting and the board
instead of crashing. No other file needs to change.

The Agent ID contract address (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`,
SPACE ID Agent ID on BSC mainnet) is already verified on-chain and must
not change.

## How it works

- **Reads** (`eth_call`): prefer the connected wallet's provider; fall
  back to public BSC RPC endpoints listed in `config.js`. Reads never
  need a wallet — the board loads for anonymous visitors too.
- **Writes** (`eth_sendTransaction`): mint, post, upvote. Every write
  triggers a confirmation prompt in the user's own wallet; the app never
  auto-submits anything and never asks for a seed phrase or private key.
- **Chain**: BSC mainnet (chainId 56). If the wallet is on another chain,
  the UI shows a "Switch to BSC" button (`wallet_switchEthereumChain`,
  with `wallet_addEthereumChain` fallback).
- **ABI encoding**: `app.js` contains a minimal encoder (address, uint256,
  string) and decoder (uint256, bool, address, string, `getPost` tuple).
  Selectors in `config.js` were computed with ethers and match the
  canonical contract interfaces.

## Branding / compliance notes

- The project name and copy never use "Binance" or "BNB" as project
  branding. "BSC mainnet" appears only as the technical chain name, and
  gas is described as "network gas (paid in the chain's native token)".
- One exception: the `wallet_addEthereumChain` call in `app.js` passes
  the chain's native currency metadata (`BNB`) — this is a required
  wallet-API field for chain 56, not project branding, and it is only
  sent to the user's own wallet.
- No return / income claims anywhere in the copy.

## Testing

- `node --check config.js app.js` — syntax check.
- Encoder/decoder unit tests run in Node against ethers as the reference
  implementation (see the test script used during development; the
  functions are exposed via `module.exports` when loaded under Node).
- Render test: serve locally and open in Chromium — the page must render
  the banner, status area and empty board with no wallet connected and
  no console errors.
- Live mint/post/upvote can only be tested after the contracts deploy.
