// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Sender.sol";

contract SenderScript is Script {
    function run() public {
        vm.startBroadcast();
        new Sender(0x123, 0x456);
        vm.stopBroadcast();
    }
}