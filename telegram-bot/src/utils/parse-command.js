"use strict";

/**
 * Split bot message into arguments (command name excluded).
 * @param {string | undefined} text
 * @returns {string[]}
 */
function commandArgs(text) {
  if (text === undefined || text === null || typeof text !== "string") {
    return [];
  }
  return text.trim().split(/\s+/).slice(1);
}

module.exports = { commandArgs };
