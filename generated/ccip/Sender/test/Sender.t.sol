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
    }

    function testSendMessage() public {
        vm.prank(address(0x789));
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(IRouterClient.getFee.selector),
            abi.encode(1e18)
        );
        vm.expectEmit(true, true, true, true);
        emit MessageSent(bytes32("dummy"));
        sender.sendMessage(1, address(0x999));
    }
}