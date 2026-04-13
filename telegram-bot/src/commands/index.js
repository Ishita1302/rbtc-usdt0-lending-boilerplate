"use strict";

const { registerReadCommands } = require("./read");
const { registerWriteCommands } = require("./write");

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {object} deps
 */
function registerAllCommands(bot, deps) {
  registerReadCommands(bot, deps);
  registerWriteCommands(bot, deps);
}

module.exports = { registerAllCommands };
