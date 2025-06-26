// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0x123);
    uint64 chainSelector = 1;
    
    function setUp() public {
        sender = new Sender(mockRouter, chainSelector);
        sender.setReceiver(address(0x456));
    }
    
    function testSendMessage() public {
        vm.prank(address(0));
        bytes32 messageId = sender.sendMessage("hello world");
        assert(messageId != bytes32(0));
    }
}