"use strict";

const { ethers } = require("ethers");
const { commandArgs } = require("../utils/parse-command");
const { code } = require("../utils/html");
const { logServerError, userFacingError } = require("../utils/errors");
const {
  parsePositiveEtherWei,
  parsePositiveTokenUnits,
  waitAndReportReceipt,
  maskedSignerHint,
} = require("./write-helpers");

/**
 * @param {import('telegraf').Context} ctx
 * @param {ReturnType<import('../services/lending-client').createLendingClient>} client
 * @returns {Promise<{ wallet: import('ethers').Wallet, pool: import('ethers').Contract, usdt0: import('ethers').Contract } | null>}
 */
async function requireSigner(ctx, client) {
  const wallet = client.wallet;
  const pool = client.poolWrite;
  const usdt0 = client.usdt0Write;
  if (!wallet || !pool || !usdt0) {
    await ctx.reply(
      "Signing wallet not configured. Set PRIVATE_KEY or BOT_PRIVATE_KEY (testnet only).",
      { parse_mode: "HTML" }
    );
    return null;
  }
  return { wallet, pool, usdt0 };
}

/**
 * @param {import('telegraf').Context} ctx
 * @param {{ allowedTelegramIds: Set<number>, dangerousAllowPublicWrites: boolean }} security
 * @returns {Promise<number | null>}
 */
async function requireTelegramUserId(ctx, security) {
  const uid = ctx.from?.id;
  if (uid === undefined) {
    await ctx.reply("Could not determine Telegram user id for this update.", {
      parse_mode: "HTML",
    });
    return null;
  }
  if (security.dangerousAllowPublicWrites) return uid;
  if (security.allowedTelegramIds.has(uid)) return uid;
  await ctx.reply(
    "You are not authorized to submit on-chain transactions for this bot.",
    { parse_mode: "HTML" }
  );
  return null;
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} deps
 * @param {ReturnType<import('../services/lending-client').createLendingClient>} deps.client
 * @param {{ allowedTelegramIds: Set<number>, dangerousAllowPublicWrites: boolean }} deps.security
 * @param {import('../security/write-gate').WriteGate} deps.writeGate
 * @param {number} deps.txConfirmTimeoutMs
 */
