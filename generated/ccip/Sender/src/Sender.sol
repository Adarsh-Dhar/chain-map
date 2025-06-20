// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public router;
    
    event MessageSent(bytes32 messageId);

    constructor(address _router) {
        router = IRouterClient(_router);
    }

    function sendMessage(uint64 destinationChainSelector) external returns (bytes32) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(msg.sender),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });
        
        bytes32 messageId = router.ccipSend(destinationChainSelector, message);
        emit MessageSent(messageId);
        return messageId;
    }
}