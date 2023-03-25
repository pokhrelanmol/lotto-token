import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    const lotto: Lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );
    const to = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // change address here
    const amount = ethers.utils.parseEther("10"); // change amount here
    console.log("Transferring 10 Lotto to ", to);
    const tx = await lotto.transfer(to, amount);
    await tx.wait();
    console.log("Transfer complete...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
