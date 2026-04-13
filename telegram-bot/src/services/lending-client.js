"use strict";

const { ethers } = require("ethers");
const { loadAbiFromHardhatArtifact } = require("../lib/abi-loader");

/**
 * @param {object} params
 * @param {string} params.rpcUrl
 * @param {{ lendingPool: string, usdt0: string }} params.addresses
 * @param {{ lendingPool: string, usdt0: string }} params.artifactPaths
 * @param {string | null} params.signerPrivateKey
 */
function createLendingClient({ rpcUrl, addresses, artifactPaths, signerPrivateKey }) {
  const lendingPoolAbi = loadAbiFromHardhatArtifact(artifactPaths.lendingPool);
  const usdt0Abi = loadAbiFromHardhatArtifact(artifactPaths.usdt0);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const poolRead = new ethers.Contract(addresses.lendingPool, lendingPoolAbi, provider);
  const usdt0Read = new ethers.Contract(addresses.usdt0, usdt0Abi, provider);

  let wallet = null;
  let poolWrite = null;
  let usdt0Write = null;
  if (signerPrivateKey) {
    wallet = new ethers.Wallet(signerPrivateKey, provider);
    poolWrite = new ethers.Contract(addresses.lendingPool, lendingPoolAbi, wallet);
    usdt0Write = new ethers.Contract(addresses.usdt0, usdt0Abi, wallet);
  }

  /** @type {number | null} */
  let usdt0Decimals = null;

  return {
    provider,
    addresses,
    poolRead,
    usdt0Read,
    get wallet() {
      return wallet;
    },
    get poolWrite() {
      return poolWrite;
    },
    get usdt0Write() {
      return usdt0Write;
    },
    get usdt0Decimals() {
      if (usdt0Decimals === null) {
        throw new Error("Lending client not initialized; call init() first.");
      }
      return usdt0Decimals;
    },
    async init() {
      const d = await usdt0Read.decimals();
      usdt0Decimals = Number(d);
    },
  };
}

module.exports = { createLendingClient };
