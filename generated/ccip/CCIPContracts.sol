<boltArtifact>
// Sender Contract
pragma solidity ^0.8.0;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IERC20.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public immutable router;
    IERC20 public immutable linkToken;
    address public immutable receiver;
    uint64 public immutable destinationChainId;

    constructor(address _router, address _linkToken, address _receiver, uint64 _destinationChainId) {
        router = IRouterClient(_router);
        linkToken = IERC20(_linkToken);
        receiver = _receiver;
        destinationChainId = _destinationChainId;
    }

    function sendMessage() external {
        bytes memory data = abi.encode("hello world");
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(linkToken)
        });

        uint256 fee = router.getFee(destinationChainId, message);
        
        require(linkToken.transferFrom(msg.sender, address(this), fee), "Transfer failed");
        linkToken.approve(address(router), fee);

        router.ccipSend(destinationChainId, message);
    }
}

// Receiver Contract
pragma solidity ^0.8.0;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;

    event MessageReceived(string message);

    constructor(address _router) CCIPReceiver(_router) {}

    function _ccipReceive(Client.Any2EVMMessage calldata message) internal override {
        lastMessage = abi.decode(message.data, (string));
        emit MessageReceived(lastMessage);
    }
}

// Extra Contract (Unnamed)
contract Unnamed {
}
</boltArtifact>