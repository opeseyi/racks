import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const BASE_FEE = "250000000000000000";
const GAS_PRICE_FEE = 1e9;

const deployVrfCoordinatorMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers, network } = hre;
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    console.log("Deploying VRFCoordinatorV2Mock");
    if (chainId === 31337) {
        const VRFCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_FEE],
            log: true,
            waitConfirmations: 1,
        });
    }

    console.log("Deployed VRFCoordinatorV2Mock");
};

export default deployVrfCoordinatorMocks;
deployVrfCoordinatorMocks.tags = ["all", "mocks"];
