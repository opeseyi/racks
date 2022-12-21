import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";

const FUND_AMOUNT = "100000000000000000000";

const deployCollectibles: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers, network } = hre;
    const { log, deploy, fixture } = deployments;
    const { deployer } = await getNamedAccounts();
    // const chainId = network.config.chainId;
    const chainId = 31337;
    // console.log(chainId);
    await fixture(["keeper"]);
    const keeper = await ethers.getContract("RacksKeeper");
    // const keeper = await fixture(["keeper"]);
    const keeperAddress = keeper.address;
    console.log(keeperAddress);
    const keyHash = networkConfig[network.config.chainId!]["keyHash"];
    const callbackGaslimit = networkConfig[network.config.chainId!]["callbackGasLimit"];
    let vrfCoordinatorV2MockAddress;
    let vrfCoordinatorV2Mock: any;
    let subscriptionId;

    if (chainId == 31337) {
        await deployments.fixture(["mocks"]);
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2MockAddress = networkConfig[network.config.chainId!]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"];
    }

    const waitConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    const args: any[] = [
        keeperAddress,
        vrfCoordinatorV2MockAddress,
        subscriptionId,
        keyHash,
        callbackGaslimit,
    ];

    console.log("Deploying collectable");

    const collectable = await deploy("RacksCollectible", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitConfirmations,
    });

    // await vrfCoordinatorV2Mock.addConsumer(subscriptionId, collectable.address);
    console.log(`Deployed collectable at ${collectable.address}`);
};

export default deployCollectibles;
deployCollectibles.tags = ["all", "collectible"];
