import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployKeeper: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    log("Deploying Keeper");

    const args: any[] = [];

    const keeper = await deploy("RacksKeeper", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1,
    });

    log("Deployed Keeper");
};

export default deployKeeper;
deployKeeper.tags = ["all", "keeper"];
