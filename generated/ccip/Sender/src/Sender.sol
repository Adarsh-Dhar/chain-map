// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender is OwnerIsCreator {
    IRouterClient public immutable router;
    address public linkToken;

    event MessageSent(bytes32 messageId);

    constructor(address _router, address _linkToken) {
        router = IRouterClient(_router);
        linkToken = _linkToken;
    }

    function sendMessage(
        uint64 destinationChainId,
        address receiver
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: linkToken
        });

        uint256 fee = router.getFee(destinationChainId, message);

        messageId = router.ccipSend{value: fee}(destinationChainId, message);
        emit MessageSent(messageId);
    }
}