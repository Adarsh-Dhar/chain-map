// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Sender} from "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0x123);
    address mockLink = address(0x456);

    function setUp() public {
        sender = new Sender(mockRouter, mockLink);
    }

    function testSendMessage() public {
        vm.prank(address(0x1));
        vm.mockCall(
            mockRouter,
            abi.encodeWithSignature("getFee(uint64,Client.EVM2AnyMessage)"),
            abi.encode(1 ether)
        );
        vm.mockCall(
            mockLink,
            abi.encodeWithSignature("approve(address,uint256)"),
            abi.encode(true)
        );
        vm.mockCall(
            mockRouter,
            abi.encodeWithSignature("ccipSend(uint64,Client.EVM2AnyMessage)"),
            abi.encode(bytes32(0))
        );
        sender.sendMessage(1, address(0x789));
    }
}