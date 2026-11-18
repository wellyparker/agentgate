# AgentPass minters — on-chain evidence

All addresses below hold an AgentPass (ERC-721, soulbound, 1 per Agent ID holder).
Each minter provably holds a Binance Agent ID: `mint()` enforces `agentId.balanceOf(msg.sender) > 0`
on-chain, and the 1-pass-per-holder rule is enforced by the contract, so every entry below is a
distinct Agent ID address. Addresses are public on-chain data (BSC mainnet).

Contract: `0x67a6b7c907cab9becfe81377fd434445089c7c5b` (AgentPass)
Verified via Multicall3 `ownerOf()` reads (single eth_call), 18 Nov 2026 ~19:06 WIB.

| Token | Holder |
|---|---|
| #1 | 0xa6bEd08f06102E0ea1F5c1326B5aac85B2A26431 |
| #2 | 0xDA2978745d7d89fDcdC0F1eCC217e8a67f84616B |
| #3 | 0x095a02Fb31421f7B74CAEdf22e2A0EcE86b9009E |
| #4 | 0xB103A742942E6cb99FD59B9B7B415e54A67F7d08 |
| #5 | 0x86A49a9E391c5dc143d2d8B2E8BB77e8Bb61EDE9 |
| #6 | 0x61D5353152B2573786Bf640E289a12e00c7C3dF1 |
| #7 | 0x072c7A43e7e81350734A48EF5A117e6a1E98E331 |
| #8 | 0xFF892C6231B953447827c7796Ce8E03d1EB0032B |
| #9 | 0xbfB58d8c02b250A3C33cE6bB2aC03C406B962381 |
| #10 | 0xf11ca64F9B5e83C919A445d3cCd4aeD8B82B2161 |
| #11 | 0x810cd0ccFf0a992F4B0E74c9890A9faA38c0E20A |
| #12 | 0xEEdD07B40D7683344A65C5EB457Ae44A98e41Ad5 |
| #13 | 0x0e65a18d0d9094ca2E908071Cc732C5af20827ED (tomi — Agentic Wallet) |
| #14 | 0xd944bddf954d0C26b32005a5D723948fAd37007a |
| #15 | 0x3cB4e671E2A1ECe36246d397190D6F185eFB4efb |
| #16 | 0xDbe747d877F81661Ead1cA440D636a99BBCe837f |
| #17 | 0xe6cd585a2cB109998774Ca0acD6f8fed85EeD424 |
| #18 | 0x717c01812e9DfD83d56338Ff331b87d6F903F3A3 |
| #19 | 0x16Ac9eC281547C30C9C5F78c706060cF95F87EA4 |
| #20 | 0xDea0596250bf18D245E57e16bD5093B4c4a78dCe |
| #21 | 0x8a42547F9Aad3Cd1D74964412A5F5eb068085D5e |
| #22 | 0x730d1c42469084210443188C56Ab9D586bEcb4eA |
| #23 | 0x542d588511a0CB7FbF178AeaD2c23fF98C0d2E3F |

**Total: 23 / 30** unique Agent ID addresses as of 18 Nov 2026 ~19:06 WIB (deploy was 18:45 WIB).
Zero promotion done — all organic discovery. 7 more to reach the Innovation Award eligibility bar.
