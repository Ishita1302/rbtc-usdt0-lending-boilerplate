"use strict";

const { ethers } = require("ethers");
const { commandArgs } = require("../utils/parse-command");
const { code, lines } = require("../utils/html");
const { formatUserError } = require("../utils/errors");

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} deps
 * @param {ReturnType<import('../services/lending-client').createLendingClient>} deps.client
 */
function registerWriteCommands(bot, { client }) {
  function requireSigner(ctx) {
    const wallet = client.wallet;
    const pool = client.poolWrite;
    const usdt0 = client.usdt0Write;
    if (!wallet || !pool || !usdt0) {
      ctx.reply(
        "Signing wallet not configured. Set PRIVATE_KEY or BOT_PRIVATE_KEY (testnet only).",
        { parse_mode: "HTML" }
      );
      return null;
    }
    return { wallet, pool, usdt0 };
  }

  bot.command("deposit", async (ctx) => {
    const s = requireSigner(ctx);
    if (!s) return;
    const args = commandArgs(ctx.message.text);
    const amt = args[0];
    if (!amt) {
      return ctx.reply("Usage: /deposit &lt;RBTC&gt; e.g. /deposit 0.01", {
        parse_mode: "HTML",
      });
    }
    let value;
    try {
      value = ethers.parseEther(amt);
    } catch {
      return ctx.reply("Invalid RBTC amount.", { parse_mode: "HTML" });
    }
    if (value <= 0n) {
      return ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    }
    try {
      await ctx.reply(`Sending deposit from ${code(s.wallet.address)}…`, {
        parse_mode: "HTML",
      });
      const tx = await s.pool.depositRBTC({ value });
      await ctx.reply(
        lines([`Tx: ${code(tx.hash)}`, "Waiting for confirmation…"]),
        { parse_mode: "HTML" }
      );
      await tx.wait();
      return ctx.reply("Deposit confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      return ctx.reply(`Failed: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("withdraw", async (ctx) => {
    const s = requireSigner(ctx);
    if (!s) return;
    const args = commandArgs(ctx.message.text);
    const amt = args[0];
    if (!amt) {
      return ctx.reply("Usage: /withdraw &lt;RBTC&gt;", { parse_mode: "HTML" });
    }
    let wei;
    try {
      wei = ethers.parseEther(amt);
    } catch {
      return ctx.reply("Invalid RBTC amount.", { parse_mode: "HTML" });
    }
    if (wei <= 0n) {
      return ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    }
    try {
      await ctx.reply(`Withdrawing to ${code(s.wallet.address)}…`, {
        parse_mode: "HTML",
      });
      const tx = await s.pool.withdrawRBTC(wei);
      await ctx.reply(`Tx: ${code(tx.hash)}`, { parse_mode: "HTML" });
      await tx.wait();
      return ctx.reply("Withdraw confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      return ctx.reply(`Failed: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("borrow", async (ctx) => {
    const s = requireSigner(ctx);
    if (!s) return;
    const args = commandArgs(ctx.message.text);
    const amt = args[0];
    if (!amt) {
      return ctx.reply("Usage: /borrow &lt;USDT0&gt; e.g. /borrow 50", {
        parse_mode: "HTML",
      });
    }
    const decimals = client.usdt0Decimals;
    let units;
    try {
      units = ethers.parseUnits(amt, decimals);
    } catch {
      return ctx.reply("Invalid USDT0 amount.", { parse_mode: "HTML" });
    }
    if (units <= 0n) {
      return ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    }
    try {
      await ctx.reply(`Borrowing to ${code(s.wallet.address)}…`, {
        parse_mode: "HTML",
      });
      const tx = await s.pool.borrowUSDT0(units);
      await ctx.reply(`Tx: ${code(tx.hash)}`, { parse_mode: "HTML" });
      await tx.wait();
      return ctx.reply("Borrow confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      return ctx.reply(`Failed: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("approve", async (ctx) => {
    const s = requireSigner(ctx);
    if (!s) return;
    const args = commandArgs(ctx.message.text);
    const amt = args[0];
    if (!amt) {
      return ctx.reply("Usage: /approve &lt;USDT0&gt; (for pool spend on repay)", {
        parse_mode: "HTML",
      });
    }
    const decimals = client.usdt0Decimals;
    let units;
    try {
      units = ethers.parseUnits(amt, decimals);
    } catch {
      return ctx.reply("Invalid USDT0 amount.", { parse_mode: "HTML" });
    }
    if (units <= 0n) {
      return ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    }
    try {
      const tx = await s.usdt0.approve(client.addresses.lendingPool, units);
      await ctx.reply(`Tx: ${code(tx.hash)}`, { parse_mode: "HTML" });
      await tx.wait();
      return ctx.reply("Approve confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      return ctx.reply(`Failed: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("repay", async (ctx) => {
    const s = requireSigner(ctx);
    if (!s) return;
    const args = commandArgs(ctx.message.text);
    const amt = args[0];
    if (!amt) {
      return ctx.reply(
        "Usage: /repay &lt;USDT0&gt; (run /approve first if needed)",
        { parse_mode: "HTML" }
      );
    }
    const decimals = client.usdt0Decimals;
    let units;
    try {
      units = ethers.parseUnits(amt, decimals);
    } catch {
      return ctx.reply("Invalid USDT0 amount.", { parse_mode: "HTML" });
    }
    if (units <= 0n) {
      return ctx.reply("Amount must be positive.", { parse_mode: "HTML" });
    }
    try {
      const allowance = await client.usdt0Read.allowance(
        s.wallet.address,
        client.addresses.lendingPool
      );
      if (allowance < units) {
        return ctx.reply(
          `Insufficient USDT0 allowance (${ethers.formatUnits(allowance, decimals)}). Use /approve first.`,
          { parse_mode: "HTML" }
        );
      }
      const tx = await s.pool.repayUSDT0(units);
      await ctx.reply(`Tx: ${code(tx.hash)}`, { parse_mode: "HTML" });
      await tx.wait();
      return ctx.reply("Repay confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      return ctx.reply(`Failed: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });
}

module.exports = { registerWriteCommands };
