// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Sender} from "../src/Sender.sol";

contract DeploySender is Script {
    function run() external {
        vm.startBroadcast();
        new Sender(0x0, 0x0);
        vm.stopBroadcast();
    }
}