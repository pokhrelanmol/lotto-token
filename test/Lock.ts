import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lotto", function () {
    async function deployOneYearLockFixture() {
        const Lotto = await ethers.getContractFactory("Lotto");
        const lotto = await Lotto.deploy();
        await lotto.deployed();
    }
});
