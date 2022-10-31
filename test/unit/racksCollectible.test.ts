import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect, should } from "chai";
import { Console } from "console";
import { setFips } from "crypto";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat.config";
import { BasicNFT, RacksCollectible, RacksKeeper, TestToken } from "../../typechain-types";

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
          let vrfCoordinatorV2MockAddress: string | undefined;
          let keyHash: string | undefined;
          let callbackGaslimit: string | undefined;
          const FUND_AMOUNT = "100000000000000000000";

          before(async () => {
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
              const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
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
                  const subIdInContract = await racksCollectible.gasSubcriptionId();
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
                  expect(racksCollectible.getEth()).to.be.revertedWith("GE:msg.value<=0");
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
                  expect(getEth).to.emit(racksCollectible, "LogEthStacked");
              });
          });
          describe("Get Token Function", () => {
              it("Should revert if token address is zero", async () => {
                  const zeroAddress = ethers.constants.AddressZero;
                  const tokenAddress = testToken.address;

                  //   expect(zeroAddress != tokenAddress);
                  assert.notEqual(zeroAddress, tokenAddress);

                  expect(
                      racksCollectible.getToken(tokenAddress, AMOUNTGREATERTHANZERO)
                  ).to.be.revertedWith("GT:tokenAddrinvalid");
              });
              it("Should revert if amount is less than zero", async () => {
                  const tokenAddress = testToken.address;

                  expect(racksCollectible.getToken(tokenAddress, AMOUNT)).to.be.revertedWith(
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
                  expect(getToken).to.emit(racksCollectible, "LogTokenStacked");
              });
          });
          describe("Get Nft Function", () => {
              it("Should revert if nftAddress is equal to zero", async () => {
                  const zeroAddress = ethers.constants.AddressZero;
                  await testNft.mintNft();
                  const tokenId = await testNft.getTokenCounter();

                  expect(
                      racksCollectible.getNft(zeroAddress, tokenId.toString())
                  ).to.be.revertedWith("GN:InvalidAddr");
              });
              it("Should revert if token is not owner", async () => {
                  const [deployer, player] = accounts;
                  await testNft.connect(player).mintNft();
                  const tokenId = await testNft.connect(player).getTokenCounter();

                  expect(
                      racksCollectible.getNft(testNft.address, tokenId.toString())
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
                  expect(owner2 != owner);
              });
              it("Should Emit an event after getNft is successfull", async () => {
                  await testNft.mintNft();
                  const tokenId = await testNft.getTokenCounter();
                  const tokenIdInNUmber = tokenId.toNumber() - 1;

                  testNft.approve(racksCollectible.address, tokenIdInNUmber);

                  expect(racksCollectible.getNft(testNft.address, tokenIdInNUmber)).to.emit(
                      racksCollectible,
                      "LogNftStaked"
                  );
              });
          });
          describe("Set Interval", () => {
              it("Should revert if _interval is zero", async () => {
                  expect(racksCollectible.setTIme(0)).to.be.revertedWith("ST:_interval<0");
              });
              it("Should set the interval storage variable", async () => {
                  await racksCollectible.setTIme(10);
                  const getINterval = await racksCollectible.getInterval();
                  assert.equal(getINterval.toString(), "10");
              });
              it("Should emit an event", async () => {
                  expect(racksCollectible.setTIme(10)).to.emit(racksCollectible, "LogTimeSet");
              });
          });
      });
