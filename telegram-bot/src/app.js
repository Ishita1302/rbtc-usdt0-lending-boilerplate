"use strict";

const { Telegraf } = require("telegraf");
const { registerAllCommands } = require("./commands");

/**
 * @param {object} options
 * @param {string} options.token
 * @param {object} options.client
 * @param {import('../session/linked-address-store').LinkedAddressStore} options.linkedStore
 */
function createBot({ token, client, linkedStore }) {
  const bot = new Telegraf(token);

  bot.catch((err, ctx) => {
    console.error("[telegraf]", err);
    if (ctx?.reply) {
      ctx.reply("Something went wrong. Try again later.").catch(() => {});
    }
  });

  registerAllCommands(bot, { client, linkedStore });

  return bot;
}

module.exports = { createBot };
