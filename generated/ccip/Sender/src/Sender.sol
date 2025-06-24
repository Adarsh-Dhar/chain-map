// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender is OwnerIsCreator {
    IRouterClient public router;
    address public receiver;
    address public linkToken;
    
    event MessageSent(bytes32 messageId);
    
    constructor(address _router, address _linkToken) {
        router = IRouterClient(_router);
        linkToken = _linkToken;
    }
    
    function setReceiver(address _receiver) public onlyOwner {
        receiver = _receiver;
    }
    
    function sendMessage(string memory message) external payable returns (bytes32) {
        Client.EVM2AnyMessage memory evmMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: linkToken
        });
        
        uint256 fee = router.getFee(block.chainid, evmMessage);
        require(address(this).balance >= fee, "Insufficient fee");
        
        bytes32 messageId = router.ccipSend{value: fee}(block.chainid, evmMessage);
        emit MessageSent(messageId);
        return messageId;
    }
    
    receive() external payable {}
}