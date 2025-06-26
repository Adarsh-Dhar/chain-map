// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Receiver.sol";

contract ReceiverTest is Test {
    Receiver receiver;
    address mockRouter = address(0x123);
    
    function setUp() public {
        receiver = new Receiver(mockRouter);
    }
    
    function testReceiveMessage() public {
        Client.Any2EVMMessage memory message;
        message.data = abi.encode("hello world");
        vm.prank(mockRouter);
        receiver.ccipReceive(message);
        assertEq(receiver.lastMessage(), "hello world");
    }
}