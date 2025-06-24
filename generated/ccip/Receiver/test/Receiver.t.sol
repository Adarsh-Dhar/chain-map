// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Receiver.sol";

contract ReceiverTest is Test {
    Receiver receiver;
    address mockRouter = address(0x123);
    
    function setUp() public {
        receiver = new Receiver(mockRouter);
    }
    
    function testReceiveMessage() public {
        string memory testMessage = "hello world";
        bytes memory encodedMessage = abi.encode(testMessage);
        
        vm.prank(mockRouter);
        receiver.ccipReceive(Client.Any2EVMMessage({
            messageId: bytes32(0),
            sourceChainSelector: 0,
            sender: abi.encode(address(0)),
            data: encodedMessage,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        }));
        
        assertEq(receiver.lastMessage(), testMessage);
    }
}