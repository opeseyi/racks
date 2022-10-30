import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "dotenv/config";
import "solidity-coverage";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
// import '@nomicfoundation/hardhat-toolbox';
// import 'ethereum-waffle';
// UNCOMMENT
import "hardhat-deploy-ethers";

const GOERLI_RPC_URL = process.env.GOERLI_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    solidity: "0.8.16",
    networks: {
        hardhat: {
            chainId: 31337,
            saveDeployments: true,
        },
        localhost: {
            chainId: 31337,
            saveDeployments: true,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 5,
        },
    },

    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
        player: {
            default: 1,
        },
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
    },
    mocha: {
        timeout: 200000,
    },
};

export default config;
