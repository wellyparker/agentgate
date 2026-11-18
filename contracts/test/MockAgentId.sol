// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockAgentId
/// @notice Minimal stand-in for the Agent ID ERC-721 contract, used only in
///         unit tests. Its balanceOf is settable per address so tests never
///         need a mainnet fork. Only balanceOf is ever called by AgentPass
///         and AgentGate, so no other ERC-721 surface is implemented.
contract MockAgentId {
    mapping(address => uint256) private _balances;

    function setBalance(address account, uint256 amount) external {
        _balances[account] = amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
}
