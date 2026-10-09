// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Mesaj Tahtası
/// @notice Ücret karşılığı zincire not yazılır. Biriken ücreti yalnızca sahip çeker.
contract MessageBoard {
    struct Message {
        address author;
        string text;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public constant MIN_FEE = 0.0001 ether;
    uint256 public constant MAX_LENGTH = 280;

    address public owner;
    Message[] private messages;

    event MessagePosted(address indexed author, uint256 amount, string text);
    event Withdrawn(address indexed to, uint256 amount);

    error NotOwner();
    error FeeTooLow(uint256 sent, uint256 required);
    error BlankMessage();
    error MessageTooLong(uint256 length, uint256 max);
    error NothingToWithdraw();
    error TransferFailed();

    constructor() {
        owner = msg.sender;
    }

    function post(string calldata text) external payable {
        if (msg.value < MIN_FEE) revert FeeTooLow(msg.value, MIN_FEE);

        bytes memory raw = bytes(text);
        if (_blank(raw)) revert BlankMessage();
        if (raw.length > MAX_LENGTH) revert MessageTooLong(raw.length, MAX_LENGTH);

        messages.push(
            Message({
                author: msg.sender,
                text: text,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        emit MessagePosted(msg.sender, msg.value, text);
    }

    function getMessages() external view returns (Message[] memory) {
        return messages;
    }

    function messageCount() external view returns (uint256) {
        return messages.length;
    }

    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();

        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(owner, amount);
    }

    function _blank(bytes memory raw) private pure returns (bool) {
        for (uint256 i = 0; i < raw.length; i++) {
            if (raw[i] != 0x20) return false;
        }
        return true;
    }
}
