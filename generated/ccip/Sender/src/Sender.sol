// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public router;
    address public constant LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789;

    event MessageSent(bytes32 messageId);

    constructor(address _router) {
        router = IRouterClient(_router);
    }

    function sendMessage(uint64 destinationChainSelector, address receiver) external payable returns (bytes32) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: LINK_TOKEN
        });

        uint256 fee = router.getFee(destinationChainSelector, message);
        require(msg.value >= fee, "Insufficient fee");

        bytes32 messageId = router.ccipSend{value: fee}(destinationChainSelector, message);
        emit MessageSent(messageId);
        return messageId;
    }
}