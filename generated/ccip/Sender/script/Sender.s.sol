// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {Sender} from "../src/Sender.sol";

contract DeploySender is Script {
    function run() public returns (address) {
        vm.startBroadcast();
        Sender sender = new Sender(vm.envAddress("ROUTER_ADDRESS"));
        vm.stopBroadcast();
        return address(sender);
    }
}