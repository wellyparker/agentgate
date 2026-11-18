// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {AgentPass} from "../src/AgentPass.sol";
import {MockAgentId} from "./MockAgentId.sol";

contract AgentPassTest is Test {
    MockAgentId internal agentId;
    AgentPass internal pass;

    address internal holder = makeAddr("holder");
    address internal holder2 = makeAddr("holder2");
    address internal stranger = makeAddr("stranger");

    event Minted(address indexed holder, uint256 indexed tokenId);

    function setUp() public {
        agentId = new MockAgentId();
        agentId.setBalance(holder, 1);
        agentId.setBalance(holder2, 1);
        // stranger holds no Agent ID.
        pass = new AgentPass(address(agentId));
    }

    function testMintSuccess() public {
        vm.expectEmit(true, true, false, false, address(pass));
        emit Minted(holder, 1);

        vm.prank(holder);
        pass.mint();

        assertEq(pass.tokenOf(holder), 1);
        assertTrue(pass.hasPass(holder));
        assertEq(pass.totalMinted(), 1);
        assertEq(pass.ownerOf(1), holder);
        assertEq(pass.balanceOf(holder), 1);
        assertEq(pass.name(), "AgentPass");
        assertEq(pass.symbol(), "AGP");
    }

    function testTokenURIIsDataUri() public {
        vm.prank(holder);
        pass.mint();

        string memory uri = pass.tokenURI(1);
        assertGt(bytes(uri).length, 0);
        // Must be a base64 JSON data URI.
        assertEq(bytes(uri)[0], bytes("d")[0]);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function testTokenURIRevertsForNonexistent() public {
        vm.expectRevert(
            abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, uint256(99))
        );
        pass.tokenURI(99);
    }

    function testMintRevertsForNonHolder() public {
        vm.prank(stranger);
        vm.expectRevert("Agent ID required");
        pass.mint();
    }

    function testSecondMintReverts() public {
        vm.prank(holder);
        pass.mint();

        vm.prank(holder);
        vm.expectRevert("already has pass");
        pass.mint();
    }

    function testSequentialTokenIds() public {
        vm.prank(holder);
        pass.mint();
        vm.prank(holder2);
        pass.mint();

        assertEq(pass.tokenOf(holder), 1);
        assertEq(pass.tokenOf(holder2), 2);
        assertEq(pass.totalMinted(), 2);
    }

    function testViewsForNonHolder() public view {
        assertEq(pass.tokenOf(stranger), 0);
        assertFalse(pass.hasPass(stranger));
        assertEq(pass.totalMinted(), 0);
    }

    function testTransferFromReverts() public {
        vm.prank(holder);
        pass.mint();

        vm.prank(holder);
        vm.expectRevert("soulbound: non-transferable");
        pass.transferFrom(holder, stranger, 1);
    }

    function testSafeTransferFromReverts() public {
        vm.prank(holder);
        pass.mint();

        vm.prank(holder);
        vm.expectRevert("soulbound: non-transferable");
        pass.safeTransferFrom(holder, stranger, 1);
    }

    function testSafeTransferFromWithDataReverts() public {
        vm.prank(holder);
        pass.mint();

        vm.prank(holder);
        vm.expectRevert("soulbound: non-transferable");
        pass.safeTransferFrom(holder, stranger, 1, "");
    }

    function testApproveReverts() public {
        vm.prank(holder);
        pass.mint();

        vm.prank(holder);
        vm.expectRevert("soulbound: approvals disabled");
        pass.approve(stranger, 1);
    }

    function testSetApprovalForAllReverts() public {
        vm.prank(holder);
        vm.expectRevert("soulbound: approvals disabled");
        pass.setApprovalForAll(stranger, true);
    }

    function testSupportsInterface() public view {
        // ERC-165 itself + ERC-721.
        assertTrue(pass.supportsInterface(0x01ffc9a7));
        assertTrue(pass.supportsInterface(0x80ac58cd));
        assertTrue(pass.supportsInterface(0x5b5e139f)); // ERC-721 metadata
    }

    function _startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory sb = bytes(s);
        bytes memory pb = bytes(prefix);
        if (sb.length < pb.length) return false;
        for (uint256 i = 0; i < pb.length; i++) {
            if (sb[i] != pb[i]) return false;
        }
        return true;
    }
}
