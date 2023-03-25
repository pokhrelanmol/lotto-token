import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    const lotto: Lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );
    const [marketing, jackpot, rushPool, dev1, dev2, dev3] =
        await ethers.getSigners();
    //     NOTE: Please add your address instead of the following addresses
    const jackpotTaxReceiver = jackpot.address;
    const marketingTaxReceiver = marketing.address;
    const rushPoolTaxReceiver = rushPool.address;
    const devOneTaxReceiver = dev1.address;
    const devTwoTaxReceiver = dev2.address;
    const devThreeTaxReceiver = dev3.address;

    console.log("Setting tax receivers...");
    const tx = await lotto.setTaxReceivers(
        jackpotTaxReceiver,
        marketingTaxReceiver,
        rushPoolTaxReceiver,
        devOneTaxReceiver,
        devTwoTaxReceiver,
        devThreeTaxReceiver
    );
    await tx.wait();
    console.log("tax receivers set...");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
