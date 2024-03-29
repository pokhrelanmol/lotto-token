import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { formatEther, parseEther } from "ethers/lib/utils";
import { Lotto } from "../typechain-types";
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
        it("_lottoTransfer: Should trigger swapBack function if shouldSwapBack is true", async () => {
            const { lotto, owner, otherAccount, dev1 } = await loadFixture(
                deployLotto
            );

            await lotto.setSwapBackSettings(true); // enable swapBack(only owner can do this)
            await lotto.launch(); // launch the lottery (only owner can do this)
            await lotto.transfer(lotto.address, parseEther("0.3")); // amount of lotto contract holds
            // Now with this varaibles we can simulate the swapback function on transfer
            await expect(lotto.transfer(otherAccount.address, parseEther("1")))
                .to.be.reverted;
            // TODO:  I want to test this more throughly
        });
    });
    describe("SetTxLimit", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).setTxLimit(parseEther("100000"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should  set maxTxLimit if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.setTxLimit(parseEther("10000")); // 1% of total supply
            expect(await lotto.maxTxAmount()).to.equal(parseEther("10000"));
        });
    });

    describe("SetWalletLimit", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).setMaxWallet(parseEther("10000"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should  set maxWalletLimit if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.setMaxWallet(parseEther("10000")); // 1% of total supply
            expect(await lotto.maxWallet()).to.equal(parseEther("10000"));
        });
    });
    describe("SetIsTaxExempt", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).setIsTaxExempt(dev1.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should set isTaxExempt to true if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.setIsTaxExempt(owner.address, true);
            expect(await lotto.isTaxExempt(owner.address)).to.equal(true);
        });
    });
    describe("SetIsTxLimitExempt", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).setIsTxLimitExempt(dev1.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should set isTxLimitExempt to true if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.setIsTxLimitExempt(owner.address, true);
            expect(await lotto.isTxLimitExempt(owner.address)).to.equal(true);
        });
    });
    describe("SetSwapBackSettings", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).setSwapBackSettings(true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should set swapEnabled to true if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.setSwapBackSettings(true);
            expect(await lotto.swapEnabled()).to.equal(true);
        });
    });
    describe("GetCirculatingSupply", () => {
        it("Should return the correct circulating supply", async () => {
            const { lotto } = await loadFixture(deployLotto);

            expect(await lotto.getCirculatingSupply()).to.equal(
                parseEther("1000000")
            );
        });
    });
    describe("RenounceOwnership", () => {
        it("Should revert if caller is not owner", async () => {
            const { lotto, dev1 } = await loadFixture(deployLotto);
            await expect(
                lotto.connect(dev1).renounceOwnership()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should renounceOwnership if caller is owner", async () => {
            const { lotto, owner } = await loadFixture(deployLotto);
            await lotto.renounceOwnership();
            expect(await lotto.owner()).to.equal(ethers.constants.AddressZero);
        });
    });
});
