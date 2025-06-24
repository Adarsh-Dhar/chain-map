// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Receiver.sol";

contract DeployReceiver is Script {
    function run() external {
        vm.startBroadcast();
        new Receiver(0x1234567890ABCDEF1234567890ABCDEF12345678);
        vm.stopBroadcast();
    }
}