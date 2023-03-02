const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")

describe("FundMe", async () => {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1") // 1 ETH
    beforeEach(async () => {
        // deploy our fundMe contract
        // using Hardhat-deploy
        // const accounts = await ethers.getSigners()
        // const account0 = accounts[0]
        // deployer is the account that makes the transaction on this smart contract
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        // deployer is the account that calls any transaction on this contract
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
    })

    describe("constructor", async () => {
        it("Sets the aggregator addresses correctly", async () => {
            const response = await fundMe.s_priceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async () => {
        it("fail if you dont's send enought ETH", async () => {
            // run npm install ethereum-waffle for this to work properly
            await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough")
        })
        it("updates the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.s_addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("adds funder to array of funders", async () => {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.s_funders(0)
            assert.equal(funder, deployer)
        })

    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue })
        })
        it("withdraw ETH from a single funder", async () => {
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            // Debbugging we found that in the transactionRecepit they're infos about gas cost and price! 
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString())
        })
        it("allows us to withdraw with multiple funders", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 6; i++) {
                // here we're connecting another account to the FundMe contract (see comment at line 18)
                const fundMeConnectedContract = await fundMe.connect(accounts[i])
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString())

            // Make sure that the funders are reset properly
            await expect(fundMe.s_funders(0)).to.be.reverted

            for(i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded(accounts[i].address), 0
                ) 
            }
        })
        it("only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner")
        })
    })

    describe("cheaperWithdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue })
        })
        it("withdraw ETH from a single funder", async () => {
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            // Debbugging we found that in the transactionRecepit they're infos about gas cost and price! 
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString())
        })
        it("allows us to withdraw with multiple funders", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 6; i++) {
                // here we're connecting another account to the FundMe contract (see comment at line 18)
                const fundMeConnectedContract = await fundMe.connect(accounts[i])
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance),
                endingDeployerBalance.add(gasCost).toString())

            // Make sure that the funders are reset properly
            await expect(fundMe.s_funders(0)).to.be.reverted

            for(i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.s_addressToAmountFunded(accounts[i].address), 0
                ) 
            }
        })
        it("only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(attackerConnectedContract.cheaperWithdraw()).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})