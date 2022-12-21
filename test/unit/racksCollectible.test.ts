import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { Console } from "console";
import { setFips } from "crypto";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat.config";
import {
    BasicNFT,
    RacksCollectible,
    RacksKeeper,
    TestToken,
    VRFCoordinatorV2Mock,
} from "../../typechain-types";

const AMOUNT = ethers.utils.parseEther("0");
const AMOUNTGREATERTHANZERO = ethers.utils.parseEther("1");
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RacksCollectible Test", () => {
          let accounts: SignerWithAddress[];
          let racksCollectible: RacksCollectible;
          let racksKeeper: RacksKeeper;
          let testToken: TestToken;
          let testNft: BasicNFT;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let vrfCoordinatorV2MockAddress: string | undefined;
          let keyHash: string | undefined;
          let callbackGaslimit: string | undefined;
          //   let keeperAddress: any;
          const FUND_AMOUNT = "100000000000000000000";

          beforeEach(async () => {
              // ACCOUNTS
              accounts = await ethers.getSigners();
              //   GET TESTNFT
              await deployments.fixture(["basicnft"]);
              testNft = await ethers.getContract("BasicNFT");
              //   KEEPER
              await deployments.fixture(["keeper"]);
              racksKeeper = await ethers.getContract("RacksKeeper");
              //   DEPLOY ALL
              await deployments.fixture(["all"]);
              //   GET RACKSCOLLECTIBLE
              racksCollectible = await ethers.getContract("RacksCollectible");
              //   GET TESTTOKEN
              testToken = await ethers.getContract("TestToken");
              // GET VRFCOORDINORMOCK
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
              vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;

              keyHash = networkConfig[network.config.chainId!]["keyHash"];
              callbackGaslimit = networkConfig[network.config.chainId!]["callbackGasLimit"];
          });

          describe("Constructor", () => {
              it("Initialice Constructor", async () => {
                  const keeperAddress = racksKeeper.address;
                  const vrfCoordinatorV2 = vrfCoordinatorV2MockAddress;
                  const kHash = keyHash;
                  const cbGl = callbackGaslimit;
                  const args = [keeperAddress, vrfCoordinatorV2, kHash, cbGl];

                  const keeperInContract = await racksCollectible.getKeeperAddress();
                  const vrfCoordinatorV2InContract = await racksCollectible.getVrfCoordinatorV2();
                  const subIdInContract = await racksCollectible.getSubcriptionId();
                  const kHashInContract = await racksCollectible.getKeyHash();
                  const cbGlInContract = await racksCollectible.getCallbackGaslimit();

                  assert.equal(args[0], keeperInContract);
                  assert.equal(args[1], vrfCoordinatorV2InContract);
                  assert.equal("1", subIdInContract.toString());
                  assert.equal(args[2], kHashInContract);
                  assert.equal(args[3], cbGlInContract.toString());
                  assert.equal(args.length, 4);
              });
          });

          describe("Get Eth Function", () => {
              it("Should revert if amount is less than zero", async () => {
                  await expect(racksCollectible.getEth()).to.be.revertedWith("GE:msg.value<=0");
              });
              it("Initializes the stakeEth variable", async () => {
                  const stakeEthBegining = await racksCollectible.getStakedEth();
                  await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });
                  const stakedEthEnd = await racksCollectible.getStakedEth();

                  assert.equal("0", stakeEthBegining.toString());
                  assert.equal(AMOUNTGREATERTHANZERO.toString(), stakedEthEnd.toString());
              });
              it("Transfers staked amount to keepers contract", async () => {
                  const keeperInitial = await racksKeeper.getBalance();
                  const sender = await accounts[0];
                  const senderInitial = await sender.getBalance();
                  const senderInitialParsed = ethers.utils.formatEther(senderInitial);

                  const getEth = await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });

                  const keeperFinal = await racksKeeper.getBalance();
                  console.log(keeperFinal);
                  //   const sender = await accounts[0];
                  const senderFinal = await sender.getBalance();
                  console.log(senderFinal);
                  const senderFinalParsed = ethers.utils.formatEther(senderFinal);
                  console.log(senderFinalParsed);
              });

              it("Should emit an event", async () => {
                  const getEth = await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });
                  await expect(getEth).to.emit(racksCollectible, "LogEthStacked");
              });
          });
          describe("Get Token Function", () => {
              it("Should revert if token address is zero", async () => {
                  const zeroAddress = ethers.constants.AddressZero;
                  const tokenAddress = testToken.address;

                  await testToken.approve(racksCollectible.address, 10);

                  //   await expect(zeroAddress != tokenAddress);
                  assert.notEqual(zeroAddress, tokenAddress);

                  await expect(
                      racksCollectible.getToken(zeroAddress, AMOUNTGREATERTHANZERO)
                  ).to.be.revertedWith("GT:tokenAddrinvalid");
              });
              it("Should revert if amount is less than zero", async () => {
                  const tokenAddress = testToken.address;

                  await expect(racksCollectible.getToken(tokenAddress, AMOUNT)).to.be.revertedWith(
                      "GT:amount<=0"
                  );
              });
              it("Should transfer token to keepers", async () => {
                  const tokenAddress = testToken.address;

                  const ttInitialSigner = await testToken.balanceOf(accounts[0].address);
                  console.log(ttInitialSigner.toString());
                  const ttInitialContract = await testToken.balanceOf(racksKeeper.address);
                  console.log(ttInitialContract.toString());

                  //   await testToken.transfer(racksCollectible.address, 10);

                  //   const withToken = await racksCollectible.connect(accounts[0]);
                  const approve = await testToken.approve(racksCollectible.address, 1);
                  const getToken = await racksCollectible.getToken(tokenAddress, 1);

                  const ttFinalSigner = await testToken.balanceOf(accounts[0].address);
                  console.log(ttFinalSigner.toString());
                  const ttFinalContract = await testToken.balanceOf(racksKeeper.address);
                  console.log(ttFinalContract.toString());
              });

              it("Should emit an event", async () => {
                  const tokenAddress = testToken.address;

                  const approve = await testToken.approve(racksCollectible.address, 1);
                  const getToken = await racksCollectible.getToken(tokenAddress, 1);
                  await expect(getToken).to.emit(racksCollectible, "LogTokenStacked");
              });
          });
          describe("Get Nft Function", () => {
              it("Should revert if nftAddress is equal to zero", async () => {
                  const zeroAddress = ethers.constants.AddressZero;
                  await testNft.mintNft();
                  const tokenId = await testNft.getTokenCounter();

                  await expect(
                      racksCollectible.getNft(zeroAddress, tokenId.toString())
                  ).to.be.revertedWith("GN:InvalidAddr");
              });
              it("Should revert if token is not owner", async () => {
                  const [deployer, player] = accounts;
                  await testNft.connect(player).mintNft();
                  const tokenId = await testNft.connect(player).getTokenCounter();

                  await expect(
                      racksCollectible.getNft(testNft.address, tokenId.toNumber() - 1)
                  ).to.be.revertedWith("GN:NotOwner");
              });
              it("Should transfer nft to keeper", async () => {
                  const [deployer, player] = accounts;
                  await testNft.mintNft();
                  const tokenId = await testNft.getTokenCounter();
                  const tokenIdInNUmber = tokenId.toNumber() - 1;
                  const owner = await testNft.ownerOf(tokenIdInNUmber);
                  assert.equal(deployer.address, owner.toString());

                  testNft.approve(racksCollectible.address, tokenIdInNUmber);

                  await racksCollectible.getNft(testNft.address, tokenIdInNUmber);

                  const owner2 = await testNft.ownerOf(tokenIdInNUmber);
                  assert.equal(racksKeeper.address, owner2.toString());
                  await expect(owner2 != owner);
              });
              it("Should Emit an event after getNft is successfull", async () => {
                  await testNft.mintNft();
                  const tokenId = await testNft.getTokenCounter();
                  const tokenIdInNUmber = tokenId.toNumber() - 1;

                  testNft.approve(racksCollectible.address, tokenIdInNUmber);

                  await expect(racksCollectible.getNft(testNft.address, tokenIdInNUmber)).to.emit(
                      racksCollectible,
                      "LogNftStaked"
                  );
              });
          });
          describe("Set Interval", () => {
              it("Should revert if _interval is zero", async () => {
                  await expect(racksCollectible.setTIme(0)).to.be.revertedWith("ST:_interval<0");
              });
              it("Should set the interval storage variable", async () => {
                  await racksCollectible.setTIme(10);
                  const getINterval = await racksCollectible.getInterval();
                  assert.equal(getINterval.toString(), "10");
              });
              it("Should emit an event", async () => {
                  await expect(racksCollectible.setTIme(10)).to.emit(
                      racksCollectible,
                      "LogTimeSet"
                  );
              });
          });
          describe("Checkupkeep", () => {
              it("SHould return false if racks isnt open", async () => {
                  const interval = 30;
                  const setInterval = await racksCollectible.setTIme(interval);
                  await network.provider.send("evm_increaseTime", [interval + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  //   await racksCollectible.performUpkeep("0x");
                  const racksCollectibleState = await racksCollectible.getRacksCollectibleState();
                  const { upkeepNeeded } = await racksCollectible.callStatic.checkUpkeep("0x");

                  assert.equal(racksCollectibleState.toString() == "1", upkeepNeeded == false);
              });
              it("Should return false if enough time hasn't pass", async () => {
                  const interval = 30;
                  const setInterval = await racksCollectible.setTIme(interval);
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });
                  await racksCollectible.createRaffle(AMOUNTGREATERTHANZERO);
                  //   await racksCollectible.performUpkeep("0x");
                  const racksCollectibleState = await racksCollectible.getRacksCollectibleState();
                  const { upkeepNeeded } = await racksCollectible.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });
              it("Should return true if enough time has pass", async () => {
                  const interval = 30;
                  await racksCollectible.setTIme(interval);
                  await network.provider.send("evm_increaseTime", [interval + 5]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });
                  await racksCollectible.createRaffle(AMOUNTGREATERTHANZERO);
                  //   await racksCollectible.performUpkeep("0x");
                  const racksCollectibleState = await racksCollectible.getRacksCollectibleState();
                  console.log(racksCollectibleState);
                  const { upkeepNeeded } = await racksCollectible.callStatic.checkUpkeep("0x");
                  assert.equal(upkeepNeeded, true);
              });
          });
          describe("PerformUpkkep", () => {
              it("Should only run if checkupkeep is true", async () => {
                  const interval = 30;
                  const setInterval = await racksCollectible.setTIme(interval);
                  await racksCollectible.getEth({ value: AMOUNTGREATERTHANZERO });
                  await racksCollectible.createRaffle(AMOUNTGREATERTHANZERO);
                  await network.provider.send("evm_increaseTime", [interval + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await racksCollectible.performUpkeep("0x");
                  assert(tx);
              });
              //   it("Should revert if checkup is false", async () => {
              //       await expect(racksCollectible.performUpkeep("0x")).to.be.revertedWith(
              //           "RacksCollectible__UpkeepNotNeeded"
              //       );
              //   });
          });
          describe("Request random word", () => {
              it("Get return requestId", async () => {
                  const subscriptionId = await racksCollectible.getSubcriptionId();

                  await vrfCoordinatorV2Mock.addConsumer(subscriptionId, racksCollectible.address);
                  await racksCollectible.setRandomNumber(30);
                  const transactionResponse = await racksCollectible.requestRandomWords();
                  const transactionReceipt = await transactionResponse.wait(1);
                  const randomWords = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      transactionReceipt!.events![1]!.args!.requestId,
                      racksCollectible.address
                  );
                  const requestId = await racksCollectible.getRandomNumberNumber();
                  console.log(requestId.toString());
              });
          });
          describe("Play game", () => {
              it("Start Game", async () => {
                  console.log("Stacking eth");
                  const ethToStake = ethers.utils.parseEther("10");
                  await racksCollectible.getEth({ value: ethToStake });

                  console.log("Stacking Token");
                  const tokenToStake = 100;
                  await testToken.approve(racksCollectible.address, tokenToStake);
                  await racksCollectible.getToken(testToken.address, tokenToStake);

                  console.log("Stacking Nft");
                  await testNft.mintNft();
                  const tokenId: any = await testNft.getTokenCounter();
                  await testNft.approve(racksCollectible.address, tokenId.toNumber() - 1);
                  await racksCollectible.getNft(testNft.address, tokenId.toNumber() - 1);

                  console.log("Set time interval");
                  const interval = 30;
                  const setInterval = await racksCollectible.setTIme(interval);

                  console.log("Setting random number limit");
                  const randomNumber = 50;
                  const setLimit = await racksCollectible.setRandomNumber(randomNumber);

                  console.log("Getting random words");
                  const subscriptionId = await racksCollectible.getSubcriptionId();

                  await vrfCoordinatorV2Mock.addConsumer(subscriptionId, racksCollectible.address);
                  const transactionResponse = await racksCollectible.requestRandomWords();
                  const transactionReceipt = await transactionResponse.wait(1);
                  const randomWords = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      transactionReceipt!.events![1]!.args!.requestId,
                      racksCollectible.address
                  );
                  const requestId = await racksCollectible.getRandomNumberNumber();
                  console.log(requestId.toString());

                  console.log("creating Raffle");
                  const tenEth = ethers.utils.parseEther("10");
                  await racksCollectible.createRaffle(tenEth);

                  //   const keeperAddress = await racksCollectible.getKeeperAddress();
                  const vrf = await racksCollectible.getVrfCoordinatorV2();
                  console.log(vrf);
                  //   const args: any = [
                  //       keeperAddress,
                  //       testToken.address,
                  //       tenEth,*
                  //       requestId.toNumber(),
                  //       vrf,
                  //       subscriptionId,
                  //       keyHash,
                  //       randomNumber,
                  //       ethToStake,
                  //       tokenId.toNumber() - 1,
                  //   ];
                  //   const racksLogic = await ethers.getContractFactory("RacksLogic");
                  //   const racksLogicContract = racksLogic.deploy(...args);
                  //   //   console.log(await racksLogicContract);
                  //   (await racksLogicContract).enter({ value: AMOUNT });

                  //   const g = (await racksLogicContract).getStackedEth();
                  //   //   console.log((await g).toString());
                  //   assert.equal(tenEth, (await g).toString());
              });
          });
      });
