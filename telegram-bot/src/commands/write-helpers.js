"use strict";

const { ethers } = require("ethers");
const { code, lines } = require("../utils/html");
const { maskAddress } = require("../utils/address");

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} amt
 * @returns {Promise<bigint | null>}
 */
async function parsePositiveEtherWei(ctx, amt) {
  if (!amt) return null;
  let value;
  try {
    value = ethers.parseEther(amt);
  } catch {
    await ctx.reply("Invalid RBTC amount.", { parse_mode: "HTML" });
    return null;
  }
  if (value <= 0n) {
    await ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    return null;
  }
  return value;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {string} amt
 * @param {number} decimals
 * @returns {Promise<bigint | null>}
 */
async function parsePositiveTokenUnits(ctx, amt, decimals) {
  if (!amt) return null;
  let units;
  try {
    units = ethers.parseUnits(amt, decimals);
  } catch {
    await ctx.reply("Invalid USDT0 amount.", { parse_mode: "HTML" });
    return null;
  }
  if (units <= 0n) {
    await ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    return null;
  }
  return units;
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {import('ethers').TransactionResponse} tx
 * @param {number} confirmTimeoutMs
 * @returns {Promise<boolean>} true if confirmed ok, false if user was notified of terminal state
 */
async function waitAndReportReceipt(ctx, tx, confirmTimeoutMs) {
  await ctx.reply(
    lines([`Tx: ${code(tx.hash)}`, "Waiting for confirmation…"]),
    { parse_mode: "HTML" }
  );
  let receipt;
  try {
    receipt = await tx.wait(1, confirmTimeoutMs);
  } catch (e) {
    const o = e && typeof e === "object" ? e : null;
    const codeStr = o && "code" in o ? String(o.code) : "";
    const short =
      o && "shortMessage" in o && typeof o.shortMessage === "string"
        ? o.shortMessage
        : "";
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout =
      codeStr === "TIMEOUT" ||
      /timeout/i.test(msg) ||
      /timeout/i.test(short);
    if (isTimeout) {
      await ctx.reply(
        lines([
          "Transaction submitted but not confirmed in time.",
          `Tx: ${code(tx.hash)}`,
          "Check status on a block explorer.",
        ]),
        { parse_mode: "HTML" }
      );
      return false;
    }
    throw e;
  }
  if (!receipt) {
    await ctx.reply(
      lines([
        "Transaction was dropped or replaced.",
        `Tx: ${code(tx.hash)}`,
      ]),
      { parse_mode: "HTML" }
    );
    return false;
  }
  if (receipt.status !== 1) {
    await ctx.reply(
      lines([
        "Transaction reverted on-chain.",
        `Tx: ${code(tx.hash)}`,
      ]),
      { parse_mode: "HTML" }
    );
    return false;
  }
  return true;
}

/**
 * @param {string} walletAddress
 */
function maskedSignerHint(walletAddress) {
  return maskAddress(walletAddress);
}

module.exports = {
  parsePositiveEtherWei,
  parsePositiveTokenUnits,
  waitAndReportReceipt,
  maskedSignerHint,
};
