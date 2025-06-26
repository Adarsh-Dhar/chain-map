// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CCIPReceiver} from "@chainlink/contracts-ccip@1.4.0/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip@1.4.0/src/v0.8/ccip/libraries/Client.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;

    constructor(address _router) CCIPReceiver(_router) {}

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address sender, ) = abi.decode(message.sender, (address, address));
        require(sender == address(0), "Invalid sender");
        
        lastMessage = abi.decode(message.data, (string));
    }
}