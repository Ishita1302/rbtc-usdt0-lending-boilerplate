"use strict";

/**
 * Split bot message into arguments (command name excluded).
 * @param {string} text
 * @returns {string[]}
 */
function commandArgs(text) {
  return text.trim().split(/\s+/).slice(1);
}

module.exports = { commandArgs };
