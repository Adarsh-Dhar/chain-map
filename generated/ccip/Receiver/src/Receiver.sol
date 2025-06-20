// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;

    event MessageReceived(bytes32 messageId);

    constructor(address router) CCIPReceiver(router) {}

    function _ccipReceive(
        Client.Any2EVMMessage calldata message
    ) internal override {
        lastMessage = abi.decode(message.data, (string));
        emit MessageReceived(message.messageId);
    }
}