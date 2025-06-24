// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract Sender {
    IRouterClient public router;
    LinkTokenInterface public linkToken;
    event MessageSent(bytes32 messageId);

    constructor(address _router, address _link) {
        router = IRouterClient(_router);
        linkToken = LinkTokenInterface(_link);
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
            feeToken: address(linkToken)
        });

        uint256 fee = router.getFee(destinationChainSelector, message);

        linkToken.approve(address(router), fee);
        
        messageId = router.ccipSend(destinationChainSelector, message);
        emit MessageSent(messageId);
    }
}