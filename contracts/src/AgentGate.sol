// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title AgentGate
/// @notice Registry + demo gated board for AgentGate.
/// @dev Read-only verification helpers (isVerifiedAgent / hasPass / verify)
///      let any third-party project check Agent ID / AgentPass status in one
///      call. The board is a minimal demo: only AgentPass holders can post
///      and upvote.
contract AgentGate {
    /// @notice The Agent ID ERC-721 contract.
    IERC721 public immutable agentId;

    /// @notice The AgentPass soulbound ERC-721 contract.
    IERC721 public immutable agentPass;

    /// @notice Maximum message length in bytes, keeps gas bounded.
    uint256 public constant MAX_MESSAGE_LENGTH = 280;

    /// @notice A board post.
    struct Post {
        address author;
        string message;
        uint256 timestamp;
    }

    /// @notice All posts, indexed by post id.
    Post[] private _posts;

    /// @notice postId => voter => has voted.
    mapping(uint256 => mapping(address => bool)) private _voted;

    /// @notice postId => upvote count.
    mapping(uint256 => uint256) private _upvoteCount;

    /// @notice Emitted when a post is created.
    event Posted(uint256 indexed postId, address indexed author, string message, uint256 timestamp);

    /// @notice Emitted when a post is upvoted.
    event Upvoted(uint256 indexed postId, address indexed voter);

    /// @param agentId_ Address of the Agent ID ERC-721 contract.
    /// @param agentPass_ Address of the AgentPass ERC-721 contract.
    constructor(address agentId_, address agentPass_) {
        require(agentId_ != address(0), "Agent ID address zero");
        require(agentPass_ != address(0), "AgentPass address zero");
        agentId = IERC721(agentId_);
        agentPass = IERC721(agentPass_);
    }

    // ---- Verification views ----

    /// @notice True when `account` holds at least one Agent ID.
    function isVerifiedAgent(address account) public view returns (bool) {
        return agentId.balanceOf(account) > 0;
    }

    /// @notice True when `account` holds at least one AgentPass.
    function hasPass(address account) public view returns (bool) {
        return agentPass.balanceOf(account) > 0;
    }

    /// @notice One-call verification for integrations: Agent ID + AgentPass status.
    /// @return isAgent True when `account` holds an Agent ID.
    /// @return hasPass_ True when `account` holds an AgentPass.
    function verify(address account) external view returns (bool isAgent, bool hasPass_) {
        return (isVerifiedAgent(account), hasPass(account));
    }

    // ---- Gated demo board ----

    /// @notice Post a message. Only AgentPass holders. Message max 280 bytes.
    /// @return postId Id of the created post.
    function post(string calldata message) external returns (uint256 postId) {
        require(hasPass(msg.sender), "AgentPass required");
        require(bytes(message).length > 0, "message empty");
        require(bytes(message).length <= MAX_MESSAGE_LENGTH, "message too long");

        postId = _posts.length;
        _posts.push(Post({author: msg.sender, message: message, timestamp: block.timestamp}));
        emit Posted(postId, msg.sender, message, block.timestamp);
    }

    /// @notice Total number of posts.
    function postCount() external view returns (uint256) {
        return _posts.length;
    }

    /// @notice Read one post by id.
    function getPost(uint256 postId)
        external
        view
        returns (address author, string memory message, uint256 timestamp)
    {
        require(postId < _posts.length, "post not found");
        Post storage p = _posts[postId];
        return (p.author, p.message, p.timestamp);
    }

    /// @notice Upvote a post. Only AgentPass holders, one vote per holder per post.
    function upvote(uint256 postId) external {
        require(hasPass(msg.sender), "AgentPass required");
        require(postId < _posts.length, "post not found");
        require(!_voted[postId][msg.sender], "already voted");

        _voted[postId][msg.sender] = true;
        _upvoteCount[postId] += 1;
        emit Upvoted(postId, msg.sender);
    }

    /// @notice Upvote count of a post.
    function upvotes(uint256 postId) external view returns (uint256) {
        require(postId < _posts.length, "post not found");
        return _upvoteCount[postId];
    }
}
