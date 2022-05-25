//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

contract Test {
    uint k;

    function f(uint i) external {
        require(i > 10, "Error");
        //k = i;
    }
}