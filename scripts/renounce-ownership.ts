import { ethers } from "hardhat";

async function main() {
    const [owner, newOwner] = await ethers.getSigners();
    const lotto = await ethers.getContractAt(
        "Lotto",
        "0x05a237D9bFF88df308A9d0b909F5feFA08E63181" // put deployed address here
    );
    console.log("Changing Ownership to: ", newOwner.address);
    const tx = await lotto.renounceOwnership();
    tx.wait();
    //     this will leave contract with no owner if you want to transfer ownership to another address use transferOwnership
    console.log("New owner: ", await lotto.owner());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
