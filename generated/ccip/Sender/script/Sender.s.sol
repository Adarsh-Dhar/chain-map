// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Sender.sol";

contract DeploySender is Script {
    function run() external {
        vm.startBroadcast();
        new Sender(0x1234567890ABCDEF1234567890ABCDEF12345678, 0xABCDEF1234567890ABCDEF1234567890ABCDEF12);
        vm.stopBroadcast();
    }
}