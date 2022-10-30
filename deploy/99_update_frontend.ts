import fs from "fs";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { updateCollectible } from "../helper-hardhat.config";

const updateUI: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { network, ethers } = hre;
    const chainId: number | string | undefined = network.config.chainId;

    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to frontend");
        const racksCollectible = await ethers.getContract("RacksCollectible");
        const racksKeeper = await ethers.getContract("RacksKeeper");
        const racksLogic = await ethers.getContract("RacksLogic");

        const racksContractPath = JSON.parse(fs.readFileSync(updateCollectible, "utf8"));
        if (chainId! in racksContractPath) {
            if (!racksContractPath[network.config.chainId!].includes(racksCollectible.address)) {
                racksContractPath[network.config.chainId!].push(racksCollectible.address);
            }
        } else {
            racksContractPath[network.config.chainId!] = [racksCollectible.address];
        }
        fs.writeFileSync(updateCollectible, JSON.stringify(racksContractPath));
        console.log("Collectible Written to frontend");
    }
};

export default updateUI;
updateUI.tags = ["all", "frontend"];
