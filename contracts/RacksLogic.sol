// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./RacksKeeper.sol";

error RacksLogic__EnteredEthFailed();

contract RacksLogic is VRFConsumerBaseV2 {
    using SafeMath for *;

    RacksKeeper public keeperAddress;
    VRFCoordinatorV2Interface private immutable vrfCoordinatorV2;

    address private immutable owner;
    uint256 totaledEthEntered;
    bool randomNumberGotten;

    uint256 private immutable gateFee;
    uint256 private immutable randomNumberInterval;
    uint256 private randomNumberGot;
    uint256 private immutable stakedEth;
    address private immutable stakedTokenAddress;
    uint256 private immutable stakedToken;

    uint256 private immutable randomNumber;
    uint64 private immutable subcriptionId;
    bytes32 private immutable keyHash;
    uint32 private immutable callbackGaslimit = 500000;
    uint16 private constant requestConfirmations = 3;
    uint32 private constant numwords = 1;

    modifier notOwner() {
        require(msg.sender != owner, "Cant call this function u are owner of the contract");
        _;
    }

    // enter to get a chance to enter
    constructor(
        address payable _keeperAddress,
        address _stakedTokenAddress,
        uint256 _gateFee,
        uint256 _randomNumber,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId, // WONT CHANGED
        bytes32 _keyHash,
        uint256 _yourNumberToGiveRandom,
        uint256 _stakedEth,
        uint256 _stakedToken
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        keeperAddress = RacksKeeper(_keeperAddress);
        owner = msg.sender;
        gateFee = _gateFee;
        randomNumber = _randomNumber;
        vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subcriptionId = _subscriptionId;
        keyHash = _keyHash;
        randomNumberInterval = _yourNumberToGiveRandom * 2;
        stakedEth = _stakedEth;
        stakedTokenAddress = _stakedTokenAddress;
        stakedToken = _stakedToken;
    }

    function requestRandomWords() public notOwner returns (uint256 requestId) {
        requestId = vrfCoordinatorV2.requestRandomWords(
            keyHash,
            subcriptionId,
            requestConfirmations,
            callbackGaslimit,
            numwords
        );
    }

    function fulfillRandomWords(
        uint256, /*resquestId*/
        uint256[] memory randomWords
    ) internal override {
        randomNumberGot = randomWords[0].mod(randomNumberInterval).add(1);
    }

    function enter() public payable notOwner {
        require(msg.value > gateFee, "Fee is less than gate fee");

        totaledEthEntered += msg.value;

        address payable addr = payable(address(keeperAddress));

        (bool success, ) = addr.call{value: msg.value}("");
        if (!success) {
            revert RacksLogic__EnteredEthFailed();
        }

        uint256 request = requestRandomWords();

        require(randomNumberGot > 0, "Should be greater than zero");

        randomNumberGotten = false;

        if (randomNumberGot == randomNumber) {
            // keeperAddress.isAllowed();
            randomNumberGotten = true;
            uint256 ethToTranfer = _amtToTransfer(stakedEth);
            uint256 tokenToTransfer = _amtToTransfer(stakedToken);
            keeperAddress.unsafeTransferEth(msg.sender, ethToTranfer);
            keeperAddress.unsafeTransferToken(stakedTokenAddress, msg.sender, tokenToTransfer);
        }
    }

    function _amtToTransfer(uint256 _amount) private pure returns (uint256) {
        uint256 amount = (_amount * 35) / 1000;
        return _amount - amount;
    }
}
