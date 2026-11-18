// AgentGate — configuration
// Single source of truth for contract addresses and ABIs.
// After the AgentPass / AgentGate contracts are deployed, the coordinator
// only needs to edit the two addresses marked TBD below. Nothing else
// in the app needs to change.

const CONFIG = {
  // BSC mainnet
  CHAIN_ID: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC mainnet",
  BLOCK_EXPLORER: "https://bscscan.com",
  // Public read-only RPC endpoints (used only when no wallet is connected).
  // The connected wallet is always preferred for reads.
  RPC_URLS: [
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed2.bnbchain.org",
    "https://bsc-dataseed3.bnbchain.org",
    "https://bsc-rpc.publicnode.com",
  ],

  // Agent ID contract (SPACE ID Agent ID, ERC-721) — VERIFIED on-chain.
  AGENT_ID_ADDRESS: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",

  // TBD — set after deploy. Until then the UI shows a "deploying soon"
  // banner, keeps the Agent ID check working, and disables mint/board.
  AGENT_PASS_ADDRESS: "0x0000000000000000000000000000000000000000",
  AGENT_GATE_ADDRESS: "0x0000000000000000000000000000000000000000",

  MAX_POST_LENGTH: 280,
  MAX_POSTS_SHOWN: 20,
};

// Minimal ABIs — canonical interfaces agreed with the contract builders.
// Used as documentation and by any future ethers-based tooling; the app
// itself encodes calls with the tiny built-in ABI encoder (abi.js logic
// lives inside app.js) so no external library is needed at runtime.

const AGENT_ID_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

const AGENT_PASS_ABI = [
  "function mint()",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOf(address owner) view returns (uint256)",
  "function hasPass(address owner) view returns (bool)",
  "function totalMinted() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

const AGENT_GATE_ABI = [
  "function isVerifiedAgent(address account) view returns (bool)",
  "function hasPass(address account) view returns (bool)",
  "function verify(address account) view returns (bool isAgent, bool hasPass_)",
  "function post(string message)",
  "function postCount() view returns (uint256)",
  "function getPost(uint256 postId) view returns (address author, string message, uint256 timestamp)",
  "function upvote(uint256 postId)",
  "function upvotes(uint256 postId) view returns (uint256)",
];

// Full JSON ABIs (machine-readable, for verification / tooling).
const AGENT_ID_ABI_JSON = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }] },
];

const AGENT_PASS_ABI_JSON = [
  { "type": "function", "name": "mint", "stateMutability": "nonpayable",
    "inputs": [], "outputs": [] },
  { "type": "function", "name": "balanceOf", "stateMutability": "view",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }] },
  { "type": "function", "name": "tokenOf", "stateMutability": "view",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }] },
  { "type": "function", "name": "hasPass", "stateMutability": "view",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }] },
  { "type": "function", "name": "totalMinted", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "type": "function", "name": "ownerOf", "stateMutability": "view",
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address" }] },
];

const AGENT_GATE_ABI_JSON = [
  { "type": "function", "name": "isVerifiedAgent", "stateMutability": "view",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }] },
  { "type": "function", "name": "hasPass", "stateMutability": "view",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }] },
  { "type": "function", "name": "verify", "stateMutability": "view",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [
      { "name": "isAgent", "type": "bool" },
      { "name": "hasPass_", "type": "bool" } ] },
  { "type": "function", "name": "post", "stateMutability": "nonpayable",
    "inputs": [{ "name": "message", "type": "string" }],
    "outputs": [] },
  { "type": "function", "name": "postCount", "stateMutability": "view",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] },
  { "type": "function", "name": "getPost", "stateMutability": "view",
    "inputs": [{ "name": "postId", "type": "uint256" }],
    "outputs": [
      { "name": "author", "type": "address" },
      { "name": "message", "type": "string" },
      { "name": "timestamp", "type": "uint256" } ] },
  { "type": "function", "name": "upvote", "stateMutability": "nonpayable",
    "inputs": [{ "name": "postId", "type": "uint256" }],
    "outputs": [] },
  { "type": "function", "name": "upvotes", "stateMutability": "view",
    "inputs": [{ "name": "postId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }] },
];

// Function selectors (first 4 bytes of keccak256 of the signature),
// computed with ethers. Kept here so the encoder never guesses.
const SELECTORS = {
  "mint()": "0x1249c58b",
  "balanceOf(address)": "0x70a08231",
  "tokenOf(address)": "0x42ec38e2",
  "hasPass(address)": "0x937cde20",
  "totalMinted()": "0xa2309ff8",
  "ownerOf(uint256)": "0x6352211e",
  "isVerifiedAgent(address)": "0x2a82e6b8",
  "verify(address)": "0x63a9c3d7",
  "post(string)": "0x8ee93cf3",
  "postCount()": "0x17906c2e",
  "getPost(uint256)": "0x40731c24",
  "upvote(uint256)": "0x01ddf070",
  "upvotes(uint256)": "0x96114c3f",
};

// Export for Node-based tests (harmless in the browser).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG, AGENT_ID_ABI, AGENT_PASS_ABI, AGENT_GATE_ABI,
    AGENT_ID_ABI_JSON, AGENT_PASS_ABI_JSON, AGENT_GATE_ABI_JSON, SELECTORS };
}
