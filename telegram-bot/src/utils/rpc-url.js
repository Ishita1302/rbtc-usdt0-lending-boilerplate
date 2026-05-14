"use strict";

/**
 * Hostname only for logs — never log path/query (provider API keys often live there).
 * @param {string} rpcUrl
 * @returns {string}
 */
function rpcHostnameForLog(rpcUrl) {
  try {
    const u = new URL(rpcUrl);
    return u.hostname || "(invalid-url)";
  } catch {
    return "(invalid-url)";
  }
}

module.exports = { rpcHostnameForLog };
