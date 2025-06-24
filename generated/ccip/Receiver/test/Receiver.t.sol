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
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32("1"),
            sourceChainSelector: 1,
            sender: abi.encode(address(0x456)),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(mockRouter);
        vm.expectEmit(true, true, true, true);
        emit MessageReceived(bytes32("1"));
        receiver.ccipReceive(message);
        
        assertEq(receiver.lastMessage(), "hello world");
    }
}