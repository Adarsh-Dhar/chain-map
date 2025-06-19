<boltArtifact>
// Sender Contract
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Sender {
    IRouterClient public immutable router;
    address public immutable receiver;

    constructor(address _router, address _receiver) {
        router = IRouterClient(_router);
        receiver = _receiver;
    }

    function sendMessage() external {
        Client.EVMTokenAmount[] memory tokens = new Client.EVMTokenAmount[](0);
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode("hello world"),
            tokenAmounts: tokens,
            extraArgs: "",
            feeToken: address(0)
        });

        router.ccipSend(0, message);
    }
}

// Receiver Contract
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Receiver is CCIPReceiver {
    string public lastMessage;

    constructor(address router) CCIPReceiver(router) {}

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        lastMessage = abi.decode(message.data, (string));
    }
}

// Extra Contract 1
contract ExtraContract1 {
    // No CCIP logic - empty as specified
}
</boltArtifact>