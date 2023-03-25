import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
    solidity: "0.8.18",
    networks: {
        hardhat: {
            forking: {
                url: process.env.ARBITRUM_MAINNET_RPC_URL as string,
            },
        },
        // arbitrum: {
        //     url: process.env.ARBITRUM_MAINNET_RPC_URL as string,
        //     accounts: [process.env.PRIVATE_KEY as string],
        // },
    },
};

export default config;
