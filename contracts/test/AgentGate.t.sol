// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentPass} from "../src/AgentPass.sol";
import {AgentGate} from "../src/AgentGate.sol";
import {MockAgentId} from "./MockAgentId.sol";

contract AgentGateTest is Test {
    MockAgentId internal agentId;
    AgentPass internal pass;
    AgentGate internal gate;

    address internal holder = makeAddr("holder");
    address internal holder2 = makeAddr("holder2");
    address internal stranger = makeAddr("stranger");

    event Posted(uint256 indexed postId, address indexed author, string message, uint256 timestamp);
    event Upvoted(uint256 indexed postId, address indexed voter);

    function setUp() public {
        agentId = new MockAgentId();
        agentId.setBalance(holder, 1);
        agentId.setBalance(holder2, 1);
        // stranger holds no Agent ID.
        pass = new AgentPass(address(agentId));
        gate = new AgentGate(address(agentId), address(pass));
    }

    function _mintPass(address who) internal {
        vm.prank(who);
        pass.mint();
    }

    // ---- Verification views ----

    function testVerifyHolderWithoutPass() public view {
        (bool isAgent, bool hasPass_) = gate.verify(holder);
        assertTrue(isAgent);
        assertFalse(hasPass_);
        assertTrue(gate.isVerifiedAgent(holder));
        assertFalse(gate.hasPass(holder));
    }

    function testVerifyHolderWithPass() public {
        _mintPass(holder);
        (bool isAgent, bool hasPass_) = gate.verify(holder);
        assertTrue(isAgent);
        assertTrue(hasPass_);
        assertTrue(gate.isVerifiedAgent(holder));
        assertTrue(gate.hasPass(holder));
    }

    function testVerifyStranger() public view {
        (bool isAgent, bool hasPass_) = gate.verify(stranger);
        assertFalse(isAgent);
        assertFalse(hasPass_);
        assertFalse(gate.isVerifiedAgent(stranger));
        assertFalse(gate.hasPass(stranger));
    }

    // ---- Posting ----

    function testPostSuccess() public {
        _mintPass(holder);

        vm.expectEmit(true, true, false, true, address(gate));
        emit Posted(0, holder, "hello agents", block.timestamp);

        vm.prank(holder);
        uint256 postId = gate.post("hello agents");

        assertEq(postId, 0);
        assertEq(gate.postCount(), 1);

        (address author, string memory message, uint256 timestamp) = gate.getPost(0);
        assertEq(author, holder);
        assertEq(message, "hello agents");
        assertEq(timestamp, block.timestamp);
    }

    function testPostRevertsForStranger() public {
        vm.prank(stranger);
        vm.expectRevert("AgentPass required");
        gate.post("hello");
    }

    function testPostRevertsForAgentIdHolderWithoutPass() public {
        // Holds an Agent ID but never minted the pass: still gated out.
        vm.prank(holder);
        vm.expectRevert("AgentPass required");
        gate.post("hello");
    }

    function testPostRevertsWhenEmpty() public {
        _mintPass(holder);
        vm.prank(holder);
        vm.expectRevert("message empty");
        gate.post("");
    }

    function testPostRevertsWhenTooLong() public {
        _mintPass(holder);
        // 281 bytes > MAX_MESSAGE_LENGTH (280).
        string memory longMsg = new string(281);
        vm.prank(holder);
        vm.expectRevert("message too long");
        gate.post(longMsg);
    }

    function testPostAtMaxLengthSucceeds() public {
        _mintPass(holder);
        string memory maxMsg = new string(280);
        vm.prank(holder);
        uint256 postId = gate.post(maxMsg);
        assertEq(postId, 0);
        assertEq(gate.postCount(), 1);
    }

    function testGetPostRevertsWhenMissing() public {
        vm.expectRevert("post not found");
        gate.getPost(0);
    }

    function testMultiplePosts() public {
        _mintPass(holder);
        _mintPass(holder2);

        vm.prank(holder);
        gate.post("first");
        vm.prank(holder2);
        gate.post("second");

        assertEq(gate.postCount(), 2);
        (, string memory m0,) = gate.getPost(0);
        (, string memory m1,) = gate.getPost(1);
        assertEq(m0, "first");
        assertEq(m1, "second");
    }

    // ---- Upvoting ----

    function testUpvoteSuccess() public {
        _mintPass(holder);
        _mintPass(holder2);

        vm.prank(holder);
        gate.post("vote me");

        vm.expectEmit(true, true, false, false, address(gate));
        emit Upvoted(0, holder2);

        vm.prank(holder2);
        gate.upvote(0);

        assertEq(gate.upvotes(0), 1);
    }

    function testDoubleVoteReverts() public {
        _mintPass(holder);
        _mintPass(holder2);

        vm.prank(holder);
        gate.post("vote me");

        vm.prank(holder2);
        gate.upvote(0);

        vm.prank(holder2);
        vm.expectRevert("already voted");
        gate.upvote(0);

        assertEq(gate.upvotes(0), 1);
    }

    function testUpvoteRevertsForNonHolder() public {
        _mintPass(holder);
        vm.prank(holder);
        gate.post("vote me");

        vm.prank(stranger);
        vm.expectRevert("AgentPass required");
        gate.upvote(0);
    }

    function testUpvoteRevertsWhenPostMissing() public {
        _mintPass(holder);
        vm.prank(holder);
        vm.expectRevert("post not found");
        gate.upvote(0);
    }

    function testUpvotesRevertsWhenPostMissing() public {
        vm.expectRevert("post not found");
        gate.upvotes(7);
    }
}
