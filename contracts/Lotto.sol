// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/ICamelotFactory.sol";
import "./interfaces/ ICamelotRouter.sol";
import "hardhat/console.sol";

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint256) external;
}

contract Lotto is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address payable;

    uint256 public maxTxAmount;
    uint256 public maxWallet;
    bool public swapEnabled = true;
    bool public inSwap;
    uint256 private constant taxDenominator = 10000;
    uint256 public launchedAt;
    uint256 public launchedAtTimestamp;
    bool public initialized;

    mapping(address => bool) public isTaxExempt;
    mapping(address => bool) public isTxLimitExempt;
    mapping(address => bool) public canAddLiquidityBeforeLaunch;

    //     Buy Tax or tax that will incur if you want to buy the token
    uint256 public jackpotTaxBuy = 600;
    uint256 public marketingTaxBuy = 200;
    uint256 public rushPoolTaxBuy = 100;
    uint256 public devOneTaxBuy = 100;
    uint256 public devTwoTaxBuy = 100;
    uint256 public devThreeTaxBuy = 100;
    uint256 public totalTaxBuy = 1300;
    //     Sell Tax or tax that will incur if you want to sell the token
    uint256 public jackpotTaxSell = 600;
    uint256 public marketingTaxSell = 200;
    uint256 public rushPoolTaxSell = 100;
    uint256 public devOneTaxSell = 100;
    uint256 public devTwoTaxSell = 100;
    uint256 public devThreeTaxSell = 100;
    uint256 public totalTaxSell = 1300;

    // private variables
    uint256 private jackpotTax;
    uint256 private liquidityTax;
    uint256 private marketingTax;
    uint256 private rushPoolTax;
    uint256 private devOneTax;
    uint256 private devTwoTax;
    uint256 private devThreeTax;
    uint256 private totalTax;
    //     Tax receivers
    address payable private marketingWallet;
    address payable public jackpotWallet;
    address payable private rushPoolWallet;
    address payable private devOneWallet;
    address payable private devTwoWallet;
    address payable private devThreeWallet;

    //      External contracts
    ICamelotFactory private immutable factory =
        ICamelotFactory(0x6EcCab422D763aC031210895C81787E87B43A652);
    ICamelotRouter private immutable swapRouter =
        ICamelotRouter(0xc873fEcbd354f5A56E00E710B90EF4201db2448d);
    IWETH private immutable WETH =
        IWETH(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);

    address public pair;

    // modifier
    modifier swapping() {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor(
        address _marketingWallet,
        address _jackpotWallet,
        address _rushPoolWallet,
        address _devOneWallet,
        address _devTwoWallet,
        address _devThreeWallet
    ) ERC20("Lotto", "LOTTO") {
        uint256 _totalSupply = 1_000_000 * 1e18; // 1 million
        marketingWallet = payable(_marketingWallet);
        jackpotWallet = payable(_jackpotWallet);
        rushPoolWallet = payable(_rushPoolWallet);
        devOneWallet = payable(_devOneWallet);
        devTwoWallet = payable(_devTwoWallet);
        devThreeWallet = payable(_devThreeWallet);
        // set txAmount
        maxTxAmount = (_totalSupply * 1) / 100;
        maxWallet = (_totalSupply * 1) / 100; //1%
        canAddLiquidityBeforeLaunch[_msgSender()] = true;
        canAddLiquidityBeforeLaunch[address(this)] = true;
        isTaxExempt[msg.sender] = true;
        isTxLimitExempt[msg.sender] = true;
        isTaxExempt[address(this)] = true;
        isTxLimitExempt[address(this)] = true;
        _mint(_msgSender(), _totalSupply);
    }

    function initailizePair() external onlyOwner {
        require(!initialized, "Pair already initailized");
        pair = factory.createPair(address(WETH), address(this)); // create weth - latto pair
        initialized = true;
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return _lottoTransfer(_msgSender(), to, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(sender, spender, amount);
        return _lottoTransfer(sender, recipient, amount);
    }

    function _lottoTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        if (inSwap) {
            _transfer(sender, recipient, amount);
            return true;
        }
        if (!canAddLiquidityBeforeLaunch[sender]) {
            require(launched(), "Trading not open yet");
        }
        checkWalletLimit(recipient, amount);
        checkTxLimit(sender, amount);
        // Set taxes
        if (sender == pair) {
            buyTaxes();
        }
        if (recipient == pair) {
            sellTaxes();
        }
        if (shouldSwapBack()) {
            swapBack();
        }
        uint256 amountReceived = shouldTakeTax(sender)
            ? takeTax(sender, amount)
            : amount;
        _transfer(sender, recipient, amountReceived);
        return true;
    }

    // Internal Functions
    function shouldSwapBack() internal view returns (bool) {
        return
            !inSwap &&
            swapEnabled &&
            launched() &&
            balanceOf(address(this)) > 0 &&
            _msgSender() != pair;
    }

    function swapBack() internal swapping {
        uint256 taxAmount = balanceOf(address(this));
        _approve(address(this), address(swapRouter), taxAmount);
        console.log("Should swapback");
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = address(WETH);

        uint256 balanceBefore = address(this).balance;
        swapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            taxAmount,
            0,
            path,
            address(this),
            address(0),
            block.timestamp
        );
        console.log(address(this).balance);
        uint256 amountETH = address(this).balance - balanceBefore;

        uint256 amountETHJackpot = (amountETH * jackpotTax) / (totalTax);
        uint256 amountETHMarketing = (amountETH * marketingTax) / totalTax;
        uint256 amountETHRushPool = (amountETH * rushPoolTax) / totalTax;
        uint256 amountETHDevOne = (amountETH * devOneTax) / totalTax;
        uint256 amountETHDevTwo = (amountETH * devTwoTax) / totalTax;
        uint256 amountETHDevThree = amountETH -
            amountETHJackpot -
            amountETHMarketing -
            amountETHRushPool -
            amountETHDevOne -
            amountETHDevTwo; // remaining ETH

        payable(jackpotWallet).sendValue(amountETHJackpot);
        payable(marketingWallet).sendValue(amountETHMarketing);
        payable(rushPoolWallet).sendValue(amountETHRushPool);
        payable(devOneWallet).sendValue(amountETHDevOne);
        payable(devTwoWallet).sendValue(amountETHDevTwo);
        payable(devThreeWallet).sendValue(amountETHDevThree);
    }

    function launched() internal view returns (bool) {
        return launchedAt != 0;
    }

    function buyTaxes() internal {
        jackpotTax = jackpotTaxBuy;
        marketingTax = marketingTaxBuy;
        rushPoolTax = rushPoolTaxBuy;
        devOneTax = devOneTaxBuy;
        devTwoTax = devTwoTaxBuy;
        devThreeTax = devThreeTaxBuy;
        totalTax = totalTaxBuy;
    }

    function sellTaxes() internal {
        jackpotTax = jackpotTaxSell;
        marketingTax = marketingTaxSell;
        rushPoolTax = rushPoolTaxSell;
        devOneTax = devOneTaxSell;
        devTwoTax = devTwoTaxSell;
        devThreeTax = devThreeTaxSell;
        totalTax = totalTaxSell;
    }

    function shouldTakeTax(address sender) internal view returns (bool) {
        return !isTaxExempt[sender] && launched();
    }

    function takeTax(
        address sender,
        uint256 amount
    ) internal returns (uint256) {
        uint256 taxAmount = (amount * totalTax) / taxDenominator;
        _transfer(sender, address(this), taxAmount);
        return amount - taxAmount;
    }

    function checkWalletLimit(address recipient, uint256 amount) internal view {
        address DEAD = 0x000000000000000000000000000000000000dEaD;
        if (
            recipient != owner() &&
            recipient != address(this) &&
            recipient != address(DEAD) &&
            recipient != pair
        ) {
            uint256 heldTokens = balanceOf(recipient);
            require(
                (heldTokens + amount) <= maxWallet,
                "Total Holding is currently limited, you can not buy that much."
            );
        }
    }

    function checkTxLimit(address sender, uint256 amount) internal view {
        require(
            amount <= maxTxAmount || isTxLimitExempt[sender],
            "TX Limit Exceeded"
        );
    }

    /**
     * ADMIN FUNCTIONS **
     */
    function launch() public onlyOwner {
        require(launchedAt == 0, "Already launched");
        launchedAt = block.number;
        launchedAtTimestamp = block.timestamp;
    }

    function setBuyTaxes(
        uint256 _jackpotTax,
        uint256 _marketingTax,
        uint256 _rushPoolTax,
        uint256 _devOneTax,
        uint256 _devTwoTax,
        uint256 _devThreeTax
    ) external onlyOwner {
        jackpotTaxBuy = _jackpotTax;
        marketingTaxBuy = _marketingTax;
        rushPoolTaxBuy = _rushPoolTax;
        devOneTaxBuy = _devOneTax;
        devTwoTaxBuy = _devTwoTax;
        devThreeTaxBuy = _devThreeTax;
        totalTaxBuy =
            _jackpotTax +
            (_marketingTax) +
            (_rushPoolTax) +
            (_devOneTax) +
            (_devTwoTax) +
            (_devThreeTax);
    }

    function setSellTaxes(
        uint256 _jackpotTax,
        uint256 _marketingTax,
        uint256 _rushPoolTax,
        uint256 _devOneTax,
        uint256 _devTwoTax,
        uint256 _devThreeTax
    ) external onlyOwner {
        jackpotTaxSell = _jackpotTax;
        marketingTaxSell = _marketingTax;
        rushPoolTaxSell = _rushPoolTax;
        devOneTaxSell = _devOneTax;
        devTwoTaxSell = _devTwoTax;
        devThreeTaxSell = _devThreeTax;
        totalTaxSell =
            _jackpotTax +
            (_marketingTax) +
            (_rushPoolTax) +
            (_devOneTax) +
            (_devTwoTax) +
            (_devThreeTax);
    }

    function setTaxReceivers(
        address _marketingWallet,
        address _jackpotWallet,
        address _rushPoolWallet,
        address _devOneWallet,
        address _devTwoWallet,
        address _devThreeWallet
    ) external onlyOwner {
        marketingWallet = payable(_marketingWallet);
        jackpotWallet = payable(_jackpotWallet);
        rushPoolWallet = payable(_rushPoolWallet);
        devOneWallet = payable(_devOneWallet);
        devTwoWallet = payable(_devTwoWallet);
        devThreeWallet = payable(_devThreeWallet);
    }

    function setMaxWallet(uint256 amount) external onlyOwner {
        require(amount >= totalSupply() / 100); //1%
        maxWallet = amount;
    }

    function setTxLimit(uint256 amount) external onlyOwner {
        require(amount >= totalSupply() / 100); //1%
        maxTxAmount = amount;
    }

    function setIsTaxExempt(address holder, bool exempt) external onlyOwner {
        isTaxExempt[holder] = exempt;
    }

    function setIsTxLimitExempt(
        address holder,
        bool exempt
    ) external onlyOwner {
        isTxLimitExempt[holder] = exempt;
    }

    function setSwapBackSettings(bool _enabled) external onlyOwner {
        swapEnabled = _enabled;
    }

    // Stuck Balances Functions
    function rescueToken(address tokenAddress) external onlyOwner {
        IERC20(tokenAddress).safeTransfer(
            msg.sender,
            IERC20(tokenAddress).balanceOf(address(this))
        );
    }

    function clearStuckBalance() external onlyOwner {
        uint256 amountETH = address(this).balance;
        payable(_msgSender()).sendValue(amountETH);
    }

    function getCirculatingSupply() public view returns (uint256) {
        address DEAD = 0x000000000000000000000000000000000000dEaD;
        address ZERO = 0x0000000000000000000000000000000000000000;
        return totalSupply() - balanceOf(DEAD) - balanceOf(ZERO);
    }

    receive() external payable {}
}
