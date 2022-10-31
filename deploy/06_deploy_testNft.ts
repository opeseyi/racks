import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployTestNft: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // log("...................................................");
    const args: any[] = [];

    console.log("Deploying TestNft");

    const basicNfts = await deploy("BasicNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1,
    });

    console.log("Deployed TestNft");
};

export default deployTestNft;
deployTestNft.tags = ["all", "basicnft"];
