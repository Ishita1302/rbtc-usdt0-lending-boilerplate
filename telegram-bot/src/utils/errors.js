"use strict";

/**
 * @param {string} context
 * @param {unknown} err
 */
function logServerError(context, err) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[${context}]`, e.stack || e.message);
}

/**
 * Map known ethers / RPC failures to safe chat text (no URLs or provider secrets).
 * @param {unknown} err
 * @returns {string}
 */
function userFacingError(err) {
  const o = err && typeof err === "object" ? err : null;
  const code = o && "code" in o ? o.code : undefined;
  const short =
    o && "shortMessage" in o && typeof o.shortMessage === "string"
      ? o.shortMessage
      : "";
  const msg = o instanceof Error ? o.message : String(err);

  if (code === "ACTION_REJECTED" || code === 4001) {
    return "Transaction was rejected.";
  }
  if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(msg)) {
    return "Insufficient funds for gas or value.";
  }
  if (code === "NONCE_EXPIRED" || code === "REPLACEMENT_UNDERPRICED") {
    return "Nonce or fee issue. Try again in a moment.";
  }
  if (code === "UNPREDICTABLE_GAS_LIMIT" || code === "CALL_EXCEPTION") {
    return "The contract reverted or the call would fail. Check amounts and allowances.";
  }
  if (code === "TIMEOUT" || /timeout/i.test(short) || /timeout/i.test(msg)) {
    return "Confirmation timed out. Check the explorer using the tx hash above.";
  }
  if (
    code === "NETWORK_ERROR" ||
    code === "SERVER_ERROR" ||
    /network error/i.test(msg) ||
    /fetch failed/i.test(msg)
  ) {
    return "Network error. Try again later.";
  }
  if (/invalid address/i.test(msg)) {
    return "Invalid address.";
  }
  return "Something went wrong. Try again later.";
}

module.exports = { logServerError, userFacingError };
