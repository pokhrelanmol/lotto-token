import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
    solidity: "0.8.18",
    networks: {
        hardhat: {
            forking: {
                url: process.env.ARBITRUM_RPC_URL as string,
            },
        },
    },
};

export default config;
