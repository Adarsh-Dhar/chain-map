// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Receiver.sol";

contract ReceiverTest is Test {
    Receiver receiver;
    address constant router = address(1);

    function setUp() public {
        receiver = new Receiver(router);
    }

    function test_ReceiveMessage() public {
        Client.Any2EVMMessage memory message;
        message.data = abi.encode("test message");
        vm.prank(address(receiver.router()));
        receiver.ccipReceive(message);
        assertEq(receiver.lastMessage(), "test message");
    }
}