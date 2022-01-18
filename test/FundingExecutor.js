// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const { network } = require("hardhat");
require('dotenv').config();
const Sarcoabi = require('./contractabi/SarcoABI.json');
const USDCabi = require('./contractabi/USDCABI.json');
const GeneralVestingabi = require('./contractabi/GeneralTokenVestingABI.json');
const { calculateUsdcSarcoRate } = require('../helpers');

describe("FundingExecutor Contract", function () {
    let FundingExecutor;
    let FundingExecutorDeployed;
    let SarcoToken;
    let SarcoTokenContract;
    let USDCToken;
    let SarcoTokenHolder;
    let USDCTokenHolder1;
    let USDCTokenHolder2;
    let USDCTokenHolder3;
    let GeneralTokenVesting;
    let owner, stranger;
    let SarcoDao;
    let SarcoVault;

    beforeEach(async function () {
        // Reset fork
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    jsonRpcUrl: process.env.MAINNET_PROVIDER,
                    blockNumber: 12778138,
                }
            }]
        })

        // Impersonate Sarco holder + USDC holders
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x244265a76901b8030b140a2996e6dd4703cbf20f"]
        }); // SarcoToken holder
        SarcoTokenHolder = await ethers.provider.getSigner("0x244265a76901b8030b140a2996e6dd4703cbf20f");

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xd6216fc19db775df9774a6e33526131da7d19a2c"]
        }); // USDCTokenHolder1 holder
        USDCTokenHolder1 = await ethers.provider.getSigner("0xd6216fc19db775df9774a6e33526131da7d19a2c");

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xf9706224f8b7275ee159866c35f26e1f43682e20"]
        }); // USDCTokenHolder2 holder
        USDCTokenHolder2 = await ethers.provider.getSigner("0xf9706224f8b7275ee159866c35f26e1f43682e20");

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x530e0a6993ea99ffc96615af43f327225a5fe536"]
        }); // USDCTokenHolder3 holder
        USDCTokenHolder3 = await ethers.provider.getSigner("0x530e0a6993ea99ffc96615af43f327225a5fe536");

        // Get Signers
        [owner, stranger] = await ethers.getSigners();

        // Set Addresses
        SarcoToken = "0x7697b462a7c4ff5f8b55bdbc2f4076c2af9cf51a";
        SarcoDao = "0x3299f6a52983ba00FfaA0D8c2D5075ca3F3b7991";
        SarcoVault = "0x2627e4c6beecbcb7ba0a5bb9861ec870dc86eb59";
        USDCToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        GeneralTokenVesting = "0x8727c592F28F10b42eB0914a7f6a5885823794c0";

        // Set Contract Instances
        SarcoTokenContract = new ethers.Contract(SarcoToken, Sarcoabi, owner);
        USDCTokenContract = new ethers.Contract(USDCToken, USDCabi, owner);
        GeneralTokenVestingContract = new ethers.Contract(GeneralTokenVesting, GeneralVestingabi, owner);

        // Get the ContractFactory
        FundingExecutor = await ethers.getContractFactory("FundingExecutor");
    });

    describe("Deployment", function () {
        it("Should set constants", async function () {
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );
            expect(await FundingExecutorDeployed.usdcToSarcoRates(0)).to.equal(ethers.utils.parseUnits("1.0", 18));
            expect(await FundingExecutorDeployed.vestingEndDelay()).to.equal(100);
            expect(await FundingExecutorDeployed.offerExpirationDelay()).to.equal(1000);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder1._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("110.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder2._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("120.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder3._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("130.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder1._address)).usdcToSarcoRateIndex).to.equal(0);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder2._address)).usdcToSarcoRateIndex).to.equal(1);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder3._address)).usdcToSarcoRateIndex).to.equal(0);
        });

        it("Should set constants w/ multiple rates", async function () {
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18), ethers.utils.parseUnits("3.22", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 2, 1],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );
            expect(await FundingExecutorDeployed.usdcToSarcoRates(0)).to.equal(ethers.utils.parseUnits("1.0", 18));
            expect(await FundingExecutorDeployed.usdcToSarcoRates(1)).to.equal(ethers.utils.parseUnits("1.5", 18));
            expect(await FundingExecutorDeployed.usdcToSarcoRates(2)).to.equal(ethers.utils.parseUnits("3.22", 18));
            expect(await FundingExecutorDeployed.vestingEndDelay()).to.equal(100);
            expect(await FundingExecutorDeployed.offerExpirationDelay()).to.equal(1000);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder1._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("110.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder2._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("120.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder3._address)).sarcoAllocation).to.equal(ethers.utils.parseUnits("130.0", 18));
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder1._address)).usdcToSarcoRateIndex).to.equal(0);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder2._address)).usdcToSarcoRateIndex).to.equal(2);
            expect(await (await FundingExecutorDeployed.funders(USDCTokenHolder3._address)).usdcToSarcoRateIndex).to.equal(1);
        });

        it("Should revert if usdc_to_sarco_rate rate is 0", async function () {
            await expect(FundingExecutor.deploy(
                [0, ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: _usdcToSarcoRates must be greater than 0");
        });

        it("Should revert if vesting_end_delay is 0", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                0, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 0, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: endDelay must be greater than 0");
        });

        it("Should revert if offer_expiration_delay is 0", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                0,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: offerExpiration must be greater than 0");
        });

        it("Should revert if the length of purchaser array does not equal allocations array", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: purchasers, allocations, traunches lengths must be equal");
        });

        it("Should revert if the length of allocations array does not equal purchasers", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 0, 1],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: purchasers, allocations, traunches lengths must be equal");
        });

        it("Should revert if the length of traunch array does not equal purchasers", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: purchasers, allocations, traunches lengths must be equal");
        });

        it("Should revert if the USDCToken address is address(0)", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                ethers.constants.AddressZero,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: _usdcToken cannot be 0 address");
        });

        it("Should revert if the SarcoToken address is address(0)", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                ethers.constants.AddressZero,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: _sarcoToken cannot be 0 address");
        });

        it("Should revert if the GeneralTokenVesting address is address(0)", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                ethers.constants.AddressZero,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: _generalTokenVesting cannot be 0 address");
        });

        it("Should revert if the SarcoDao is address(0)", async function () {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                ethers.constants.AddressZero
            )).to.be.revertedWith("FundingExecutor: _sarcoDao cannot be 0 address");
        });

        it("Should revert if a purchaser is zero address", async () => {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [ethers.constants.AddressZero, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: Funder cannot be the ZERO address");
        });

        it("Should revert if a purchaser allocation is zero", async () => {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [0, ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: No allocated Sarco tokens for address");
        });

        it("Should revert if purchaser array includes a duplicate", async () => {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder1._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: Allocation has already been set");
        });

        it("Should revert if _sarco_allocations_total does not equal sum of allocations array", async () => {
            await expect(FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("350.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            )).to.be.revertedWith("FundingExecutor: AllocationsTotal does not equal the sum of passed allocations");

        });

        it("Should approve SarcoDao total USDC", async () => {
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [1, 0, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            expect(await USDCTokenContract.connect(USDCTokenHolder1).allowance(FundingExecutorDeployed.address, SarcoDao))
                .to.gte(ethers.utils.parseUnits("360.0", 6));
        });

        it("Should approve SarcoDao total SARCO", async () => {
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.5", 18), ethers.utils.parseUnits("1.0", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 0, 1],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            expect(await SarcoTokenContract.connect(USDCTokenHolder1).allowance(FundingExecutorDeployed.address, SarcoDao))
                .to.gte(ethers.utils.parseUnits("360.0", 18));
        });
    });

    describe("Start", function () {
        beforeEach(async function () {
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );
        });

        it("Should revert if contract does not own allocated funds", async function () {
            await expect(FundingExecutorDeployed.start())
                .to.be.revertedWith("FundingExecutor: Insufficient Sarco contract balance to start offer");
        });

        it("Should emit OfferStarted event", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await expect(FundingExecutorDeployed.start())
                .to.emit(FundingExecutorDeployed, "OfferStarted");
        });

        it("Should emit OfferStarted event if offer the offer has not started before the first purchase executed", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Return USDCCost to purchase Sarco
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase - Listen for OfferStarted event
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.emit(FundingExecutorDeployed, "OfferStarted");
        });

        it("Should be callable from any EOA", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer (Stranger)
            await expect(FundingExecutorDeployed.connect(stranger).start())
                .to.emit(FundingExecutorDeployed, "OfferStarted");
        });

        it("offer_started should return false before start", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));
            expect(await FundingExecutorDeployed.offerStarted()).to.be.equal(false);
        });

        it("offer_started should return true", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();
            expect(await FundingExecutorDeployed.offerStarted()).to.be.equal(true);
        });

        it("offer_expired should return false before offer expires", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Increase Time to 1 second before the offer ends
            await network.provider.send("evm_increaseTime", [800]);
            await network.provider.send("evm_mine");
            expect(await FundingExecutorDeployed.offerExpired()).to.be.equal(false);
        });

        it("offer_expired should return true", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();


            // Increase Time to past offer ends
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");
            expect(await FundingExecutorDeployed.offerExpired()).to.be.equal(true);
        });

        it("Should revert if start is called twice", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Try to start offer twice
            await expect(FundingExecutorDeployed.start())
                .to.be.revertedWith("FundingExecutor: Offer has already started");
        });
    });

    describe("Execute Purchase", function () {
        beforeEach(async function () {
            // Deploy contract
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();
        });

        it("Should revert since offer has expired", async function () {
            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Try to execute a purchase
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.be.revertedWith("FundingExecutor: Purchases cannot be made after the offer has expired");
        });

        it("Should revert since the Purchaser does not have an allocation", async function () {
            await expect(FundingExecutorDeployed.connect(owner).executePurchase(owner.address))
                .to.be.revertedWith("FundingExecutor: sender does not have a SARCO allocation");
        });

        it("Should revert since the Purchaser did not approve PurchaseExecutor for purchase", async function () {
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it("Should emit PurchaseExecuted event", async function () {
            // Return USDCCost to purchase Sarco 
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.emit(FundingExecutorDeployed, "FundingExecuted");
        });

        it("should allow purchaser to assign SARCO to another address", async function () {
            let SarcoAllocation, USDCCost
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase on Behalf of a whitelisted Purchaser, assigning SARCO to another address
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(stranger.address);

            // verify that the SARCO is in token vesting, on behalf of third party address
            expect(await GeneralTokenVestingContract.getTotalTokens(SarcoToken, stranger.address)).to.eq(SarcoAllocation);
        });

        it("Should revert if you attempt to purchase twice", async function () {
            // Return USDCCost to purchase Sarco 
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Purchase 1
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Purchase 2
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.be.revertedWith("FundingExecutor: sender does not have a SARCO allocation");
        });

        it("Should update Sarco DAO USDC Balance", async function () {
            // Check USDC Balance of SarcoVault before a purchase
            beforeTransfer = await USDCTokenContract.balanceOf(SarcoVault);

            // Return USDCCost to purchase Sarco 
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Check GeneralTokenVesting Balance after a purchase
            afterTransfer = await USDCTokenContract.balanceOf(SarcoVault);

            // Check Vault USDC Balance after purchase
            expect(afterTransfer.sub(beforeTransfer)).to.equal(USDCCost);
        });

        it("Should update GeneralTokenVesting Sarco Balance", async function () {
            // Check Sarco Balance of GeneralTokenVesting before a purchase
            beforeTransfer = await SarcoTokenContract.balanceOf(GeneralTokenVesting);

            // Return USDCCost to purchase Sarco 
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Check GeneralTokenVesting Balance after a purchase
            afterTransfer = await SarcoTokenContract.balanceOf(GeneralTokenVesting);

            // General TokenVesting Balance should increase
            expect(afterTransfer.sub(beforeTransfer))
                .to.be.equal(ethers.utils.parseUnits("110.0", 18));
        });

        it("Should update GeneralTokenVesting contract state", async function () {
            // Return USDCCost to purchase Sarco 
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);

            // Approve PurchaseExecutor Contract the USDCCost amount
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Check whitelisted purchaser's vested tokens
            expect(await GeneralTokenVestingContract.getTotalTokens(SarcoToken, USDCTokenHolder1._address))
                .to.be.equal(ethers.utils.parseUnits("110.0", 18));

            // Check whitelisted purchaser vesting duration
            expect(await GeneralTokenVestingContract.getDuration(SarcoToken, USDCTokenHolder1._address))
                .to.be.equal(100);
        });
    });

    describe("Verify usdc_to_sarco conversion rates", function () {
        const deployAndGetCost = async (numberOfSarco1, numberOfSarco2, usdcPricePerSarco1, usdcPricePerSarco2) => {
            const rate1 = calculateUsdcSarcoRate(usdcPricePerSarco1)
            const rate2 = calculateUsdcSarcoRate(usdcPricePerSarco2)
            const totalSarco = numberOfSarco1.add(numberOfSarco2);

            FundingExecutorDeployed = await FundingExecutor.deploy(
                [rate1, rate2], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address],
                [numberOfSarco1, numberOfSarco2],
                [0, 1],
                totalSarco,
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            // Return USDCCost to purchase Sarco
            let SarcoAllocation1;
            let SarcoAllocation2;
            let USDCCost1;
            let USDCCost2;
            [SarcoAllocation1, USDCCost1] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);
            [SarcoAllocation2, USDCCost2] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder2._address);
            return [USDCCost1, USDCCost2];
        }

        it("Should verify purchasing 12,345 SARCO at a rate of $1 and $2 per SARCO costs $12,345 and $24,690", async function () {
            const numberOfSarco1 = ethers.utils.parseUnits("12345", 18);
            const usdcPricePerSarco1 = ethers.utils.parseUnits("1", 6);
            const expectedCost1 = ethers.utils.parseUnits("12345", 6);

            const numberOfSarco2 = ethers.utils.parseUnits("12345", 18);
            const usdcPricePerSarco2 = ethers.utils.parseUnits("2", 6);
            const expectedCost2 = ethers.utils.parseUnits("24690", 6);
            const [contractCost1, contractCost2] = await deployAndGetCost(numberOfSarco1, numberOfSarco2, usdcPricePerSarco1, usdcPricePerSarco2);

            expect(contractCost1).to.equal(expectedCost1);
            expect(contractCost2).to.equal(expectedCost2);
        });

        it("Should verify purchasing 110,000 SARCO @ 20 cents = costs $22,000 / 20,000 SARCO @ 25 cents = costs $5,000", async function () {
            const numberOfSarco1 = ethers.utils.parseUnits("110000", 18);
            const usdcPricePerSarco1 = ethers.utils.parseUnits(".2", 6);
            const expectedCost1 = ethers.utils.parseUnits("22000", 6);

            const numberOfSarco2 = ethers.utils.parseUnits("20000", 18);
            const usdcPricePerSarco2 = ethers.utils.parseUnits("0.25", 6);
            const expectedCost2 = ethers.utils.parseUnits("5000", 6);

            const [contractCost1, contractCost2] = await deployAndGetCost(numberOfSarco1, numberOfSarco2, usdcPricePerSarco1, usdcPricePerSarco2);

            expect(contractCost1).to.equal(expectedCost1);
            expect(contractCost2).to.equal(expectedCost2);
        });

        it("Should verify 1,500 @ 66 cents = $990 / 121 @ 92 cents = $111.32", async function () {
            const numberOfSarco1 = ethers.utils.parseUnits("1500", 18);
            const usdcPricePerSarco1 = ethers.utils.parseUnits("0.66", 6);
            const expectedCost1 = ethers.utils.parseUnits("990", 6);

            const numberOfSarco2 = ethers.utils.parseUnits("121", 18);
            const usdcPricePerSarco2 = ethers.utils.parseUnits("0.92", 6);
            const expectedCost2 = ethers.utils.parseUnits("111.32", 6);

            const [contractCost1, contractCost2] = await deployAndGetCost(numberOfSarco1, numberOfSarco2, usdcPricePerSarco1, usdcPricePerSarco2);

            expect(contractCost1).to.equal(expectedCost1);
            expect(contractCost2).to.equal(expectedCost2);
        });

        it("Should verify 25 SARCO @ $1.50 = $37.50 / 1000 SARCO @ $4.20 = $4200", async function () {
            const numberOfSarco1 = ethers.utils.parseUnits("25", 18);
            const usdcPricePerSarco1 = ethers.utils.parseUnits("1.50", 6);
            const expectedCost1 = ethers.utils.parseUnits("37.5", 6);

            const numberOfSarco2 = ethers.utils.parseUnits("1000", 18);
            const usdcPricePerSarco2 = ethers.utils.parseUnits("4.20", 6);
            const expectedCost2 = ethers.utils.parseUnits("4200", 6);

            const [contractCost1, contractCost2] = await deployAndGetCost(numberOfSarco1, numberOfSarco2, usdcPricePerSarco1, usdcPricePerSarco2);

            expect(contractCost1).to.equal(expectedCost1);
            expect(contractCost2).to.equal(expectedCost2);
        });
    });

    describe("Recover Unused Tokens", function () {
        beforeEach(async function () {
            // Deploy Contract
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );
        });

        it("Should revert - offer not started", async function () {
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.be.revertedWith("FundingExecutor: Purchase offer has not yet started");
        });

        it("Should revert - offer not expired", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Try to recover unsold tokens
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.be.revertedWith("FundingExecutor: Purchase offer has not yet expired");
        });

        it("Should revert if there are no tokens to recover", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Return USDCCost to purchase Sarco
            let SarcoAllocation;
            let USDCCost;

            // Purchaser 1
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Purchaser 2
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder2._address);
            await USDCTokenContract.connect(USDCTokenHolder2).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder2).executePurchase(USDCTokenHolder2._address);

            // Purchaser 3
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder3._address);
            await USDCTokenContract.connect(USDCTokenHolder3).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder3).executePurchase(USDCTokenHolder3._address);

            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Try to recover unsold tokens
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.be.revertedWith("FundingExecutor: There are no Sarco tokens to recover");
        });

        it("Should emit TokensRecovered event", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Recover unsold tokens
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.emit(FundingExecutorDeployed, "TokensRecovered");
        });

        it("Should update DAO Balance", async function () {
            // Transfer Sarco to PurchaseExecutor Contract
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));

            // Start Offer
            await FundingExecutorDeployed.start();

            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Recover unsold tokens
            beforeTransfer = await SarcoTokenContract.balanceOf(SarcoVault);
            await FundingExecutorDeployed.recoverUnsoldTokens();
            afterTransfer = await SarcoTokenContract.balanceOf(SarcoVault);

            // Check Purchase Executor Balance
            expect(afterTransfer.sub(beforeTransfer))
                .to.be.equal(ethers.utils.parseUnits("360.0", 18));
            expect(await SarcoTokenContract.connect(SarcoTokenHolder).balanceOf(FundingExecutorDeployed.address))
                .to.equal(0);
        });
    });

    describe("Integration Tests", function () {
        it("Should Deploy - Start - Execute Purchase - Recover Funds", async function () {
            // Deployed
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            // Start Offer
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));
            await expect(FundingExecutorDeployed.start())
                .to.emit(FundingExecutorDeployed, "OfferStarted");

            // Purchase Executed
            let SarcoAllocation;
            let USDCCost;
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);

            // Execute Purchase
            await expect(FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address))
                .to.emit(FundingExecutorDeployed, "FundingExecuted");

            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Recover Unused Funds
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.emit(FundingExecutorDeployed, "TokensRecovered");
        });

        it("Should Deploy - Start - Execute (3)Purchase - Revert Recover Funds", async function () {
            // Deployed
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );

            // Offer Started
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));
            await expect(FundingExecutorDeployed.start())
                .to.emit(FundingExecutorDeployed, "OfferStarted");

            // Return USDCCost to purchase Sarco
            let SarcoAllocation;
            let USDCCost;

            // Purchaser 1
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Purchaser 2
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder2._address);
            await USDCTokenContract.connect(USDCTokenHolder2).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder2).executePurchase(USDCTokenHolder2._address);

            // Purchaser 3
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder3._address);
            await USDCTokenContract.connect(USDCTokenHolder3).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder3).executePurchase(USDCTokenHolder3._address);

            // Increase Time to past offer expired
            await network.provider.send("evm_increaseTime", [1000]);
            await network.provider.send("evm_mine");

            // Recover Unused Funds
            await expect(FundingExecutorDeployed.recoverUnsoldTokens())
                .to.be.revertedWith("FundingExecutor: There are no Sarco tokens to recover");
        });

        it("Should Deploy - Start - Execute (3)Purchase - Verify GeneralVesting/Purchase Executor state", async function () {
            // Deployed
            FundingExecutorDeployed = await FundingExecutor.deploy(
                [ethers.utils.parseUnits("1.0", 18), ethers.utils.parseUnits("1.5", 18)], // usdc_to_sarco_rate
                100, // vesting duration
                1000,// offer expiration delay
                [USDCTokenHolder1._address, USDCTokenHolder2._address, USDCTokenHolder3._address],
                [ethers.utils.parseUnits("110.0", 18), ethers.utils.parseUnits("120.0", 18), ethers.utils.parseUnits("130.0", 18)],
                [0, 1, 0],
                ethers.utils.parseUnits("360.0", 18),
                USDCToken,
                SarcoToken,
                GeneralTokenVesting,
                SarcoDao
            );


            // Offer Started
            await SarcoTokenContract.connect(SarcoTokenHolder).transfer(FundingExecutorDeployed.address, ethers.utils.parseUnits("360.0", 18));
            await expect(FundingExecutorDeployed.start())
                .to.emit(FundingExecutorDeployed, "OfferStarted");

            // Return USDCCost to purchase Sarco
            let SarcoAllocation;
            let USDCCost;

            // Purchaser 1
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.connect(USDCTokenHolder1).getAllocation(USDCTokenHolder1._address);
            await USDCTokenContract.connect(USDCTokenHolder1).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder1).executePurchase(USDCTokenHolder1._address);

            // Purchaser 2
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.connect(USDCTokenHolder2).getAllocation(USDCTokenHolder2._address);
            await USDCTokenContract.connect(USDCTokenHolder2).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder2).executePurchase(USDCTokenHolder2._address);

            // Purchaser 3
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.connect(USDCTokenHolder3).getAllocation(USDCTokenHolder3._address);
            await USDCTokenContract.connect(USDCTokenHolder3).approve(FundingExecutorDeployed.address, USDCCost);
            await FundingExecutorDeployed.connect(USDCTokenHolder3).executePurchase(USDCTokenHolder3._address);

            // Purchase Executor: Allocations Should be 0
            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder1._address);
            expect(SarcoAllocation).to.equal(0);

            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder2._address);
            expect(SarcoAllocation).to.equal(0);

            [SarcoAllocation, USDCCost] = await FundingExecutorDeployed.getAllocation(USDCTokenHolder3._address);
            expect(SarcoAllocation).to.equal(0);

            // GeneralTokenVesting: Durations/TotalTokens > 0
            expect(await GeneralTokenVestingContract.getTotalTokens(SarcoToken, USDCTokenHolder1._address))
                .to.be.equal(ethers.utils.parseUnits("110.0", 18));
            // Check purchaser vesting duration
            expect(await GeneralTokenVestingContract.getDuration(SarcoToken, USDCTokenHolder1._address))
                .to.be.equal(100);

            expect(await GeneralTokenVestingContract.getTotalTokens(SarcoToken, USDCTokenHolder2._address))
                .to.be.equal(ethers.utils.parseUnits("120.0", 18));
            // Check purchaser vesting duration
            expect(await GeneralTokenVestingContract.getDuration(SarcoToken, USDCTokenHolder2._address))
                .to.be.equal(100);

            expect(await GeneralTokenVestingContract.getTotalTokens(SarcoToken, USDCTokenHolder3._address))
                .to.be.equal(ethers.utils.parseUnits("130.0", 18));
            // Check purchaser vesting duration
            expect(await GeneralTokenVestingContract.getDuration(SarcoToken, USDCTokenHolder3._address))
                .to.be.equal(100);
        });
    });
});