// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Receiver.sol";

contract ReceiverTest is Test {
    Receiver receiver;
    address router = makeAddr("router");

    function setUp() public {
        receiver = new Receiver(router);
    }

    function testMessageReceive() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: 1,
            sender: abi.encode(makeAddr("sender")),
            data: abi.encode("hello world"),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(router);
        receiver.ccipReceive(message);
        
        assertEq(receiver.lastMessage(), "hello world");
    }
}