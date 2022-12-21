// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

interface IRacksLogic {
    function requestRandomWords() external returns (uint256 requestId);

    function enter() external payable;

    function requestWithdraw() external;

    function windrawPrice() external;
}
