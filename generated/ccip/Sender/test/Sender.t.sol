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
        vm.prank(address(0x123));
        vm.mockCall(
            router,
            abi.encodeWithSignature("getFee(uint64,bytes)"),
            abi.encode(1 ether)
        );
        vm.mockCall(
            linkToken,
            abi.encodeWithSelector(IERC20.approve.selector),
            abi.encode(true)
        );
        vm.mockCall(
            router,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector),
            abi.encode(bytes32("messageId"))
        );
        
        bytes32 messageId = sender.sendMessage(1, address(0x456), "hello world");
        assertEq(messageId, bytes32("messageId"));
    }
}