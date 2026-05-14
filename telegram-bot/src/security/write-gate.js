"use strict";

/**
 * Limits concurrent on-chain writes to reduce gas griefing and stuck tx pile-up.
 */
class WriteGate {
  /**
   * @param {{ maxGlobal?: number, maxPerUser?: number }} [opts]
   */
  constructor(opts = {}) {
    this._maxGlobal = opts.maxGlobal ?? 3;
    this._maxPerUser = opts.maxPerUser ?? 1;
    this._global = 0;
    /** @type {Map<number, number>} */
    this._byUser = new Map();
  }

  /**
   * @param {number} telegramUserId
   * @returns {boolean}
   */
  tryAcquire(telegramUserId) {
    if (this._global >= this._maxGlobal) return false;
    const n = this._byUser.get(telegramUserId) ?? 0;
    if (n >= this._maxPerUser) return false;
    this._byUser.set(telegramUserId, n + 1);
    this._global += 1;
    return true;
  }

  /**
   * @param {number} telegramUserId
   */
  release(telegramUserId) {
    this._global = Math.max(0, this._global - 1);
    const n = this._byUser.get(telegramUserId) ?? 0;
    if (n <= 1) this._byUser.delete(telegramUserId);
    else this._byUser.set(telegramUserId, n - 1);
  }
}

module.exports = { WriteGate };
