// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    function getPrice(AggregatorV3Interface priceFeed) internal view returns (uint256) {
        (, int256 price, ,  , ) = priceFeed.latestRoundData();
        // ETH/USD rate in 18 digit
        return uint256(price * 1e10); // 1**10 = 10000000000
    }

    function getConversionRate(
        uint256 _ethAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(priceFeed);
        uint256 ethAmountInUsd = (ethPrice * _ethAmount) / 1e18;
        return ethAmountInUsd;
    }
}
