// ============================================================================
// AgentGate — BROADCAST deploy to BSC mainnet (AgentPass, then AgentGate)
// ----------------------------------------------------------------------------
// Ordered by tomi 2026-11-18 ~18:41 WIB: "gas langsung deploy sama kmu jin
// itu ada di dompet oea kmu bnb" — deploy from the farming EOA, gas from its
// BNB balance (0.00062906 BNB at order time; deploy costs ~0.00010645 BNB
// @ 0.05 gwei, verified by dry-run reproduced twice).
//
// Safety:
//  - chain id MUST be 56, else abort
//  - live gas price cap 0.25 gwei, else abort (unaffordable)
//  - total cost (both deploys, est x 1.2) + 0.00002 BNB reserve must fit
//    the live EOA balance, else abort
//  - eth_estimateGas on the EXACT calldata that is broadcast
//  - sequential: AgentGate deploys only after AgentPass receipt is confirmed
//  - idempotent: refuses to run if deployment.json already records success
//  - post-deploy on-chain verification (code + views) before declaring done
//  - private key is read from the keypair file, used only for signing,
//    NEVER printed or logged
// ============================================================================

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ethers } = require("/home/hatch/workspace/mstrx/node_modules/ethers");

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..", "contracts");
const DEPLOYMENT_JSON = join(__dirname, "..", "deployment.json");
const KEYPAIR_PATH = "/home/hatch/workspace/wallets/omnis-farming/keypair.json";

const AGENT_ID = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const EOA = "0x3e79533eD3FEEe77B97C1dF2941F44aF33C2e5d0";
const AGENTIC_WALLET = "0x0e65a18d0d9094ca2E908071Cc732C5af20827ED";
const MAX_GAS_PRICE_WEI = 250_000_000n; // 0.25 gwei
const RESERVE_WEI = 20_000_000_000_000n; // 0.00002 BNB kept in the EOA
const GAS_MARGIN_NUM = 120n; // gasLimit = estimate * 120 / 100

const RPCS = [
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
];
const RPC_TIMEOUT_MS = 45_000;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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

async function rpcCallAny(method, params) {
  let lastError;
  for (const rpc of RPCS) {
    try {
      return [await rpcCall(rpc, method, params), rpc];
    } catch (err) {
      lastError = err;
      console.error(`  [rpc] ${rpc} failed (${method}): ${err.message}`);
    }
  }
  throw new Error(`All BSC RPCs failed for ${method}: ${lastError?.message}`);
}

function loadArtifact(name) {
  const path = join(CONTRACTS_DIR, "out", `${name}.sol`, `${name}.json`);
  if (!existsSync(path)) throw new Error(`Artifact not found: ${path} (run forge build first)`);
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  if (!artifact.bytecode?.object) throw new Error(`No bytecode in ${name} artifact`);
  return artifact;
}

function encodeAddress(addr) {
  return addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function fmtBNB(wei) {
  const BNB = 10n ** 18n;
  const whole = wei / BNB;
  const frac = wei % BNB;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 8).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

async function waitForReceipt(hash, label) {
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const [receipt] = await rpcCallAny("eth_getTransactionReceipt", [hash]);
    if (receipt) return receipt;
    if (i % 6 === 5) console.log(`  ... still waiting for ${label} receipt (${(i + 1) * 5}s)`);
  }
  throw new Error(`NO_RECEIPT for ${label} after 300s. Hash: ${hash} — check it on BscScan before re-running.`);
}

