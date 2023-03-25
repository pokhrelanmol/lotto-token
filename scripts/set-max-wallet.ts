import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    const lotto: Lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );
    console.log("Setting Max Wallet Amount...");
    const tx = await lotto.setMaxWallet("10000"); //1% of total supply
    await tx.wait();
    console.log("Max Wallet Amount Set...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
