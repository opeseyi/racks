// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

interface IRacksCollectible {
    function getEth() external payable;

    function getToken(address tokenAddress, uint256 amount) external;

    function getNft(address _nftAddress, uint256 _tokenId) external;

    function setTIme(uint256 _interval) external;

    function organizerStake() external;

    function setRandomNumber(uint256 _amount) external;

    function requestRandomWords() external returns (uint256 requestId);

    function createRaffle(uint256 _gateFee) external;

    function requestWithdraw() external;

    function withdrawStakes() external;

    function windrawPrice() external;
}
