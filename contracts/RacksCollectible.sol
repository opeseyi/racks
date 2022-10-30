// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./interfaces/IRacksCollectible.sol";
import "./RacksKeeper.sol";
import "./RacksLogic.sol";
import "hardhat/console.sol";

error RacksCollectible__GetEthFunctionFailed();
error RacksCollectible__GetTokenFunctionFailedInTransfer();
error RacksCollectible__GetTokenFunctionFailedInApprove();

contract RacksCollectible is Ownable, VRFConsumerBaseV2 {
    using SafeMath for uint256;

    struct All {
        string eth;
        uint256 amtOfETh;
        address tokenAddress;
        uint256 amtOfToken;
    }

    VRFCoordinatorV2Interface private immutable vrfCoordinatorV2;
    RacksKeeper public keeperAddress;
    RacksLogic public newRacksLogic;

    address public stackedTokenAddress;

    uint256 public stakedEth;
    uint256 public stackedTokenAmount;
    uint256 public yourNumberToGiveRandom;
    uint256 public randomNumber;

    All[] private stakes;

    event EthStacked(address indexed stacker, uint256 amount);
    event TokenStacked(address indexed stacker, address tokenAddress, uint256 amount);

    modifier haveAtLeastOneStake() {
        require(stakedEth > 0 || stackedTokenAmount > 0, "HaveAtLeastOneStake: No Stakes");
        _;
    }
    uint64 private immutable subcriptionId;
    bytes32 private immutable keyHash;
    uint32 private immutable callbackGaslimit;
    uint16 private constant requestConfirmations = 3;
    uint32 private constant numwords = 1;
    address private vrfCoordinatorV2Address;

    constructor(
        address payable _keeperAddress,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGaslimit
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        vrfCoordinatorV2Address = _vrfCoordinatorV2;
        keeperAddress = RacksKeeper(_keeperAddress);
        vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subcriptionId = _subscriptionId;
        callbackGaslimit = _callbackGaslimit;
        keyHash = _keyHash;
    }

    function getEth() public payable {
        require(msg.value > 0, "getToken: Amount should be greater than zero");

        stakedEth = msg.value;

        address payable addr = payable(address(keeperAddress));

        (bool success, ) = addr.call{value: msg.value}("");
        console.log(success);
        if (!success) {
            revert RacksCollectible__GetEthFunctionFailed();
        }

        emit EthStacked(msg.sender, msg.value);
    }

    function getToken(address tokenAddress, uint256 amount) public {
        require(tokenAddress != address(0), "getToken: Token address == 0");
        require(amount > 0, "getToken: Amount should be greater than zero");

        stackedTokenAddress = tokenAddress;
        stackedTokenAmount = amount;

        bool isSuccessful = IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(keeperAddress),
            amount
        );
        if (!isSuccessful) {
            revert RacksCollectible__GetTokenFunctionFailedInTransfer();
        }

        emit TokenStacked(msg.sender, tokenAddress, amount);
    }

    function organizerStake() public {
        stakes.push(All("eth", stakedEth, stackedTokenAddress, stackedTokenAmount));
    }

    function requestRandomWords() public onlyOwner returns (uint256 requestId) {
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
        randomNumber = randomWords[0].mod(yourNumberToGiveRandom).add(1);
    }

    function createRaffle(uint256 _gateFee) public haveAtLeastOneStake {
        // uint256 gateFee = _gateFee;

        newRacksLogic = new RacksLogic(
            payable(address(keeperAddress)),
            stackedTokenAddress,
            _gateFee,
            randomNumber,
            vrfCoordinatorV2Address,
            subcriptionId,
            keyHash,
            yourNumberToGiveRandom,
            stakedEth,
            stackedTokenAmount
        );
    }

    function getStakes(uint256 index) public view returns (All memory) {
        return stakes[index];
    }
}
