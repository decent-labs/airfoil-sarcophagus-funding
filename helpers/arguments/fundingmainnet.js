const ethers = require("ethers");
const { calculateUsdcSarcoRate } = require("../../helpers");

const rates = [calculateUsdcSarcoRate(ethers.utils.parseUnits("0.20", 6)), calculateUsdcSarcoRate(ethers.utils.parseUnits("0.40", 6))];

const vestingDuration = 60 * 60 * 24 * 365 * 2; // 2 years
const offerExpiration = 60 * 60 * 24 * 30; // 30 days

const purchasers = [
  "0xB1Cd805ED5B419bA4054375Ec9E99fCf1C73da02",
  "0xF8b0a843880e67f34DB6610380a6C3631bfB3Df8",

  "0x02833B4d3FF06e993c16522A177836426F01DD9E",
  "0xac1B1CC2FEE62d8dc215821A7aFC1d8594FF2f92",
  "0x6e9bEcc317bF34E9394a2000f9a9a61dFAd596FE",
];
const allocations = [
  ethers.utils.parseUnits("250000", 18),
  ethers.utils.parseUnits("750000", 18),

  ethers.utils.parseUnits("125000", 18),
  ethers.utils.parseUnits("125000", 18),
  ethers.utils.parseUnits("62500", 18),
];

const indexes = [
  0, 0, 1, 1, 1
];

const totalAllocation = ethers.utils.parseUnits("1312500", 18);

const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const sarcoAddress = "0x7697b462a7c4ff5f8b55bdbc2f4076c2af9cf51a";

const vestingAddress = "0x8727c592f28f10b42eb0914a7f6a5885823794c0";
const daoAddress = "0x3299f6a52983ba00ffaa0d8c2d5075ca3f3b7991";

const fundingmainnet = [
  rates,
  vestingDuration,
  offerExpiration,
  purchasers,
  allocations,
  indexes,
  totalAllocation,
  usdcAddress,
  sarcoAddress,
  vestingAddress,
  daoAddress,
];

module.exports = fundingmainnet;
