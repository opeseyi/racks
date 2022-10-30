// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RacksToken is ERC20 {
    constructor() ERC20("RacksToken", "RT") {
        _mint(msg.sender, 10000000000000000000000000000000000000000);
    }
}
