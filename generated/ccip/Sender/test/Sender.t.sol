// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0x123);
    address linkToken = address(0x456);
    
    function setUp() public {
        sender = new Sender(mockRouter, linkToken);
        sender.setReceiver(address(0x789));
    }
    
    function testSendMessage() public {
        vm.deal(address(sender), 1 ether);
        string memory message = "hello world";
        
        vm.prank(address(0));
        bytes32 messageId = sender.sendMessage(message);
        
        assert(messageId != bytes32(0));
    }
}