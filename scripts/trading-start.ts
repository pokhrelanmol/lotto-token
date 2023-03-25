import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    const lotto: Lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );

    const tradingStart = await lotto.launchedAt(); // block number when trading started
    if (tradingStart.toString() == "0") {
        console.log("Trading has not started yet");
    } else {
        console.log(
            "Trading started at: ",
            tradingStart.toString(),
            "Block Number"
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
