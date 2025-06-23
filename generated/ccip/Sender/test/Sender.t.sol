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

    function test_SendMessage() public {
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(IRouterClient.getFee.selector),
            abi.encode(100)
        );
        
        vm.mockCall(
            linkToken,
            abi.encodeCall(IERC20.transferFrom, (address(this), address(sender), 100)),
            abi.encode(true)
        );

        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector),
            abi.encode(bytes32("messageId"))
        );

        bytes32 messageId = sender.sendMessage(1, address(0x789));
        assertEq(messageId, bytes32("messageId"));
    }
}