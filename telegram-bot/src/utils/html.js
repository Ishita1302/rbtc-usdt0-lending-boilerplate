"use strict";

/**
 * Telegram HTML parse mode helpers.
 * @see https://core.telegram.org/bots/api#html-style
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function code(text) {
  return `<code>${escapeHtml(text)}</code>`;
}

function lines(parts) {
  return parts.join("\n");
}

module.exports = { escapeHtml, code, lines };
