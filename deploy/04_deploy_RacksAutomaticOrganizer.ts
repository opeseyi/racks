import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployingRacksAutomaticOrganizer: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, ethers, network } = hre;
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("Deploying racksAutomaticOrganizer");

    const racksAutomaticOrganizer = await deploy("RacksAutomaticOrganizer", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 1,
    });

    console.log("Deployed racksAutomaticOrganizer");
};

export default deployingRacksAutomaticOrganizer;
deployingRacksAutomaticOrganizer.tags = ["all", "racksAutomaticOrganizer"];
