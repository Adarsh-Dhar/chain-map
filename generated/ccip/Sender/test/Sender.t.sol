// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract MockRouter {
    function getFee(uint64, Client.EVM2AnyMessage memory) external pure returns (uint256) {
        return 0.1 ether;
    }

    function ccipSend(uint64, Client.EVM2AnyMessage calldata) external payable returns (bytes32) {
        return keccak256("message");
    }
}

contract SenderTest is Test {
    Sender public sender;
    MockRouter public router;

    function setUp() public {
        router = new MockRouter();
        sender = new Sender(address(router));
    }

    function testSendMessage() public payable {
        vm.deal(address(this), 1 ether);
        bytes32 expectedId = keccak256("message");
        
        vm.expectEmit(true, true, true, true);
        emit Sender.MessageSent(expectedId);
        
        bytes32 messageId = sender.sendMessage{value: 0.1 ether}(1, address(0));
        assertEq(messageId, expectedId);
    }
}