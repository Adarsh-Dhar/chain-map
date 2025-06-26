// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public router;
    address public receiver;
    uint64 public destinationChainSelector;
    
    constructor(address _router, uint64 _destinationChainSelector) {
        router = IRouterClient(_router);
        destinationChainSelector = _destinationChainSelector;
    }
    
    function setReceiver(address _receiver) public {
        receiver = _receiver;
    }
    
    function sendMessage(string memory message) external returns (bytes32) {
        Client.EVM2AnyMessage memory messageData = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });
        
        return router.ccipSend(destinationChainSelector, messageData);
    }
}