// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public router;
    address public linkToken;
    
    event MessageSent(bytes32 messageId);

    constructor(address _router, address _linkToken) {
        router = IRouterClient(_router);
        linkToken = _linkToken;
    }

    function sendMessage(uint64 destinationChainSelector, address receiver) external returns (bytes32) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: linkToken
        });

        bytes32 messageId = router.ccipSend(destinationChainSelector, message);
        emit MessageSent(messageId);
        return messageId;
    }
}