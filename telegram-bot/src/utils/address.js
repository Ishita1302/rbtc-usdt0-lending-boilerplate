"use strict";

const { ethers } = require("ethers");

/**
 * @param {string} s
 * @returns {string | null} Checksummed address or null
 */
function parseAddress(s) {
  try {
    return ethers.getAddress(s);
  } catch {
    return null;
  }
}

module.exports = { parseAddress };
