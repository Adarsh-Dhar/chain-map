// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Sender} from "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0x123);
    address linkToken = address(0x456);

    function setUp() public {
        sender = new Sender(mockRouter, linkToken);
    }

    function test_SendMessage() public {
        vm.deal(address(sender), 1 ether);
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(Sender(mockRouter).ccipSend.selector),
            abi.encode(bytes32("1"))
        );
        
        bytes32 messageId = sender.sendMessage(1, address(0x789));
        assertEq(messageId, bytes32("1"));
    }
}