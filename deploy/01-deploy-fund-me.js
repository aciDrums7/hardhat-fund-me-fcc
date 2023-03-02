/* function deployFunc(hre) {
    console.log("hi!")
    hre.getNamedAccounts()
    hre.getDeployments()
}

// calling of main function
module.exports.default = deployFunc */

const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    // const { getNamedAccounts, deployments } = hre
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // if chainId is X use address Y
    // if chainId is Z use address A
    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await /* deployments */ get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    // if the contract doesn't exist, we deploy a minimal version of
    // for our local testing

    // well what happens when we want to change chains?
    // when going for localhost or hardhat network we want to use a mock
    const args = [ethUsdPriceFeedAddress]

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put priceFeedAddress
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        // args are the arguments to pass to the constructor of the contract we're veryfing
        await verify(fundMe.address, args)
    }
    log("------------------------------------------------------------------------------------------------------------------")
}

module.exports.tags = ["all", "fundme"]
