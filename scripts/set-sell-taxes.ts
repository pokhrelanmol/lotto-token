import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    const lotto: Lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );
    const jackpotTax = 600; // 6%
    const marketingTax = 200; // 6%
    const rushPoolTax = 100; // 1%
    const devOneTax = 100; // 1%
    const devTwoTax = 100; // 1%
    const devThreeTax = 100; // 1%

    console.log("Setting sell taxes...");
    const tx = await lotto.setSellTaxes(
        jackpotTax,
        marketingTax,
        rushPoolTax,
        devOneTax,
        devTwoTax,
        devThreeTax
        //   { gasLimit: 1000000 } // try this if gas limit error
    );
    await tx.wait();
    console.log("sell taxes set...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
