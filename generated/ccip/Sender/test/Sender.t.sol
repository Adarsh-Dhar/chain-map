// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address router = makeAddr("router");
    address linkToken = makeAddr("linkToken");

    function setUp() public {
        sender = new Sender(router, linkToken);
    }

    function testSendMessage() public {
        vm.mockCall(
            router,
            abi.encodeWithSelector(IRouterClient.getFee.selector),
            abi.encode(1 ether)
        );
        vm.mockCall(
            router,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector),
            abi.encode(keccak256("messageId"))
        );
        
        vm.prank(address(0x123));
        bytes32 messageId = sender.sendMessage(1, address(0x456));
        assertEq(messageId, keccak256("messageId"));
    }
}