function registerWriteCommands(bot, { client, security, writeGate, txConfirmTimeoutMs }) {
  const confirmMs = txConfirmTimeoutMs;

  bot.command("deposit", async (ctx) => {
    const uid = await requireTelegramUserId(ctx, security);
    if (uid === null) return;
    const s = await requireSigner(ctx, client);
    if (!s) return;
    const args = commandArgs(ctx.message?.text);
    const value = await parsePositiveEtherWei(ctx, args[0]);
    if (value === null) {
      if (!args[0]) {
        return ctx.reply("Usage: /deposit &lt;RBTC&gt; e.g. /deposit 0.01", {
          parse_mode: "HTML",
        });
      }
      return;
    }
    if (!writeGate.tryAcquire(uid)) {
      return ctx.reply(
        "Another transaction is still in progress for you, or the bot is at capacity. Try again shortly.",
        { parse_mode: "HTML" }
      );
    }
    try {
      await ctx.reply(
        `Sending deposit (signer ${code(maskedSignerHint(s.wallet.address))})…`,
        { parse_mode: "HTML" }
      );
      const tx = await s.pool.depositRBTC({ value });
      const ok = await waitAndReportReceipt(ctx, tx, confirmMs);
      if (!ok) return;
      return ctx.reply("Deposit confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      logServerError("write:deposit", e);
      return ctx.reply(`Failed: ${userFacingError(e)}`, { parse_mode: "HTML" });
    } finally {
      writeGate.release(uid);
    }
  });

  bot.command("withdraw", async (ctx) => {
    const uid = await requireTelegramUserId(ctx, security);
    if (uid === null) return;
    const s = await requireSigner(ctx, client);
    if (!s) return;
    const args = commandArgs(ctx.message?.text);
    const wei = await parsePositiveEtherWei(ctx, args[0]);
    if (wei === null) {
      if (!args[0]) {
        return ctx.reply("Usage: /withdraw &lt;RBTC&gt;", { parse_mode: "HTML" });
      }
      return;
    }
    if (!writeGate.tryAcquire(uid)) {
      return ctx.reply(
        "Another transaction is still in progress for you, or the bot is at capacity. Try again shortly.",
        { parse_mode: "HTML" }
      );
    }
    try {
      await ctx.reply(
        `Withdrawing RBTC (signer ${code(maskedSignerHint(s.wallet.address))})…`,
        { parse_mode: "HTML" }
      );
      const tx = await s.pool.withdrawRBTC(wei);
      const ok = await waitAndReportReceipt(ctx, tx, confirmMs);
      if (!ok) return;
      return ctx.reply("Withdraw confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      logServerError("write:withdraw", e);
      return ctx.reply(`Failed: ${userFacingError(e)}`, { parse_mode: "HTML" });
    } finally {
      writeGate.release(uid);
    }
  });

  bot.command("borrow", async (ctx) => {
    const uid = await requireTelegramUserId(ctx, security);
    if (uid === null) return;
    const s = await requireSigner(ctx, client);
    if (!s) return;
    const args = commandArgs(ctx.message?.text);
    const decimals = client.usdt0Decimals;
    const units = await parsePositiveTokenUnits(ctx, args[0], decimals);
    if (units === null) {
      if (!args[0]) {
        return ctx.reply("Usage: /borrow &lt;USDT0&gt; e.g. /borrow 50", {
          parse_mode: "HTML",
        });
      }
      return;
    }
    if (!writeGate.tryAcquire(uid)) {
      return ctx.reply(
        "Another transaction is still in progress for you, or the bot is at capacity. Try again shortly.",
        { parse_mode: "HTML" }
      );
    }
    try {
      await ctx.reply(
        `Borrowing USDT0 (signer ${code(maskedSignerHint(s.wallet.address))})…`,
        { parse_mode: "HTML" }
      );
      const tx = await s.pool.borrowUSDT0(units);
      const ok = await waitAndReportReceipt(ctx, tx, confirmMs);
      if (!ok) return;
      return ctx.reply("Borrow confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      logServerError("write:borrow", e);
      return ctx.reply(`Failed: ${userFacingError(e)}`, { parse_mode: "HTML" });
    } finally {
      writeGate.release(uid);
    }
  });

  bot.command("approve", async (ctx) => {
    const uid = await requireTelegramUserId(ctx, security);
    if (uid === null) return;
    const s = await requireSigner(ctx, client);
    if (!s) return;
    const args = commandArgs(ctx.message?.text);
    const decimals = client.usdt0Decimals;
    const units = await parsePositiveTokenUnits(ctx, args[0], decimals);
    if (units === null) {
      if (!args[0]) {
        return ctx.reply(
          "Usage: /approve &lt;USDT0&gt; (for pool spend on repay)",
          { parse_mode: "HTML" }
        );
      }
      return;
    }
    if (!writeGate.tryAcquire(uid)) {
      return ctx.reply(
        "Another transaction is still in progress for you, or the bot is at capacity. Try again shortly.",
        { parse_mode: "HTML" }
      );
    }
    try {
      await ctx.reply(
        `Submitting USDT0 approval (signer ${code(maskedSignerHint(s.wallet.address))})…`,
        { parse_mode: "HTML" }
      );
      const tx = await s.usdt0.approve(client.addresses.lendingPool, units);
      const ok = await waitAndReportReceipt(ctx, tx, confirmMs);
      if (!ok) return;
      return ctx.reply("Approve confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      logServerError("write:approve", e);
      return ctx.reply(`Failed: ${userFacingError(e)}`, { parse_mode: "HTML" });
    } finally {
      writeGate.release(uid);
    }
  });

  bot.command("repay", async (ctx) => {
    const uid = await requireTelegramUserId(ctx, security);
    if (uid === null) return;
    const s = await requireSigner(ctx, client);
    if (!s) return;
    const args = commandArgs(ctx.message?.text);
    const decimals = client.usdt0Decimals;
    const units = await parsePositiveTokenUnits(ctx, args[0], decimals);
    if (units === null) {
      if (!args[0]) {
        return ctx.reply(
          "Usage: /repay &lt;USDT0&gt; (run /approve first if needed)",
          { parse_mode: "HTML" }
        );
      }
      return;
    }
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
    if (!writeGate.tryAcquire(uid)) {
      return ctx.reply(
        "Another transaction is still in progress for you, or the bot is at capacity. Try again shortly.",
        { parse_mode: "HTML" }
      );
    }
    try {
      await ctx.reply(
        `Submitting repay (signer ${code(maskedSignerHint(s.wallet.address))})…`,
        { parse_mode: "HTML" }
      );
      const tx = await s.pool.repayUSDT0(units);
      const ok = await waitAndReportReceipt(ctx, tx, confirmMs);
      if (!ok) return;
      return ctx.reply("Repay confirmed.", { parse_mode: "HTML" });
    } catch (e) {
      logServerError("write:repay", e);
      return ctx.reply(`Failed: ${userFacingError(e)}`, { parse_mode: "HTML" });
    } finally {
      writeGate.release(uid);
    }
  });
}

module.exports = { registerWriteCommands };
