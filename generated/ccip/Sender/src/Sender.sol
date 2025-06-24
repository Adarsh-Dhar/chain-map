// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.0/token/ERC20/IERC20.sol";

contract Sender {
    IRouterClient public router;
    IERC20 public linkToken;
    
    event MessageSent(bytes32 messageId);

    constructor(address _router, address _link) {
        router = IRouterClient(_router);
        linkToken = IERC20(_link);
    }

    function sendMessage(
        uint64 destinationChainId,
        address receiver,
        string calldata message
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory evmMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(linkToken)
        });

        uint256 fee = router.getFee(destinationChainId, evmMessage);
        linkToken.transferFrom(msg.sender, address(this), fee);
        linkToken.approve(address(router), fee);

        messageId = router.ccipSend(destinationChainId, evmMessage);
        emit MessageSent(messageId);
    }
}