// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title AgentPass
/// @notice Soulbound (non-transferable) ERC-721 pass, free to mint (gas only),
///         one per holder of a SPACE ID Agent ID NFT.
/// @dev Gating is verified on-chain against the Agent ID contract:
///      mint() requires IERC721(agentId).balanceOf(msg.sender) > 0.
///      The Agent ID contract address is immutable and set at deploy time.
contract AgentPass is ERC721 {
    using Strings for uint256;

    /// @notice The Agent ID ERC-721 contract used for eligibility checks.
    IERC721 public immutable agentId;

    /// @notice Sequential token id counter. First minted pass is token id 1.
    uint256 private _nextTokenId = 1;

    /// @notice Pass token id owned by an address, 0 when the address has none.
    mapping(address => uint256) private _passOf;

    /// @notice Emitted when a pass is minted.
    event Minted(address indexed holder, uint256 indexed tokenId);

    /// @param agentId_ Address of the Agent ID ERC-721 contract.
    constructor(address agentId_) ERC721("AgentPass", "AGP") {
        require(agentId_ != address(0), "Agent ID address zero");
        agentId = IERC721(agentId_);
    }

    /// @notice Mint one free soulbound pass. Caller must hold an Agent ID
    ///         and must not already own a pass. No payment, gas only.
    function mint() external {
        require(agentId.balanceOf(msg.sender) > 0, "Agent ID required");
        require(_passOf[msg.sender] == 0, "already has pass");

        uint256 tokenId = _nextTokenId++;
        _passOf[msg.sender] = tokenId;
        emit Minted(msg.sender, tokenId);
        _safeMint(msg.sender, tokenId);
    }

    /// @notice Token id of the pass owned by `account`, or 0 if it has none.
    function tokenOf(address account) external view returns (uint256) {
        return _passOf[account];
    }

    /// @notice True when `account` owns an AgentPass.
    function hasPass(address account) external view returns (bool) {
        return _passOf[account] != 0;
    }

    /// @notice Total number of passes minted so far.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice Fully on-chain metadata: JSON + SVG image, both base64 data URIs.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<rect width="400" height="400" fill="#0b1020"/>',
            '<text x="200" y="185" font-family="monospace" font-size="30" fill="#7dd3fc" text-anchor="middle">AGENTPASS</text>',
            '<text x="200" y="230" font-family="monospace" font-size="22" fill="#f9a8d4" text-anchor="middle">#',
            tokenId.toString(),
            "</text>",
            '<text x="200" y="270" font-family="monospace" font-size="14" fill="#94a3b8" text-anchor="middle">VERIFIED AGENT</text>',
            "</svg>"
        );

        string memory json = string.concat(
            '{"name":"AgentPass #',
            tokenId.toString(),
            '","description":"Soulbound pass for verified Agent ID holders on AgentGate. Free mint, one per Agent ID holder, non-transferable.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Verified Agent","value":"Yes"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    // ---- Soulbound enforcement ----

    /// @dev Transfers between wallets always revert. Minting (from == 0)
    ///      and burning (to == 0) still work.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }

    /// @dev Approvals are meaningless for a soulbound token; block them.
    function approve(address /* to */, uint256 /* tokenId */) public pure override {
        revert("soulbound: approvals disabled");
    }

    /// @dev Operator approvals are meaningless for a soulbound token; block them.
    function setApprovalForAll(address /* operator */, bool /* approved */) public pure override {
        revert("soulbound: approvals disabled");
    }
}
