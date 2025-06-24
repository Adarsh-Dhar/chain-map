// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;
    
    event MessageReceived(bytes32 messageId, string message);
    
    constructor(address router) CCIPReceiver(router) {}
    
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        (string memory receivedMessage) = abi.decode(message.data, (string));
        lastMessage = receivedMessage;
        emit MessageReceived(message.messageId, receivedMessage);
    }
}