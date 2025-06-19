<boltArtifact>
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//----------- Sender Contract (Source Chain) -----------
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public immutable router;
    address public immutable receiver;
    uint64 public immutable destinationChainSelector;

    constructor(address _router, uint64 _chainSelector, address _receiver) {
        router = IRouterClient(_router);
        destinationChainSelector = _chainSelector;
        receiver = _receiver;
    }

    function sendHelloWorld() external returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        uint256 fee = router.getFee(destinationChainSelector, message);
        
        messageId = router.ccipSend{value: fee}(destinationChainSelector, message);
    }

    receive() external payable {}
}

//----------- Receiver Contract (Destination Chain) -----------
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;

    event MessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        string message
    );

    constructor(address router) CCIPReceiver(router) {}

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        lastMessage = abi.decode(message.data, (string));
        
        emit MessageReceived(
            message.messageId,
            message.sourceChainSelector,
            abi.decode(message.sender, (address)),
            lastMessage
        );
    }
}

//----------- Extra Contract (Empty) -----------
contract Unnamed {
    // No implementation - placeholder contract
}

//----------- Chainlink Data Feed Example -----------
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract DataFeedExample {
    AggregatorV3Interface internal audUsdFeed;

    constructor() {
        audUsdFeed = AggregatorV3Interface(0xB0C712f98daE15264c8E26132BCC91C40aD4d5F9);
    }

    function getAudUsdPrice() public view returns (int) {
        (, int price,,,) = audUsdFeed.latestRoundData();
        return price;
    }
}
</boltArtifact>