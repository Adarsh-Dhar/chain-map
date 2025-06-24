// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Sender.sol";

contract DeploySender is Script {
    function run() external {
        vm.startBroadcast();
        new Sender(0x123456789, 0x987654321);
        vm.stopBroadcast();
    }
}