import { ethers } from "hardhat";
import { Lotto } from "../typechain-types";

async function main() {
    // NOTE: Please add your address when deploying to mainnet
    const [
        owner,
        marketing,
        jackpot,
        rushPool,
        dev1,
        dev2,
        dev3,
        otherAccount,
    ] = await ethers.getSigners();
    const Lotto = await ethers.getContractFactory("Lotto");
    const lotto: Lotto = await Lotto.deploy(
        marketing.address,
        jackpot.address,
        rushPool.address,
        dev1.address,
        dev2.address,
        dev3.address
    );
    await lotto.deployed();

    console.log(`Lotto deployed to: ${lotto.address}`);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
