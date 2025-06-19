<boltArtifact>
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Sender Contract
interface IRouterClient {
    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage calldata message) external returns (bytes32);
    function getFee(uint64 destinationChainSelector, Client.EVM2AnyMessage calldata message) external view returns (uint256);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

library Client {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        address[] tokenAmounts;
        address feeToken;
        bytes extraArgs;
    }

    struct Any2EVMMessage {
        bytes32 messageId;
        uint64 sourceChainSelector;
        bytes sender;
        bytes data;
    }
}

contract Sender {
    IRouterClient public immutable router;
    address public immutable linkToken;
    uint64 public immutable destinationChainSelector;
    address public immutable receiver;

    constructor(address _router, address _link, uint64 _chainSelector, address _receiver) {
        router = IRouterClient(_router);
        linkToken = _link;
        destinationChainSelector = _chainSelector;
        receiver = _receiver;
    }

    function sendMessage() external {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new address[](0),
            feeToken: linkToken,
            extraArgs: ""
        });

        uint256 fee = router.getFee(destinationChainSelector, message);
        require(IERC20(linkToken).approve(address(router), fee), "Approval failed");
        
        router.ccipSend(destinationChainSelector, message);
    }
}

// Receiver Contract
interface IAny2EVMMessageReceiver {
    function ccipReceive(Client.Any2EVMMessage calldata message) external;
}

contract Receiver is IAny2EVMMessageReceiver {
    string public lastMessage;
    uint64 public immutable sourceChainSelector;
    address public immutable sender;

    constructor(uint64 _sourceChainSelector, address _sender) {
        sourceChainSelector = _sourceChainSelector;
        sender = _sender;
    }

    function ccipReceive(Client.Any2EVMMessage calldata message) external override {
        require(message.sourceChainSelector == sourceChainSelector, "Invalid source chain");
        require(abi.decode(message.sender, (address)) == sender, "Invalid sender");
        
        lastMessage = abi.decode(message.data, (string));
    }
}

// Extra Contract
contract Unnamed {
    // Empty contract as specified
}
</boltArtifact>