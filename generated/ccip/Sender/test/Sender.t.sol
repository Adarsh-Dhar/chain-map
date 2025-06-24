// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {Sender} from "../src/Sender.sol";

contract SenderTest is Test {
    Sender sender;
    address mockRouter = address(0xCafE000000000000000000000000000000000000);
    
    function setUp() public {
        sender = new Sender(mockRouter);
    }

    function test_SendMessage() public {
        uint64 destinationChainSelector = 1;
        address receiver = address(0xDeaD);
        
        vm.mockCall(
            mockRouter,
            abi.encodeWithSelector(bytes4(keccak256("getFee(uint64,Client.EVM2AnyMessage)"))),
            abi.encode(0.1 ether)
        );
        
        vm.deal(address(this), 0.1 ether);
        
        vm.expectEmit(true, true, true, true);
        emit Sender.MessageSent(bytes32(0));
        
        sender.sendMessage{value: 0.1 ether}(destinationChainSelector, receiver);
    }
}