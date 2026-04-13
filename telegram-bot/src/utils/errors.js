"use strict";

/**
 * Safe snippet for Telegram HTML replies (no raw &lt; from RPC).
 * @param {unknown} err
 */
function formatUserError(err) {
  const msg =
    err && typeof err === "object" && "shortMessage" in err
      ? String(err.shortMessage)
      : err instanceof Error
        ? err.message
        : String(err);
  return msg.replace(/</g, "&lt;");
}

module.exports = { formatUserError };
