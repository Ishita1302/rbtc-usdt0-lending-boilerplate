"use strict";

const { Telegraf } = require("telegraf");
const { registerAllCommands } = require("./commands");
const { createRateLimitMiddleware } = require("./middleware/rate-limit");

/**
 * @param {object} options
 * @param {string} options.token
 * @param {object} options.client
 * @param {import('./session/linked-address-store').LinkedAddressStore} options.linkedStore
 * @param {{ windowMs: number, max: number }} options.rateLimit
 * @param {{ allowedTelegramIds: Set<number>, dangerousAllowPublicWrites: boolean }} options.security
 * @param {import('./security/write-gate').WriteGate} options.writeGate
 * @param {number} options.txConfirmTimeoutMs
 */
function createBot({
  token,
  client,
  linkedStore,
  rateLimit,
  security,
  writeGate,
  txConfirmTimeoutMs,
}) {
  const bot = new Telegraf(token);

  bot.use(createRateLimitMiddleware(rateLimit));

  bot.catch((err, ctx) => {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[telegraf]", e.stack || e.message);
    if (ctx?.reply) {
      ctx.reply("Something went wrong. Try again later.").catch(() => {});
    }
  });

  registerAllCommands(bot, {
    client,
    linkedStore,
    security,
    writeGate,
    txConfirmTimeoutMs,
  });

  return bot;
}

module.exports = { createBot };
