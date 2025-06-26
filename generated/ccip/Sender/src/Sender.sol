// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip@1.4.0/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip@1.4.0/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public immutable router;
    
    event MessageSent(bytes32 messageId);

    constructor(address _router) {
        router = IRouterClient(_router);
    }

    function sendMessage(
        uint64 destinationChainSelector,
        address receiver
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        uint256 fee = router.getFee(destinationChainSelector, message);

        messageId = router.ccipSend{value: fee}(
            destinationChainSelector,
            message
        );

        emit MessageSent(messageId);
    }

    receive() external payable {}
}