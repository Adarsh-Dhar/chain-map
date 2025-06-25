// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Receiver} from "../src/Receiver.sol";

contract DeployReceiver is Script {
    function run() external {
        vm.startBroadcast();
        new Receiver(0x123456789);
        vm.stopBroadcast();
    }
}