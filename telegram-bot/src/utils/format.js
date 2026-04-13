"use strict";

const { ethers } = require("ethers");

function formatHealthFactor(hfBn) {
  if (hfBn === ethers.MaxUint256) return "∞ (no debt)";
  const s = ethers.formatUnits(hfBn, 18);
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n >= 1e6) return n.toExponential(4);
  return n.toFixed(4);
}

function formatUsdE18(usd1e18) {
  const s = ethers.formatUnits(usd1e18, 18);
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n < 0.01 ? n.toExponential(4) : n.toFixed(2);
}

module.exports = { formatHealthFactor, formatUsdE18 };
