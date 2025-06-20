// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPSender.sol";
import "@chainlink/contracts-contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

contract Sender is CCIPSender {
    constructor(address _router, address _linkToken) CCIPSender(_router) {
        LinkTokenInterface(_linkToken).approve(_router, type(uint256).max);
    }

    function sendMessage(uint64 _destinationChainId, address _receiver) external returns (bytes32) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            gasLimit: 200_000,
            extraArgs: ""
        });

        uint256 fee = IRouterClient(router).getFee(_destinationChainId, message);
        return IRouterClient(router).ccipSend(_destinationChainId, message);
    }
}