// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Receiver} from "../src/Receiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract ReceiverTest is Test {
    Receiver receiver;

    function setUp() public {
        receiver = new Receiver(address(0x0));
    }

    function test_ReceiveMessage() public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: 1,
            sender: abi.encode(address(0x123)),
            data: abi.encode("hello world"),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        (bool success,) = address(receiver).call(abi.encodeWithSignature(
            "_ccipReceive((bytes32,uint64,bytes,address,bytes32[],uint256[],bytes))",
            message
        ));
        
        assertTrue(success);
        assertEq(receiver.lastMessage(), "hello world");
    }
}