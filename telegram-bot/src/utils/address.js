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

/**
 * Short form for user-visible hints (not full address disclosure).
 * @param {string} addr
 */
function maskAddress(addr) {
  const a = String(addr);
  if (a.length < 12) return "0x…";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

module.exports = { parseAddress, maskAddress };
