// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AgentPass} from "../src/AgentPass.sol";
import {AgentGate} from "../src/AgentGate.sol";

/// @title AgentGate fork test (BSC mainnet)
/// @notice Verifies the registry against the REAL Agent ID contract on BSC
///         mainnet. Skips cleanly (with a reason) when no BSC RPC responds,
///         so a flaky RPC never fails the whole suite.
contract AgentGateForkTest is Test {
    /// @notice Real Agent ID contract, BSC mainnet ("SPACE ID Agent ID", AI).
    address internal constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    /// @notice Tomi's Agentic Wallet, verified holder of 1 Agent ID.
    address internal constant AGENTIC_WALLET = 0x0e65a18d0d9094ca2E908071Cc732C5af20827ED;

    string[] internal rpcs = [
        "https://bsc-dataseed2.binance.org",
        "https://bsc-dataseed3.binance.org",
        "https://bsc-dataseed4.binance.org",
        "https://bsc-rpc.publicnode.com"
    ];

    function testFork_AgenticWalletIsVerifiedAgent() public {
        uint256 forkId;
        bool forked = false;
        for (uint256 i = 0; i < rpcs.length; i++) {
            try vm.createFork(rpcs[i]) returns (uint256 id) {
                forkId = id;
                forked = true;
                break;
            } catch {
                // Try the next RPC.
            }
        }
        if (!forked) {
            vm.skip(true, "BSC RPC unreachable from this VM - fork test skipped");
        }
        vm.selectFork(forkId);

        // The real Agent ID contract: the Agentic Wallet holds exactly 1.
        assertEq(IERC721(AGENT_ID).balanceOf(AGENTIC_WALLET), 1);

        // Deploy the AgentGate stack on the fork and verify the registry view.
        AgentPass pass = new AgentPass(AGENT_ID);
        AgentGate gate = new AgentGate(AGENT_ID, address(pass));

        assertTrue(gate.isVerifiedAgent(AGENTIC_WALLET));
        assertFalse(gate.hasPass(AGENTIC_WALLET));

        (bool isAgent, bool hasPass_) = gate.verify(AGENTIC_WALLET);
        assertTrue(isAgent);
        assertFalse(hasPass_);

        // A random address is not a verified agent.
        assertFalse(gate.isVerifiedAgent(address(0xdead)));
    }
}