async function main() {
  console.log("================================================================");
  console.log("AgentGate — LIVE DEPLOY to BSC mainnet");
  console.log("Ordered by tomi 2026-11-18 18:41 WIB. Deployer: farming EOA.");
  console.log("================================================================\n");

  // Idempotency: never double-deploy.
  if (existsSync(DEPLOYMENT_JSON)) {
    const prev = JSON.parse(readFileSync(DEPLOYMENT_JSON, "utf8"));
    if (prev.status === "success" && prev.agentPass?.address && prev.agentGate?.address) {
      console.log("deployment.json already records a SUCCESSFUL deploy. Refusing to re-deploy.");
      console.log(JSON.stringify(prev, null, 2));
      process.exit(0);
    }
    console.log("NOTE: deployment.json exists but is not a completed success — proceeding.");
  }

  // Chain check.
  const [chainIdHex, rpcUsed] = await rpcCallAny("eth_chainId", []);
  const chainId = parseInt(chainIdHex, 16);
  console.log(`RPC: ${rpcUsed} | chainId: ${chainId}`);
  if (chainId !== 56) throw new Error("Refusing: not BSC mainnet.");

  // Live gas price + balance.
  const [gasPriceHex] = await rpcCallAny("eth_gasPrice", []);
  const gasPrice = BigInt(gasPriceHex);
  console.log(`Live gas price: ${Number(gasPrice) / 1e9} gwei`);
  if (gasPrice > MAX_GAS_PRICE_WEI) {
    throw new Error(`Gas price ${Number(gasPrice) / 1e9} gwei exceeds cap 0.25 gwei — aborting, deploy unaffordable.`);
  }
  const [balHex] = await rpcCallAny("eth_getBalance", [EOA, "latest"]);
  const balance = BigInt(balHex);
  console.log(`EOA balance: ${fmtBNB(balance)} BNB`);

  // Build exact creation calldata for both deploys (AgentGate uses a
  // placeholder AgentPass address ONLY for the pre-flight cost check).
  const passArtifact = loadArtifact("AgentPass");
  const gateArtifact = loadArtifact("AgentGate");
  const passData = passArtifact.bytecode.object + encodeAddress(AGENT_ID);
  const gateDataEst =
    gateArtifact.bytecode.object + encodeAddress(AGENT_ID) + encodeAddress("0x1111111111111111111111111111111111111111");

  // Pre-flight: estimate both, check affordability with margin + reserve.
  const [passGasHex] = await rpcCallAny("eth_estimateGas", [{ from: EOA, data: passData }]);
  const [gateGasHex] = await rpcCallAny("eth_estimateGas", [{ from: EOA, data: gateDataEst }]);
  const passGas = BigInt(passGasHex);
  const gateGas = BigInt(gateGasHex);
  const passLimit = (passGas * GAS_MARGIN_NUM) / 100n;
  const gateLimit = (gateGas * GAS_MARGIN_NUM) / 100n;
  const totalWorst = (passLimit + gateLimit) * gasPrice;
  console.log(`AgentPass estimate: ${passGas} gas (limit ${passLimit})`);
  console.log(`AgentGate estimate: ${gateGas} gas (limit ${gateLimit})`);
  console.log(`Worst-case total cost: ${fmtBNB(totalWorst)} BNB (+ ${fmtBNB(RESERVE_WEI)} BNB reserve)`);
  if (totalWorst + RESERVE_WEI > balance) {
    throw new Error(`Insufficient: need ${fmtBNB(totalWorst + RESERVE_WEI)} BNB, have ${fmtBNB(balance)} BNB.`);
  }

  // Signer (key never leaves this process, never logged).
  const keypair = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"));
  const wallet = new ethers.Wallet(keypair.privateKey || keypair.secretKey);
  if (wallet.address.toLowerCase() !== EOA.toLowerCase()) throw new Error("keypair address mismatch");
  console.log("Signer verified: farming EOA (key loaded, not printed).\n");

  const [nonceHex] = await rpcCallAny("eth_getTransactionCount", [EOA, "latest"]);
  let nonce = Number(nonceHex);
  console.log(`Starting nonce: ${nonce}\n`);

  const results = {};

  // ---- Deploy 1: AgentPass ----
  console.log("--- Deploying AgentPass ---");
  const passTx = { data: passData, nonce: nonce++, gasLimit: passLimit, gasPrice, chainId: 56 };
  const passSigned = await wallet.signTransaction(passTx);
  const [passHash] = await rpcCallAny("eth_sendRawTransaction", [passSigned]);
  console.log(`AgentPass tx: ${passHash}`);
  const passReceipt = await waitForReceipt(passHash, "AgentPass");
  if (passReceipt.status !== "0x1") throw new Error(`AgentPass deploy REVERTED. Hash: ${passHash}`);
  const passAddr = passReceipt.contractAddress;
  const passGasUsed = BigInt(passReceipt.gasUsed);
  console.log(`AgentPass DEPLOYED at ${passAddr} | block ${parseInt(passReceipt.blockNumber, 16)} | gas used ${passGasUsed}`);

  // Verify code exists.
  const [passCode] = await rpcCallAny("eth_getCode", [passAddr, "latest"]);
  if (!passCode || passCode === "0x") throw new Error("AgentPass has NO CODE at its address — aborting before AgentGate.");
  results.agentPass = {
    address: passAddr,
    txHash: passHash,
    block: parseInt(passReceipt.blockNumber, 16),
    gasUsed: passGasUsed.toString(),
    costBNB: fmtBNB(passGasUsed * gasPrice),
  };

  // ---- Deploy 2: AgentGate (real AgentPass address) ----
  console.log("\n--- Deploying AgentGate ---");
  const gateData = gateArtifact.bytecode.object + encodeAddress(AGENT_ID) + encodeAddress(passAddr);
  // Re-estimate with the REAL calldata (address bytes change calldata cost slightly).
  const [gateGasRealHex] = await rpcCallAny("eth_estimateGas", [{ from: EOA, data: gateData }]);
  const gateLimitReal = (BigInt(gateGasRealHex) * GAS_MARGIN_NUM) / 100n;
  console.log(`AgentGate re-estimate (real args): ${gateGasRealHex} gas -> limit ${gateLimitReal}`);
  const gateTx = { data: gateData, nonce: nonce++, gasLimit: gateLimitReal, gasPrice, chainId: 56 };
  const gateSigned = await wallet.signTransaction(gateTx);
  const [gateHash] = await rpcCallAny("eth_sendRawTransaction", [gateSigned]);
  console.log(`AgentGate tx: ${gateHash}`);
  const gateReceipt = await waitForReceipt(gateHash, "AgentGate");
  if (gateReceipt.status !== "0x1") throw new Error(`AgentGate deploy REVERTED. Hash: ${gateHash}`);
  const gateAddr = gateReceipt.contractAddress;
  const gateGasUsed = BigInt(gateReceipt.gasUsed);
  console.log(`AgentGate DEPLOYED at ${gateAddr} | block ${parseInt(gateReceipt.blockNumber, 16)} | gas used ${gateGasUsed}`);
  const [gateCode] = await rpcCallAny("eth_getCode", [gateAddr, "latest"]);
  if (!gateCode || gateCode === "0x") throw new Error("AgentGate has NO CODE at its address.");
  results.agentGate = {
    address: gateAddr,
    txHash: gateHash,
    block: parseInt(gateReceipt.blockNumber, 16),
    gasUsed: gateGasUsed.toString(),
    costBNB: fmtBNB(gateGasUsed * gasPrice),
  };

  // ---- On-chain verification (read-only) ----
  console.log("\n--- On-chain verification ---");
  const passIface = new ethers.Interface(passArtifact.abi);
  const gateIface = new ethers.Interface(gateArtifact.abi);

  const [v1] = await rpcCallAny("eth_call", [
    { to: gateAddr, data: gateIface.encodeFunctionData("isVerifiedAgent", [AGENTIC_WALLET]) },
    "latest",
  ]);
  const isAgent = gateIface.decodeFunctionResult("isVerifiedAgent", v1)[0];
  console.log(`AgentGate.isVerifiedAgent(Agentic Wallet) = ${isAgent}`);
  if (!isAgent) throw new Error("VERIFICATION FAILED: Agentic Wallet not recognised as Agent ID holder.");

  const [v2] = await rpcCallAny("eth_call", [
    { to: gateAddr, data: gateIface.encodeFunctionData("agentPass", []) },
    "latest",
  ]);
  const gatePassAddr = gateIface.decodeFunctionResult("agentPass", v2)[0];
  console.log(`AgentGate.agentPass() = ${gatePassAddr}`);
  if (gatePassAddr.toLowerCase() !== passAddr.toLowerCase()) throw new Error("VERIFICATION FAILED: AgentGate points at the wrong AgentPass.");

  const [v3] = await rpcCallAny("eth_call", [
    { to: passAddr, data: passIface.encodeFunctionData("totalMinted", []) },
    "latest",
  ]);
  const minted = passIface.decodeFunctionResult("totalMinted", v3)[0];
  console.log(`AgentPass.totalMinted() = ${minted}`);

  const [v4] = await rpcCallAny("eth_call", [
    { to: passAddr, data: passIface.encodeFunctionData("agentId", []) },
    "latest",
  ]);
  const passAgentId = passIface.decodeFunctionResult("agentId", v4)[0];
  console.log(`AgentPass.agentId() = ${passAgentId}`);
  if (passAgentId.toLowerCase() !== AGENT_ID.toLowerCase()) throw new Error("VERIFICATION FAILED: AgentPass points at the wrong Agent ID contract.");

  // ---- Save + summary ----
  const totalCost = (passGasUsed + gateGasUsed) * gasPrice;
  const out = {
    status: "success",
    network: "BSC mainnet (56)",
    deployer: EOA,
    gasPriceGwei: Number(gasPrice) / 1e9,
    totalCostBNB: fmtBNB(totalCost),
    deployedAt: new Date().toISOString(),
    ...results,
  };
  writeFileSync(DEPLOYMENT_JSON, JSON.stringify(out, null, 2) + "\n");
  console.log("\n=================================================================");
  console.log("DEPLOY SUCCESS — saved to deployment.json");
  console.log(`AgentPass: ${passAddr}`);
  console.log(`AgentGate: ${gateAddr}`);
  console.log(`Total cost: ${fmtBNB(totalCost)} BNB`);
  console.log("=================================================================");
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
