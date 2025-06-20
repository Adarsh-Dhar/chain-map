// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Sender} from "../src/Sender.sol";

contract MockRouter {
    function getFee(uint64, bytes memory) external pure returns (uint256) {
        return 1 ether;
    }

    function ccipSend(uint64, bytes memory) external payable returns (bytes32) {
        return keccak256("messageId");
    }
}

contract SenderTest is Test {
    Sender sender;
    address router = address(new MockRouter());
    address linkToken = address(0x0);

    function setUp() public {
        sender = new Sender(router, linkToken);
    }

    function test_SendMessage() public {
        bytes32 messageId = sender.sendMessage(1, address(0x123));
        assert(messageId != bytes32(0));
    }
}