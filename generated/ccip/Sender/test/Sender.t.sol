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
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector),
            abi.encode(bytes32("dummy"))
        );
        vm.expectCall(mockRouter, abi.encodeWithSelector(IRouterClient.ccipSend.selector));
        sender.sendMessage(1234);
    }
}