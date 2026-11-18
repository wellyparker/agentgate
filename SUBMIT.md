# SUBMIT.md — AgentGate · Binance Agent ID Hackathon

Submission pack for the **Binance Agent ID Hackathon** (Submission Period: 18 Nov 2026 08:00 UTC – 9 Dec 2026 08:00 UTC). All fields below are paste-ready once the contract addresses and the project submission form are confirmed.

> ⚠️ **FORM STATUS (18 Nov 2026, ~18:35 WIB): PROJECT SUBMISSION FORM NOT YET FOUND.**
> The official announcement does not link a project submission form. See the
> [Form Hunt](#-project-submission-form-hunt) section for exactly what was searched,
> what *was* found (the Promotion Award survey — a different form), hypotheses,
> and the follow-up plan. **Do not submit through the Promotion survey** — it is
> for X-post links only.

---

## Project

- **Project name:** AgentGate
- **Tagline:** Sybil-resistant access control for Agent ID holders — one verified identity, one pass, one voice.
- **Category:** **Agent Application Innovation Award** (primary). The Agent ID Ecosystem Pioneer Award (Growth) is a bonus if on-chain metrics qualify — one project can receive at most one award.
- **Team:** Solo builder (tomi / wellyparker). One project per team — AgentGate is the only submission.
- **Repository:** https://github.com/wellyparker/agentgate (public; to be created by coordinator)
- **Website / live product:** https://wellyparker.github.io/agentgate/ *(expected GitHub Pages URL — confirm once Pages is enabled)*
- **Reward receiving address:** *(to be filled at submission time — Agentic Wallet address; confirm with tomi before submitting)*

## Contracts (BSC mainnet, chain ID 56)

| Contract | Address | BscScan |
| --- | --- | --- |
| AgentPass (ERC-721 soulbound) | **To be deployed** | — |
| AgentGate (registry + board) | **To be deployed** | — |
| Agent ID (SPACE ID, reference) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | [BscScan](https://bscscan.com/address/0x60b9262456de011f7d15a54cdd8c48baaa8b022f) |

## Deploy cost (verified dry-run, 18 Nov 2026 ~18:40 WIB)

Measured with `scripts/deploy.mjs --dry-run` (read-only `eth_estimateGas` +
live `eth_gasPrice`, no broadcast). Gas price at measurement: **0.05 gwei**.

| Deploy | Gas | Cost @ 0.05 gwei |
| --- | --- | --- |
| AgentPass | 1,485,406 | 0.00007427 BNB |
| AgentGate | 643,636 | 0.00003218 BNB |
| **TOTAL** | **2,129,042** | **0.00010645 BNB** |

Interaction gas (for users, at the same price): `mint()` ≈ 0.00000514 BNB ·
`post()` ≈ 0.00000598–0.00000717 BNB · `upvote()` ≈ 0.00000157 BNB.
Gas price on BSC moves — re-run the dry-run script right before deploying.
**Deploy itself needs tomi's explicit tap; nothing is broadcast by this repo.**

## Short Description (paste-ready)

> AgentGate is a free, open-source, sybil-resistant access-control primitive for Agent ID holders on BSC. Agent ID holders mint one free soulbound AgentPass (verified on-chain via the Agent ID contract), and any project can gate a mint, allowlist, airdrop, or community feature to verified holders with a single call to the AgentGate registry. A pass-gated demo board proves the primitive live. No fees, no token sale, no returns promised — users pay only network gas.

## Long Description (paste-ready)

> Airdrops, free mints, and allowlists are routinely drained by sybil farms: one operator, hundreds of wallets, hundreds of slots meant for real users. Agent ID fixes the identity side — one non-transferable ID per verified person — but projects have no simple reusable way to check it on-chain.
>
> AgentGate is that missing piece. It has two contracts. AgentPass is a soulbound ERC-721 that any Agent ID holder can mint for free, exactly one per holder; eligibility is verified on-chain by calling `balanceOf` on the Agent ID contract, so no off-chain list or admin decision is involved. AgentGate is a registry any third-party project can query with one call — `isVerifiedAgent(address)` — to gate its own mint, allowlist, or feature to verified holders. AgentGate also ships a live demo board (`post`, `upvote`, `getPost`) that only pass-holders can use, proving the primitive end to end.
>
> AgentGate is free to use with no fees and no token sale. It collects no credentials, moves no user assets, requests no approvals, and promises no returns. Source code is open (MIT) and verified on BscScan.

## Agent ID Usage Description (paste-ready, 2–3 paragraphs)

> Agent ID is the core of AgentGate's product, not an add-on. First, **gating the mint**: `AgentPass.mint()` verifies eligibility entirely on-chain by calling `balanceOf(msg.sender)` on the SPACE ID Agent ID contract (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`); only addresses holding an Agent ID can mint, and only one pass per holder. Because each user can claim exactly one non-transferable Agent ID, one pass provably equals one verified person — this is what makes the pass sybil-resistant by construction.
>
> Second, **the registry**: `AgentGate.isVerifiedAgent(address)` / `verify(address)` expose that verification as a reusable one-call primitive, so any other project on BSC can gate its own mint, allowlist, airdrop, or feature to Agent ID holders without building identity checks itself. Third, **the demo board**: `post()` and `upvote()` are restricted to pass-holders, giving Agent ID holders a live sybil-resistant community space and giving judges a working product to try with their own Agent ID.
>
> AgentGate never uses Agent ID as a lookup tool for other people's wallets: it checks only whether the caller's own address holds an Agent ID, solely to gate that caller's own access.

## 🔍 Project Submission Form Hunt

**Result as of 18 Nov 2026 ~18:40 WIB: FORM NOT FOUND.** (Re-confirmed by coordinator at 18:40: a further search for the Agentic Wallet ecosystem page / dev docs surfaced only the same announcement, Square mirror, and news post — still no project form link.)

### What was searched (all on 18 Nov 2026)

| # | Place searched | Method | Result |
| --- | --- | --- | --- |
| 1 | Official announcement, full text | `browser.open` on https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf | Step 3 says "Submit your project name, website, contract address(es), Agent ID usage description, and other required materials during the Submission Period. No registration needed." — **no link attached to that step**. The only linked survey in the announcement is the Promotion Award survey (see below). |
| 2 | Binance Square mirror of the announcement | `browser.open` on https://www.binance.com/en/square/post/389517345917641 | Same text, no project form link. |
| 3 | Binance Square news version | Search result opened via search | Same content, no form link. |
| 4 | Web search: "Binance Agent ID Hackathon submission form submit project" | `browser.search` | Only the announcement + unrelated older hackathons. |
| 5 | Web search: "\"Agent ID Hackathon\" Binance $60,000 submit project form" | `browser.search` | Same — no form. |
| 6 | Web search: "\"Agent ID Hackathon\" bnbchain.org blog" | `browser.search` | No BNB Chain blog post about this hackathon exists yet (only older hackathons: Build the Era, BNB Hack Tokenized Stocks, AI Trading Agents). |
| 7 | Web search: "BinanceWallet \"Agent ID Hackathon\" X post November 2026" | `browser.search` | No @BinanceWallet X announcement post surfaced (only the 100k-claims post of 25 Oct and 200k-claims news of 16 Nov). |
| 8 | Web search: "\"#BinanceWalletHackathon\" Agent ID Hackathon" | `browser.search` | Only the announcement; no X post with a form link indexed yet. |
| 9 | Web search: "\"Agent ID Hackathon\" survey submit project name website contract address" | `browser.search` | Only the announcement; no form. |
| 10 | Web search: "Binance Agentic Wallet ecosystem page Agent ID hackathon submit project" (coordinator, ~18:40 WIB) | `browser.search` | Same announcement + Square mirror + news post. The announcement links Agentic Wallet dev docs (https://web3.binance.com/en/dev-docs/products/agentic-wallet/introduction) but no project form. The "Agentic Wallet ecosystem page" is named only as where *winning* projects will be featured — watch it and the dev-docs pages for a submission link. |

### What WAS found — Promotion Award survey (NOT the project form)

- **URL (verified by opening it):** https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c
- **What it is:** the official "campaign survey" linked from the announcement's *Agent Ecosystem Promotion Award* section. Its text confirms it is for submitting **X post links** for the Promotion Award (20 winners share 2,000 USDC). It requires a Binance login ("Please log into your Binance account to begin the survey").
- **Do NOT use it for the project submission** — it is a different form for a different award.

### Hypotheses (most likely first)

1. **The project form will be published in a follow-up @BinanceWallet / @Binance X post.** Precedent: the September 2026 Agent OS Mini Hackathon published its `app.binance.com/uni-qr/user-survey/...` link in the X announcement post, not in a support article. The hackathon announcement is less than a day old; the X post may simply not be indexed yet.
2. **The announcement page will be updated with the form link** (the "For More Information:" section at the end of the Square version is currently empty — a placeholder for a link to come).
3. **The form may live inside the Binance App** (in-app survey/banner) rather than on the public web.
4. **Submission may open via a BNB Chain blog post / hackathon page** (as with BNB Hack editions, which used Google Forms) — none exists yet as of this writing.
5. **The form may appear on the Agentic Wallet ecosystem page or dev-docs pages** (https://web3.binance.com/en/dev-docs/products/agentic-wallet/introduction) — the announcement names the ecosystem page as the home of Agent ID projects; worth checking alongside the announcement on each daily re-check.

### Follow-up plan

- **Re-check daily from 19 Nov:** the announcement page (for an added link), @BinanceWallet and @Binance on X, and a fresh web search for "Agent ID Hackathon" + "survey"/"submit".
- **Hard deadline to have the form:** well before **9 Dec 2026 08:00 UTC** (submission close). Target: form found and submission filed by **2 Dec** at the latest, leaving a week of buffer.
- **If still not found by 25 Nov:** ask via official channels (Binance Wallet support / BNB Chain community) where project submissions are filed — do not guess a URL.
- **Never submit project details to any unofficial form.** Only a link published by Binance / BNB Chain official accounts counts.

### Sources

- Official announcement: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf (opened 18 Nov 2026)
- Binance Square mirror: https://www.binance.com/en/square/post/389517345917641 (opened 18 Nov 2026)
- Promotion survey (verified, login-gated): https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c (opened 18 Nov 2026)

## Submission Checklist (honest status, 18 Nov 2026)

| # | Item | Status |
| --- | --- | --- |
| 1 | Contracts written (AgentPass, AgentGate) | 🔨 In progress (parallel builder) |
| 2 | Contracts deployed on BSC mainnet | ⏳ Pending |
| 3 | Source verified on BscScan | ⏳ Pending (see `docs/verification.md`) |
| 4 | Repo public on GitHub (MIT, open-source) | ⏳ Pending (coordinator to push) |
| 5 | Frontend live on GitHub Pages | ⏳ Pending |
| 6 | Product live + usable with an Agent ID | ⏳ Pending (needs deploy) |
| 7 | ≥ 30 Agent ID addresses interacted with contracts | ⏳ Pending — **main risk** (see `PROMOTION.md`; tomi holds 1 Agent ID, 29 must come from real community) |
| 8 | Project submission form found | ❌ Not found yet (see Form Hunt above) |
| 9 | Project submitted via official form | ⏳ Blocked on #8 |
| 10 | X thread posted + submitted to Promotion survey | ⏳ Pending (drafts in `PROMOTION.md`; needs tomi's X account) |
| 11 | Reward receiving address confirmed | ⏳ Pending (tomi to confirm) |

## Key Dates (UTC)

| Milestone | Date |
| --- | --- |
| Submission Period | 18 Nov 2026 08:00 – 9 Dec 2026 08:00 |
| Internal Review | 9 Dec – 17 Dec 2026 |
| Public Review | 17 Dec – 20 Dec 2026 |
| Rewards distributed | Within 14 business days after public review ends |

## Honest Odds Note (internal — do not paste into the form)

AgentGate is a clean, genuinely useful primitive with a real shot at the Innovation Award's lower placements ($800 tier) if it ships live, verified, and with 30+ real Agent ID interactions. Top placements require standout execution and competition is unknown. Nothing is guaranteed; the work is the bet.
