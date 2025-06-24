// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {Receiver} from "../src/Receiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract ReceiverTest is Test {
    Receiver receiver;
    address mockRouter = address(0xCafE);

    function setUp() public {
        receiver = new Receiver(mockRouter);
    }

    function test_ReceiveMessage() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: 1,
            sender: abi.encode(address(0xDeaD)),
            data: abi.encode("hello world"),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(mockRouter);
        receiver.ccipReceive(message);

        assertEq(receiver.lastMessage(), "hello world");
    }
}