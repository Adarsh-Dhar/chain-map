// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Sender.sol";

contract DeploySender is Script {
    function run() external {
        vm.startBroadcast();
        new Sender(0x1234567890123456789012345678901234567890, 0xabcdefABCDEF1234567890abcdefABCDEF123456);
        vm.stopBroadcast();
    }
}