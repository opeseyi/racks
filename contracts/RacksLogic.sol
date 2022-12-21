// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IRacksLogic.sol";
import "./RacksKeeper.sol";

error RacksLogic__EnteredEthFailed();
error RacksLogic__TransferPriceToUserFailed();

contract RacksLogic is IRacksLogic, VRFConsumerBaseV2 {
    using SafeMath for uint256;

    enum RacksLogicState {
        OPEN,
        CALCULATING
    }

    struct RequestedWithdrawal {
        uint256 time;
    }

    RacksKeeper public immutable i_keeperAddress;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
    RacksLogicState public s_racksLogicState;

    address private immutable i_owner;
    address private immutable i_stakedTokenAddress;

    uint256 private s_totaledEthEntered;
    bool private s_randomNumberGotten;
    uint256 private s_randomNumberGot;
    uint256 private immutable i_gateFee;
    uint256 private immutable i_randomNumberInterval;
    uint256 private immutable i_stakedEth;
    uint256 private immutable i_stakedToken;
    uint256 private immutable i_randomNumber;

    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subcriptionId;
    uint32 private constant CALLBACK_GASLIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUM_WORDS = 1;

    mapping(address => bool) private s_sendRequest;
    mapping(address => RequestedWithdrawal) private s_requestedWithdrawals;

    uint256 private constant PRICE_WITHDRAW_WAIT_PERIOD = 1;
    uint256 private s_ethToTranfer;
    uint256 private s_tokenToTransfer;

    event LogRaffleEntered(
        address indexed owner,
        address indexed notOwner,
        uint256 amount,
        uint256 randdomNumber,
        uint256 requestId
    );

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
        i_keeperAddress = RacksKeeper(_keeperAddress);
        i_owner = msg.sender;
        i_gateFee = _gateFee;
        i_randomNumber = _randomNumber;
        i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subcriptionId = _subscriptionId;
        i_keyHash = _keyHash;
        i_randomNumberInterval = _yourNumberToGiveRandom * 2;
        i_stakedEth = _stakedEth;
        i_stakedTokenAddress = _stakedTokenAddress;
        i_stakedToken = _stakedToken;
        s_racksLogicState = RacksLogicState.OPEN;
    }

    modifier notOwner() {
        require(msg.sender != i_owner, "notOwner:YouAreTheOrganizer");
        _;
    }

    function requestRandomWords() public notOwner returns (uint256 requestId) {
        s_racksLogicState = RacksLogicState.CALCULATING;
        requestId = i_vrfCoordinatorV2.requestRandomWords(
            i_keyHash,
            i_subcriptionId,
            REQUEST_CONFIRMATION,
            CALLBACK_GASLIMIT,
            NUM_WORDS
        );
    }

    function fulfillRandomWords(
        uint256, /*resquestId*/
        uint256[] memory randomWords
    ) internal override {
        s_randomNumberGot = randomWords[0].mod(i_randomNumberInterval).add(1);
    }

    function enter() external payable notOwner {
        require(msg.value >= i_gateFee, "Enter:msg.value<i_gateFee");
        require(s_racksLogicState == RacksLogicState.OPEN, "Enter:StateNotOpen");

        s_totaledEthEntered += msg.value;

        address payable addr = payable(address(i_keeperAddress));

        (bool success, ) = addr.call{value: msg.value}("");
        if (!success) {
            revert RacksLogic__EnteredEthFailed();
        }

        uint256 request = requestRandomWords();

        require(s_randomNumberGot != 0, "Enter:s_randomNumberGot>0");

        s_randomNumberGotten = false;

        if (s_randomNumberGot == i_randomNumber) {
            s_sendRequest[msg.sender] = true;
            s_randomNumberGotten = true;
            requestWithdraw();
            // keeperAddress.isAllowed();
            s_ethToTranfer = _amtToTransfer(i_stakedEth);
            s_tokenToTransfer = _amtToTransfer(i_stakedToken);
            s_totaledEthEntered = 0;
        }

        emit LogRaffleEntered(i_owner, msg.sender, msg.value, s_randomNumberGot, request);
    }

    function requestWithdraw() public {
        if (s_sendRequest[msg.sender]) {
            s_requestedWithdrawals[msg.sender] = RequestedWithdrawal({time: block.timestamp});
        }
    }

    function windrawPrice() external {
        if (
            block.timestamp > s_requestedWithdrawals[msg.sender].time + PRICE_WITHDRAW_WAIT_PERIOD
        ) {
            _withdrawEth();
            _withdrawToken();
        }
    }

    function _withdrawEth() private {
        i_keeperAddress.unsafeTransferEth(msg.sender, s_ethToTranfer);
    }

    function _withdrawToken() private {
        i_keeperAddress.unsafeTransferToken(i_stakedTokenAddress, msg.sender, s_tokenToTransfer);
    }

    function _amtToTransfer(uint256 _amount) private pure returns (uint256) {
        uint256 amount = (_amount * 35) / 1000;
        return _amount - amount;
    }

    function getRandomNumberGotten() external view returns (bool) {
        return s_randomNumberGotten;
    }

    function getTotaledEthEntered() external view returns (uint256) {
        return s_totaledEthEntered;
    }

    function getStackedEth() external view returns (uint256) {
        return i_stakedEth;
    }
}
