// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Sender.sol";

contract MockRouter is IRouterClient {
    function ccipSend(uint64, Client.EVM2AnyMessage calldata) external payable returns (bytes32) {
        return bytes32("mockId");
    }

    function getFee(uint64, Client.EVM2AnyMessage calldata) external pure returns (uint256) {
        return 1e16;
    }

    function supportInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IRouterClient).interfaceId;
    }
}

contract SenderTest is Test {
    Sender public sender;
    MockRouter public router;

    function setUp() public {
        router = new MockRouter();
        sender = new Sender(address(router));
    }

    function testSendMessage() public {
        vm.deal(address(this), 1e18);
        bytes32 messageId = sender.sendMessage{value: 1e16}(1, address(0x123));
        assertEq(messageId, bytes32("mockId"));
    }
}