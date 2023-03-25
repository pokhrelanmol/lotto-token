# Lotto Contract

This is the smart contract for the Lotto token, a BEP-20 token built on the Ethereum blockchain. This token allows users to participate in a lottery-style game with a portion of the transaction fees being distributed to holders and to various wallets such as marketing, jackpot, and developer wallets.

## License

This code is licensed under the MIT License. See the `SPDX-License-Identifier` comment in the code for more information.

## Contract Overview

The Lotto contract inherits from the ERC20, Ownable, and ReentrancyGuard contracts. It also uses the SafeERC20 and Address libraries from OpenZeppelin. This contract has the following public functions:

-   `transfer`: transfers tokens from the sender to the recipient.
-   `transferFrom`: transfers tokens from one address to another if the sender has been authorized by the owner.
-   `initializePair`: initializes the token pair on the Camelot Factory.

It also has the following public variables:

-   `maxTxAmount`: the maximum amount of tokens that can be transferred in a single transaction.
-   `maxWallet`: the maximum amount of tokens that can be held in a wallet.
-   `swapEnabled`: a boolean indicating whether swapping is enabled.
-   `inSwap`: a boolean indicating whether a swap is in progress.
-   `isTaxExempt`: a mapping of addresses to boolean values indicating whether they are exempt from transaction taxes.
-   `isTxLimitExempt`: a mapping of addresses to boolean values indicating whether they are exempt from transaction limits.
-   `canAddLiquidityBeforeLaunch`: a mapping of addresses to boolean values indicating whether they can add liquidity before launch.
-   `jackpotTaxBuy`, `marketingTaxBuy`, `rushPoolTaxBuy`, `devOneTaxBuy`, `devTwoTaxBuy`, `devThreeTaxBuy`: the transaction taxes for buying tokens.
-   `totalTaxBuy`: the total transaction tax for buying tokens.
-   `jackpotTaxSell`, `marketingTaxSell`, `rushPoolTaxSell`, `devOneTaxSell`, `devTwoTaxSell`, `devThreeTaxSell`: the transaction taxes for selling tokens.
-   `totalTaxSell`: the total transaction tax for selling tokens.
-   `marketingWallet`: the address of the marketing wallet.
-   `jackpotWallet`: the address of the jackpot wallet.
-   `rushPoolWallet`: the address of the rush pool wallet.
-   `devOneWallet`: the address of the first developer wallet.
-   `devTwoWallet`: the address of the second developer wallet.
-   `devThreeWallet`: the address of the third developer wallet.

## External Contracts

This contract also uses the following external contracts:

-   `ICamelotFactory`: a contract interface for the Camelot Factory.
-   `ICamelotRouter`: a contract interface for the Camelot Router.
-   `IWETH`: a contract interface for the WETH token.
