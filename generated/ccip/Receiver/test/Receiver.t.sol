// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Receiver.sol";

contract MockRouter {
    function getRouter() public pure returns (address) {
        return address(this);
    }
}

contract ReceiverTest is Test {
    Receiver public receiver;
    MockRouter public router;

    function setUp() public {
        router = new MockRouter();
        receiver = new Receiver(address(router));
    }

    function testReceiveMessage() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: keccak256("id"),
            sourceChainSelector: 1,
            sender: abi.encode(address(0)),
            data: abi.encode("hello world"),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(address(router));
        receiver.ccipReceive(message);
        
        assertEq(receiver.lastMessage(), "hello world");
    }
}