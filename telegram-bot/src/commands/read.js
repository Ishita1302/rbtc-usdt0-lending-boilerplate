"use strict";

const { ethers } = require("ethers");
const { commandArgs } = require("../utils/parse-command");
const { parseAddress } = require("../utils/address");
const { formatHealthFactor, formatUsdE18 } = require("../utils/format");
const { code, lines } = require("../utils/html");
const { formatUserError } = require("../utils/errors");

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} ctx
 * @returns {{ error: string } | { address: string }}
 */
function resolveViewAddress(ctx, linkedStore, client, optionalArg) {
  if (optionalArg) {
    const a = parseAddress(optionalArg);
    if (!a) {
      return { error: "Invalid address. Send a valid 0x-prefixed address." };
    }
    return { address: a };
  }
  const linked = linkedStore.get(ctx.chat.id);
  if (linked) return { address: linked };
  const w = client.wallet;
  if (w) return { address: w.address };
  return {
    error:
      "No address set. Use /link &lt;0x…&gt; or configure PRIVATE_KEY / BOT_PRIVATE_KEY, or pass an address.",
  };
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} deps
 * @param {import('../session/linked-address-store').LinkedAddressStore} deps.linkedStore
 * @param {ReturnType<import('../services/lending-client').createLendingClient>} deps.client
 */
function registerReadCommands(bot, { linkedStore, client }) {
  bot.start((ctx) =>
    ctx.reply(
      lines([
        "<b>Rootstock Lending Boilerplate</b>",
        "",
        "<b>Read</b>",
        "/link &lt;0x…&gt; — default address for this chat",
        "/unlink — clear it",
        "/balance [0x…] — wallet + pool position",
        "/health [0x…] — health factor",
        "/ltv — pool LTV (basis points)",
        "",
        "<b>On-chain</b> (optional PRIVATE_KEY / BOT_PRIVATE_KEY):",
        "/deposit &lt;RBTC&gt;",
        "/withdraw &lt;RBTC&gt;",
        "/borrow &lt;USDT0&gt;",
        "/approve &lt;USDT0&gt;",
        "/repay &lt;USDT0&gt;",
        "",
        "Educational / testnet only.",
      ]),
      { parse_mode: "HTML" }
    )
  );

  bot.help((ctx) =>
    ctx.reply("Use /start for commands.", { parse_mode: "HTML" })
  );

  bot.command("link", async (ctx) => {
    const args = commandArgs(ctx.message.text);
    const addrRaw = args[0];
    if (!addrRaw) {
      return ctx.reply("Usage: /link 0xYourAddress", { parse_mode: "HTML" });
    }
    const a = parseAddress(addrRaw);
    if (!a) return ctx.reply("Invalid address.", { parse_mode: "HTML" });
    linkedStore.set(ctx.chat.id, a);
    return ctx.reply(`Linked to ${code(a)}`, { parse_mode: "HTML" });
  });

  bot.command("unlink", (ctx) => {
    linkedStore.delete(ctx.chat.id);
    return ctx.reply("Cleared linked address.", { parse_mode: "HTML" });
  });

  bot.command("ltv", async (ctx) => {
    try {
      const bps = await client.poolRead.ltvBps();
      return ctx.reply(
        `LTV: ${bps.toString()} bps (${(Number(bps) / 100).toFixed(2)}%).`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      return ctx.reply(`RPC error: ${formatUserError(e)}`, {
        parse_mode: "HTML",
      });
    }
  });

  bot.command("balance", async (ctx) => {
    const args = commandArgs(ctx.message.text);
    const resolved = resolveViewAddress(ctx, linkedStore, client, args[0]);
    if ("error" in resolved) {
      return ctx.reply(resolved.error, { parse_mode: "HTML" });
    }
    const { address } = resolved;
    const decimals = client.usdt0Decimals;
    try {
      const [rbtcWei, usdt0Bal, data] = await Promise.all([
        client.provider.getBalance(address),
        client.usdt0Read.balanceOf(address),
        client.poolRead.getAccountData(address),
      ]);
      return ctx.reply(
        lines([
          `Address: ${code(address)}`,
          "",
          `Wallet RBTC: ${ethers.formatEther(rbtcWei)}`,
          `Wallet USDT0: ${ethers.formatUnits(usdt0Bal, decimals)}`,
          "",
          `Pool collateral (RBTC): ${ethers.formatEther(data.collRbtcWei)}`,
          `Pool debt (USDT0): ${ethers.formatUnits(data.debtUsdt0, decimals)}`,
          `Collateral USD (oracle 1e18): ${formatUsdE18(data.collUsdE18)}`,
          `Debt USD (oracle 1e18): ${formatUsdE18(data.debtUsdE18_)}`,
          `Max debt USD (LTV): ${formatUsdE18(data.maxDebtUsdE18_)}`,
          `Health factor: ${formatHealthFactor(data.healthFactorE18_)}`,
        ]),
        { parse_mode: "HTML" }
      );
    } catch (e) {
      return ctx.reply(`Error: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("health", async (ctx) => {
    const args = commandArgs(ctx.message.text);
    const resolved = resolveViewAddress(ctx, linkedStore, client, args[0]);
    if ("error" in resolved) {
      return ctx.reply(resolved.error, { parse_mode: "HTML" });
    }
    const { address } = resolved;
    try {
      const hf = await client.poolRead.healthFactorE18(address);
      return ctx.reply(
        lines([
          `Address: ${code(address)}`,
          "",
          `Health factor: ${formatHealthFactor(hf)}`,
          "",
          "Solvent when health factor &gt; 1 (1e18 scale on-chain).",
        ]),
        { parse_mode: "HTML" }
      );
    } catch (e) {
      return ctx.reply(`Error: ${formatUserError(e)}`, { parse_mode: "HTML" });
    }
  });
}

module.exports = { registerReadCommands };
