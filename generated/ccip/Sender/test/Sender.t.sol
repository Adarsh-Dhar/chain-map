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
        vm.mockCall(mockRouter, abi.encodeWithSelector(IRouterClient.getFee.selector), abi.encode(1e18));
        vm.mockCall(mockRouter, abi.encodeWithSelector(IRouterClient.ccipSend.selector), abi.encode(bytes32("1")));
        
        vm.startPrank(address(1));
        bytes32 messageId = sender.sendMessage(1, address(0x789), "hello world");
        vm.stopPrank();

        assertEq(messageId, bytes32("1"));
    }
}