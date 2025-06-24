// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Receiver} from "../src/Receiver.sol";

contract DeployReceiver is Script {
    function run() public returns (address) {
        vm.startBroadcast();
        Receiver receiver = new Receiver(vm.envAddress("ROUTER_ADDRESS"));
        vm.stopBroadcast();
        return address(receiver);
    }
}