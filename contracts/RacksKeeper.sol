// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// THIS CONTRACT PERMIT ANYONE TO WITHDRAW
// I.E THIS CONTRACT IS VULNERABLE TO ATTACK
error RacksKeeper__TransferFailed();
error RacksKeeper__TokenNotTransfer();

contract RacksKeeper {
    bool public isAllowed;

    constructor() {}

    receive() external payable {}

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function unsafeTransferEth(address _to, uint256 _amount) external payable {
        // require(isAllowed, "Not Allowed");
        (bool success, ) = payable(_to).call{value: _amount}("");
        if (!success) {
            revert RacksKeeper__TransferFailed();
        }

        // isAllowed = false;
    }

    function unsafeTransferToken(
        address tokenAddress,
        address _to,
        uint256 amount
    ) external {
        // require(isAllowed, "Not Allowed");
        require(tokenAddress != address(0), "getToken: Token address == 0");
        require(amount > 0, "getToken: Amount should be greater than zero");

        bool isSuccessful = IERC20(tokenAddress).transferFrom(msg.sender, _to, amount);
        if (!isSuccessful) {
            revert RacksKeeper__TokenNotTransfer();
        }
        // isAllowed = false;
    }
}
