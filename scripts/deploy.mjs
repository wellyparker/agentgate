// ============================================================================
// AgentGate deploy script — DRY RUN ONLY
// ----------------------------------------------------------------------------
// This script NEVER broadcasts. It only:
//   1. reads the compiled artifacts from contracts/out/
//   2. builds the two deployment transactions (AgentPass, then AgentGate)
//   3. asks a public BSC RPC for eth_estimateGas + eth_gasPrice (read-only)
//   4. prints the estimated deployment cost in BNB
//
// There is no private key in this script, no eth_sendTransaction and no
// eth_sendRawTransaction anywhere. Running it with or without --dry-run does
// exactly the same thing: estimate only.
//
// A REAL broadcast / deploy needs tomi's explicit approval first.
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..", "contracts");

// ---- Fixed parameters ------------------------------------------------------
const AGENT_ID = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"; // SPACE ID Agent ID, BSC mainnet
const DEPLOYER = "0x3e79533eD3FEEe77B97C1dF2941F44aF33C2e5d0"; // farming EOA, from-address for estimates only
// Placeholder for the not-yet-deployed AgentPass address, used only so the
// AgentGate creation calldata has the right shape. Calldata-cost difference
// vs the real address is at most ~240 gas (a few zero bytes), negligible.
const AGENT_PASS_PLACEHOLDER = "0x1111111111111111111111111111111111111111";

// Public BSC RPCs, tried in order. Node fetch only (curl times out via proxy).
const RPCS = [
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
];
const RPC_TIMEOUT_MS = 45_000;

// Interaction gas, measured locally with `forge test --gas-report`
// (2026-11-18). BSC execution gas is EVM-equivalent for these calls, so the
// numbers carry over; the live gas price below turns them into BNB.
const MEASURED_GAS = {
  "mint() (AgentPass, first mint)": 102860,
  "post() short message (AgentGate)": 119722,
  "post() 280-char message (AgentGate)": 143425,
  "upvote() (AgentGate)": 31460,
};

// ---- Helpers ----------------------------------------------------------------
function loadArtifact(contractName) {
  const path = join(CONTRACTS_DIR, "out", `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(path)) {
    throw new Error(
      `Artifact not found: ${path}\nRun "forge build" in ${CONTRACTS_DIR} first.`
    );
  }
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  if (!artifact.bytecode?.object) throw new Error(`No bytecode in ${contractName} artifact`);
  return artifact;
}

// ABI-encode one address as a 32-byte word (12 zero bytes + 20 address bytes).
function encodeAddress(addr) {
  return addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function rpcCall(rpcUrl, method, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`RPC error: ${json.error.message} (code ${json.error.code})`);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

// Try every RPC in order until one answers; return [result, rpcUrl].
async function rpcCallAny(method, params) {
  let lastError;
  for (const rpc of RPCS) {
    try {
      const result = await rpcCall(rpc, method, params);
      return [result, rpc];
    } catch (err) {
      lastError = err;
      console.error(`  [rpc] ${rpc} failed (${method}): ${err.message}`);
    }
  }
  throw new Error(`All BSC RPCs failed for ${method}: ${lastError?.message}`);
}

function fmtBNB(wei) {
  // wei (BigInt) -> BNB string with up to 8 decimals, trailing zeros trimmed.
  const BNB = 10n ** 18n;
  const whole = wei / BNB;
  const frac = wei % BNB;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 8).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function fmtGas(n) {
  return Number(n).toLocaleString("en-US");
}

// ---- Main -------------------------------------------------------------------
async function main() {
  console.log("================================================================");
  console.log("AgentGate — BSC mainnet deployment estimate (DRY RUN ONLY)");
  console.log("No transaction is broadcast. No private key is used.");
  console.log("================================================================\n");

  // 1. Sanity: confirm the RPC really is BSC mainnet (chain id 56).
  const [chainIdHex, rpcUsed] = await rpcCallAny("eth_chainId", []);
  const chainId = parseInt(chainIdHex, 16);
  console.log(`RPC in use: ${rpcUsed}`);
  console.log(`Chain id:   ${chainId} ${chainId === 56 ? "(BSC mainnet, OK)" : "(WARNING: not BSC!)"}`);
  if (chainId !== 56) throw new Error("Refusing to estimate against a non-BSC chain.");
  console.log(`Deployer (estimate 'from' only): ${DEPLOYER}`);
  console.log(`Agent ID contract:               ${AGENT_ID}\n`);

  // 2. Live gas price.
  const [gasPriceHex] = await rpcCallAny("eth_gasPrice", []);
  const gasPrice = BigInt(gasPriceHex);
  const gasPriceGwei = Number(gasPrice) / 1e9;
  console.log(`Live gas price: ${gasPriceGwei} gwei (${gasPrice} wei)\n`);

  // 3. Build deployment txs and estimate each.
  const estimates = [];
  const jobs = [
    {
      name: "AgentPass",
      artifact: loadArtifact("AgentPass"),
      args: encodeAddress(AGENT_ID),
      note: "constructor(address agentId)",
    },
    {
      name: "AgentGate",
      artifact: loadArtifact("AgentGate"),
      args: encodeAddress(AGENT_ID) + encodeAddress(AGENT_PASS_PLACEHOLDER),
      note: "constructor(address agentId, address agentPass) — AgentPass address is a placeholder",
    },
  ];

  for (const job of jobs) {
    const creationCode = job.artifact.bytecode.object; // "0x..." creation bytecode
    const data = creationCode + job.args;
    const codeBytes = (data.length - 2) / 2;
    // gasPrice 0x0 in the estimate call: avoids any balance check on the
    // estimate-only 'from' address; it does not change the gas estimate.
    const [gasHex] = await rpcCallAny("eth_estimateGas", [
      { from: DEPLOYER, gasPrice: "0x0", data },
    ]);
    const gas = BigInt(gasHex);
    const costWei = gas * gasPrice;
    estimates.push({ name: job.name, gas, costWei });
    console.log(`--- ${job.name} ---`);
    console.log(`  ${job.note}`);
    console.log(`  creation code: ${fmtGas(codeBytes)} bytes`);
    console.log(`  estimated gas: ${fmtGas(gas)}`);
    console.log(`  estimated cost: ${fmtBNB(costWei)} BNB @ ${gasPriceGwei} gwei\n`);
  }

  // 4. Totals.
  const totalGas = estimates.reduce((a, e) => a + e.gas, 0n);
  const totalCost = estimates.reduce((a, e) => a + e.costWei, 0n);
  console.log("=================================================================");
  console.log(`TOTAL deploy gas:  ${fmtGas(totalGas)}`);
  console.log(`TOTAL deploy cost: ${fmtBNB(totalCost)} BNB @ ${gasPriceGwei} gwei`);
  console.log("=================================================================\n");

  // 5. Interaction gas (forge-measured, priced at the live gas price).
  console.log("Interaction gas (measured via forge test --gas-report, 2026-11-18):");
  for (const [label, gas] of Object.entries(MEASURED_GAS)) {
    const costWei = BigInt(gas) * gasPrice;
    console.log(`  ${label}: ${fmtGas(gas)} gas = ${fmtBNB(costWei)} BNB`);
  }

  console.log("\nDRY RUN COMPLETE — nothing was broadcast.");
  console.log("Real deploy needs tomi's explicit approval, then a separate broadcast step.");
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
