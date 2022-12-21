// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

interface IRacksKeeper {
    function getBalance() external view returns (uint256);

    function unsafeTransferEth(address _to, uint256 _amount) external payable;

     function unsafeTransferToken(
        address tokenAddress,
        address _to,
        uint256 amount
    ) external;
}
