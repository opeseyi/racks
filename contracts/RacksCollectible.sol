// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "./interfaces/IRacksCollectible.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./RacksKeeper.sol";
import "./RacksLogic.sol";
import "hardhat/console.sol";

error RacksCollectible__GetEthFunctionFailed();
error RacksCollectible__GetTokenFunctionFailedInTransfer();
error RacksCollectible__GetTokenFunctionFailedInApprove();
error RacksCollectible__UpkeepNotNeeded(uint256);
error RacksCollectible__TransferTokenFromKeeperToUserFailed();
error RacksCollectible__TransferEthFromKeeperToUserFailed();
error RacksCollectible__TransferPriceToUserFailed();

contract RacksCollectible is
    IRacksCollectible,
    Ownable,
    VRFConsumerBaseV2,
    KeeperCompatibleInterface
{
    using SafeMath for uint256;

    enum RacksCollectibleState {
        OPEN,
        CLOSE
    }

    struct All {
        uint256 amtOfETh;
        bytes32 eth;
        uint256 amtOfToken;
        address tokenAddress;
    }

    struct RequestedWithdrawal {
        uint256 amount;
        uint256 time;
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
    RacksKeeper private immutable i_keeperAddress;
    RacksLogic public s_newRacksLogic;
    // RacksLogic private racksLogic;
    RacksCollectibleState private s_racksCollectibleState;
    address private s_stackedTokenAddress;
    address private s_stakedNftAddress;

    uint256 private s_stakedEth;
    uint256 private s_stackedTokenAmount;
    uint256 private s_yourNumberToGiveRandom;
    uint256 private s_randomNumber;
    uint256 private s_interval;
    uint256 private s_lastTimeStamp;
    uint256 private s_stakedNftId;
    uint256 private s_transferringEth;
    bool private s_isClaimed;
    All[] private s_stakes;

    uint32 private immutable i_callbackGaslimit;
    bytes32 private immutable i_keyHash;
    uint32 private constant NUM_WORDS = 1;
    address private immutable i_vrfCoordinatorV2Address;
    uint64 private immutable i_subcriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    mapping(address => uint256) private s_balances;
    mapping(address => RequestedWithdrawal) private s_requestedWithdrawals;

    uint256 private constant STAKES_WITHDRAW_WAIT_PERIOD = 1;
    uint256 private constant PRICE_WITHDRAW_WAIT_PERIOD = 2;

    event LogEthStacked(address indexed stacker, uint256 amount);
    event LogTokenStacked(address indexed stacker, address tokenAddress, uint256 amount);
    event LogTimeSet(address indexed sender, uint256 interval);
    event LogRequestedWords(address indexed sender, uint256 requestId);
    event LogFulfillRandomWords(address indexed sender, uint256 randomwords);
    event LogNftStaked(address indexed sender, address indexed nftAddress, uint256 indexed tokenId);
    event LogRaffleCreated(
        address indexed sender,
        uint256 gateFee,
        address indexed racksLogic,
        uint256 lastTimeStamp
    );

    modifier haveAtLeastOneStake() {
        require(
            s_stakedEth != 0 ||
                s_stackedTokenAmount != 0 ||
                (s_stakedNftAddress != address(0) && s_stakedNftId != 0),
            "HALOS:NoStakes"
        );
        _;
    }

    constructor(
        address payable _keeperAddress,
        // address _RacksLogic,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGaslimit
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        i_vrfCoordinatorV2Address = _vrfCoordinatorV2;
        i_keeperAddress = RacksKeeper(_keeperAddress);
        i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        // racksLogic = RacksLogic(_RacksLogic);
        i_subcriptionId = _subscriptionId;
        i_callbackGaslimit = _callbackGaslimit;
        i_keyHash = _keyHash;
        s_racksCollectibleState = RacksCollectibleState.CLOSE;
    }

    receive() external payable {}

    fallback() external payable {}

    function getEth() external payable {
        require(msg.value != 0, "GE:msg.value<=0");

        s_stakedEth = msg.value;

        address payable addr = payable(address(i_keeperAddress));

        (bool success, ) = addr.call{value: msg.value}("");
        if (!success) {
            revert RacksCollectible__GetEthFunctionFailed();
        }

        emit LogEthStacked(msg.sender, msg.value);
    }

    function getToken(address tokenAddress, uint256 amount) external {
        require(tokenAddress != address(0), "GT:tokenAddrinvalid");
        require(amount != 0, "GT:amount<=0");

        s_stackedTokenAddress = tokenAddress;
        s_stackedTokenAmount = amount;

        bool isSuccessful = IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(i_keeperAddress),
            amount
        );
        if (!isSuccessful) {
            revert RacksCollectible__GetTokenFunctionFailedInTransfer();
        }

        emit LogTokenStacked(msg.sender, tokenAddress, amount);
    }

    function getNft(address _nftAddress, uint256 _tokenId) external {
        require(_nftAddress != address(0), "GN:InvalidAddr");
        address owner = IERC721(_nftAddress).ownerOf(_tokenId);
        require(owner == msg.sender, "GN:NotOwner");

        IERC721(_nftAddress).safeTransferFrom(msg.sender, address(i_keeperAddress), _tokenId);

        emit LogNftStaked(msg.sender, _nftAddress, _tokenId);
    }

    function setTIme(uint256 _interval) external {
        require(_interval != 0, "ST:_interval<0");
        s_interval = _interval;

        emit LogTimeSet(msg.sender, _interval);
    }

    function organizerStake() external {
        s_stakes.push(All(s_stakedEth, "eth", s_stackedTokenAmount, s_stackedTokenAddress));
    }

    function setRandomNumber(uint256 _amount) external {
        require(_amount != 0, "_amount<0");
        s_yourNumberToGiveRandom = _amount;
    }

    function requestRandomWords() external onlyOwner returns (uint256 requestId) {
        requestId = i_vrfCoordinatorV2.requestRandomWords(
            i_keyHash,
            i_subcriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGaslimit,
            NUM_WORDS
        );
        // console.log(i_subcriptionId);
        emit LogRequestedWords(msg.sender, requestId);
    }

    function fulfillRandomWords(
        uint256, /*resquestId*/
        uint256[] memory randomWords
    ) internal override {
        s_randomNumber = randomWords[0].mod(s_yourNumberToGiveRandom).add(1);
        emit LogFulfillRandomWords(msg.sender, s_randomNumber);
    }

    function createRaffle(uint256 _gateFee) external haveAtLeastOneStake {
        require(_gateFee != 0, "CR:_gateFee<0");
        // uint256 gateFee = _gateFee;
        s_lastTimeStamp = block.timestamp;

        s_newRacksLogic = new RacksLogic(
            payable(address(i_keeperAddress)),
            s_stackedTokenAddress,
            _gateFee,
            s_randomNumber,
            i_vrfCoordinatorV2Address,
            i_subcriptionId,
            i_keyHash,
            s_yourNumberToGiveRandom,
            s_stakedEth,
            s_stackedTokenAmount
        );
        // console.log(address(s_newRacksLogic));
        s_racksCollectibleState = RacksCollectibleState.OPEN;

        emit LogRaffleCreated(msg.sender, _gateFee, address(s_newRacksLogic), s_lastTimeStamp);
    }

    function checkUpkeep(
        bytes memory /* checkData*/
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData*/
        )
    {
        require(s_interval != 0, "CU:Interval<0");
        bool isOpen = RacksCollectibleState.OPEN == s_racksCollectibleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp)) > s_interval;
        upkeepNeeded = (isOpen && timePassed);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(
        bytes memory /* checkData*/
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert RacksCollectible__UpkeepNotNeeded(uint256(s_racksCollectibleState));
        }

        // address payable addr = payable(address(racksLogic));
        // selfdestruct(addr);
        s_isClaimed = s_newRacksLogic.getRandomNumberGotten();
        uint256 s_totalEth = s_newRacksLogic.getTotaledEthEntered();

        s_transferringEth = _amtToTransfer(s_totalEth);
        s_balances[msg.sender] = s_transferringEth;

        address payable addr = payable(address(s_newRacksLogic));
        selfdestruct(addr);

        if (s_isClaimed) requestWithdraw();
    }

    function requestWithdraw() public {
        if (s_isClaimed) {
            uint256 amtToWithdraw = s_balances[msg.sender];
            s_balances[msg.sender] = 0;

            s_requestedWithdrawals[msg.sender] = RequestedWithdrawal({
                amount: amtToWithdraw,
                time: block.timestamp
            });
        }
    }

    function withdrawStakes() external {
        if (
            s_requestedWithdrawals[msg.sender].amount != 0 &&
            block.timestamp > s_requestedWithdrawals[msg.sender].time + STAKES_WITHDRAW_WAIT_PERIOD
        ) {
            bool success = IERC20(s_stackedTokenAddress).transferFrom(
                address(i_keeperAddress),
                msg.sender,
                s_stackedTokenAmount
            );
            if (!success) {
                revert RacksCollectible__TransferTokenFromKeeperToUserFailed();
            }

            IERC721(s_stakedNftAddress).safeTransferFrom(
                address(i_keeperAddress),
                msg.sender,
                s_stakedNftId
            );

            (bool isSuccess, ) = msg.sender.call{value: s_stakedEth}("");
            if (!isSuccess) {
                revert RacksCollectible__TransferEthFromKeeperToUserFailed();
            }
        }
    }

    function windrawPrice() external {
        if (
            s_requestedWithdrawals[msg.sender].amount != 0 &&
            block.timestamp > s_requestedWithdrawals[msg.sender].time + PRICE_WITHDRAW_WAIT_PERIOD
        ) {
            (bool success, ) = payable(msg.sender).call{value: s_transferringEth}("");
            if (!success) {
                revert RacksCollectible__TransferPriceToUserFailed();
            }
        }
    }

    function _amtToTransfer(uint256 _amount) private pure returns (uint256) {
        uint256 amount = (_amount * 35) / 1000;
        return _amount - amount;
    }

    function getVrfCoordinatorV2() external view returns (VRFCoordinatorV2Interface) {
        return i_vrfCoordinatorV2;
    }

    function getKeeperAddress() external view returns (RacksKeeper) {
        return i_keeperAddress;
    }

    function getNewRacksLogic() external view returns (RacksLogic) {
        return s_newRacksLogic;
    }

    function getRacksCollectibleState() external view returns (RacksCollectibleState) {
        return s_racksCollectibleState;
    }

    function getStackedTokenAddress() external view returns (address) {
        return s_stackedTokenAddress;
    }

    function getStakedEth() external view returns (uint256) {
        return s_stakedEth;
    }

    function getStackedTokenAmount() external view returns (uint256) {
        return s_stackedTokenAmount;
    }

    function getStakedNftAddress() external view returns (address) {
        return s_stakedNftAddress;
    }

    function getStackedNftId() external view returns (uint256) {
        return s_stakedNftId;
    }

    function getYourNUmberToGiveRandom() external view returns (uint256) {
        return s_yourNumberToGiveRandom;
    }

    function getRandomNumberNumber() external view returns (uint256) {
        return s_randomNumber;
    }

    function getInterval() external view returns (uint256) {
        return s_interval;
    }

    function getIsClaimed() external view returns (bool) {
        return s_isClaimed;
    }

    function getTransferringEthStakedInLogic() external view returns (uint256) {
        return s_transferringEth;
    }

    function getLastTimeStamp() external view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getStakes(uint256 index) external view returns (All memory) {
        return s_stakes[index];
    }

    function getSubcriptionId() external view returns (uint256) {
        return i_subcriptionId;
    }

    function getKeyHash() external view returns (bytes32) {
        return i_keyHash;
    }

    function getCallbackGaslimit() external view returns (uint32) {
        return i_callbackGaslimit;
    }
}
