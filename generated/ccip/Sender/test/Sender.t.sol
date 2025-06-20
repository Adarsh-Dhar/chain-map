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
            abi.encode(0.1 ether)
        );
        
        vm.expectCall(
            router,
            abi.encodeWithSelector(IRouterClient.ccipSend.selector)
        );
        
        sender.sendMessage(1, makeAddr("receiver"));
    }
}