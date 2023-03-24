import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { LottoTax } from "../typechain-types";
import { formatEther, parseEther } from "ethers/lib/utils";

describe("Lotto", function () {
    async function deployLotto() {
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
        const Lotto = await ethers.getContractFactory("LottoTax");
        const lotto: LottoTax = await Lotto.deploy(
            marketing.address,
            jackpot.address,
            rushPool.address,
            dev1.address,
            dev2.address,
            dev3.address
        );
        await lotto.deployed();
        return {
            owner,
            marketing,
            jackpot,
            rushPool,
            dev1,
            dev2,
            dev3,
            lotto,
            otherAccount,
        };
    }

    describe("Constructor", () => {
        it("should set the correct value on deployement", async () => {
            const {
                owner,
                marketing,
                jackpot,
                rushPool,
                dev1,
                dev2,
                dev3,
                lotto,
            } = await loadFixture(deployLotto);
            expect(await lotto.owner()).to.equal(owner.address);
            expect(
                ethers.utils.formatEther(await lotto.maxTxAmount())
            ).to.equal("10000.0");
            expect(ethers.utils.formatEther(await lotto.maxWallet())).to.equal(
                "10000.0"
            );
            expect(await lotto.canAddLiquidityBeforeLaunch(owner.address)).to.be
                .true;
            expect(await lotto.canAddLiquidityBeforeLaunch(lotto.address)).to.be
                .true;
            expect(await lotto.isTaxExempt(owner.address)).to.be.true;
            expect(await lotto.isTaxExempt(lotto.address)).to.be.true;
            expect(await lotto.isTxLimitExempt(owner.address)).to.be.true;
            //mint token to msg.sender or owner
            expect(await lotto.balanceOf(owner.address)).to.equal(
                ethers.utils.parseEther("1000000")
            );
        });
    });

    describe("InitializePair", () => {
        it("Should revert if not called by owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).initailizePair()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should create a pair and set initialized to true", async () => {
            const { lotto } = await loadFixture(deployLotto);
            await lotto.initailizePair();
            expect(await lotto.pair()).to.not.equal(
                ethers.constants.AddressZero
            );
            console.log("pair address: ", await lotto.pair());
            expect(await lotto.initialized()).to.be.true;
        });
    });
    describe("Transfer and _lottoTransfer", () => {
        it("Should return true if transfer is successful", async () => {
            const { lotto, owner, dev1, otherAccount } = await loadFixture(
                deployLotto
            );
            await lotto.transfer(otherAccount.address, parseEther("10"));

            expect(await lotto.balanceOf(otherAccount.address)).to.equal(
                parseEther("10")
            );
        });

        it("_lottoTransfer:Should not allow random address to add liquidity before launch", async () => {
            const { lotto, otherAccount } = await loadFixture(deployLotto);
            await expect(
                lotto
                    .connect(otherAccount)
                    .transfer(otherAccount.address, parseEther("10"))
            ).to.be.revertedWith("Trading not open yet");
        });
        it("_lottoTransfer:Should allow random address to call transfer after launch", async () => {
            const { lotto, otherAccount } = await loadFixture(deployLotto);
            await lotto.launch();
            await lotto.transfer(otherAccount.address, parseEther("10"));
            await lotto
                .connect(otherAccount)
                .transfer(otherAccount.address, parseEther("10"));
        });
        it("checkWalletLimit:Should revert if recepient wallet balance exceeds max wallet limit", async () => {
            const { lotto, owner, otherAccount } = await loadFixture(
                deployLotto
            );
            await lotto.transfer(otherAccount.address, parseEther("10000")); // transfer maxAmount to recepient
            await expect(
                lotto.transfer(otherAccount.address, parseEther("1")) // try to transfer 1 more
            ).to.be.revertedWith(
                "Total Holding is currently limited, you can not buy that much."
            );
        });

        it("checkTxLimit:Should revert if sender tx amount exceeds max tx limit", async () => {
            const { lotto, owner, otherAccount, dev1 } = await loadFixture(
                deployLotto
            );
            await lotto.launch();

            await expect(
                lotto.transfer(otherAccount.address, parseEther("100001"))
            ).to.be.revertedWith(
                "Total Holding is currently limited, you can not buy that much."
            );
            // I want to check for maxTx limit error but when you pass the amount > maxTx limit it reverts with maxWallet limit error because the recepient wallet balance is already > maxWallet limit
        });
        // it("_lottoTransfer: Should update buyFees if sender = pair", async () => {
        //     const { lotto, owner, otherAccount, dev1 } = await loadFixture(
        //         deployLotto
        //     );
        //     await lotto.launch();
        //     await lotto.initailizePair();
        //     const pair = await lotto.pair();
        //     await lotto.transfer(pair, parseEther("10"));

        // use impersonate account method to send tx from pair
        // await network.provider.request({
        //     method: "hardhat_impersonateAccount",
        //     params: [pair],
        // });
        // const pairSigner = await ethers.getSigner(pair); // get signer for pair
        // await lotto
        //     .connect(pairSigner)
        //     .transfer(otherAccount.address, parseEther("10"));
        // // now this should call buyTaxes function and set the appropriate buyTaxes
        // const totalTax = 1200;
        // const taxAmount = parseEther("10").mul(totalTax).div(1000);
        // });
        it("_lottoTransfer: Should update sellFees if  recepient == pair", async () => {
            const { lotto, owner, otherAccount, dev1 } = await loadFixture(
                deployLotto
            );
            await lotto.initailizePair();
            await lotto.launch();
            const pair = await lotto.pair();
            await lotto.transfer(otherAccount.address, parseEther("10"));
            await lotto.connect(otherAccount).transfer(pair, parseEther("10"));
            // now this should call sellTaxes function and set the appropriate sellTaxes
            const totalTax = 1200;
            // To make this test more robust we need to calculate exchange sell fee and then calculate tax amount

            const taxAmount = parseEther("10").mul(totalTax).div(1000);
            console.log(
                "taxAmount: ",
                formatEther(taxAmount.toString()),
                "ETH"
            );
            console.log(
                "remaining amount: ",
                formatEther(await lotto.balanceOf(pair)),
                "ETH"
            );
            expect(await lotto.balanceOf(pair)).lessThan(parseEther("10"));
        });
    });
});
