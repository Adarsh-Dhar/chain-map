// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0x123);

    function setUp() public {
        sender = new Sender(mockRouter);
    }

    function testSendMessage() public {
        vm.deal(address(this), 1 ether);
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector),
            abi.encode(bytes32("1"))
        );
        
        bytes32 messageId = sender.sendMessage(1, address(0x456));
        assertEq(messageId, bytes32("1"));
    }
}