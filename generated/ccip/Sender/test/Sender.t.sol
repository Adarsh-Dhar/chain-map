// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address constant router = address(1);
    address constant linkToken = address(2);

    function setUp() public {
        sender = new Sender(router, linkToken);
    }

    function test_SendMessage() public {
        vm.prank(address(0xBEEF));
        bytes32 messageId = sender.sendMessage(1, address(0xC0DE));
        assertTrue(messageId != bytes32(0));
    }
}