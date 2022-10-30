import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { setFips } from "crypto";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { RacksCollectible, RacksKeeper, TestToken } from "../../typechain-types";

const AMOUNT = ethers.utils.parseEther("0");
const AMOUNTGREATERTHANZERO = ethers.utils.parseEther("1");
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RacksCollectible Test", () => {
          let accounts: SignerWithAddress[];
          let racksCollectible: RacksCollectible;
          let racksKeeper: RacksKeeper;
          let testToken: TestToken;
          beforeEach(async () => {
              accounts = await ethers.getSigners();
              await deployments.fixture(["all"]);
              racksCollectible = await ethers.getContract("RacksCollectible");
              racksKeeper = await ethers.getContract("RacksKeeper");
              testToken = await ethers.getContract("TestToken");
          });

          describe("Constructor", () => {
              it("Initialice Constructor", async () => {
                  const args = racksKeeper.address;
                  const keeperInContract = await racksCollectible.keeperAddress();

                  assert.equal(args, keeperInContract);
              });
          });

          describe("Get Eth Function", () => {
              it("Should revert if amount is less than zero", async () => {
                  //   const getETh = await racksCollectible.getEth(AMOUNT);
                  expect(racksCollectible.getEth()).to.be.revertedWith(
                      "getToken: Amount should be greater than zero"
                  );
              });
              it("Initializes the stakeEth variable", async () => {
                  const stakeEth = await racksCollectible.stakedEth();
                  assert.equal("0", stakeEth.toString());
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
                  expect(getEth).to.emit(racksCollectible, "EthStacked");
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
                  ).to.be.revertedWith("getToken: Token address == 0");
              });
              it("Should revert if amount is less than zero", async () => {
                  const tokenAddress = testToken.address;

                  expect(racksCollectible.getToken(tokenAddress, AMOUNT)).to.be.revertedWith(
                      "getToken: Amount should be greater than zero"
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
                  expect(getToken).to.emit(racksCollectible, "TokenStacked");
              });
          });
      });
