// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;
    
    event MessageReceived(bytes32 messageId);

    constructor(address _router) CCIPReceiver(_router) {}

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        lastMessage = abi.decode(message.data, (string));
        emit MessageReceived(message.messageId);
    }
}