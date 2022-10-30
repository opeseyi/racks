import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployTestToken: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers, network } = hre;
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("Deploying TestToken");

    const testToken = await deploy("TestToken", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 1,
    });

    console.log("Deployed TestToken");
};

export default deployTestToken;
deployTestToken.tags = ["all", "testToken"];
