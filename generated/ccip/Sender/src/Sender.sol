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
        uint64 _destinationChainSelector,
        address _receiver,
        string calldata _message
    ) external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: abi.encode(_message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(linkToken)
        });

        uint256 fee = router.getFee(_destinationChainSelector, message);
        require(linkToken.balanceOf(address(this)) >= fee, "Insufficient LINK balance");

        linkToken.approve(address(router), fee);
        messageId = router.ccipSend(_destinationChainSelector, message);
        emit MessageSent(messageId);
    }
}