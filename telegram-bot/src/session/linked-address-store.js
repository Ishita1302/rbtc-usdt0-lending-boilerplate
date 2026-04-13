"use strict";

/**
 * In-memory linked address per Telegram chat.
 * Swap implementation for Redis if you run multiple bot instances.
 */
class LinkedAddressStore {
  constructor() {
    /** @type {Map<number, string>} */
    this._byChatId = new Map();
  }

  /**
   * @param {number} chatId
   * @returns {string | undefined}
   */
  get(chatId) {
    return this._byChatId.get(chatId);
  }

  /**
   * @param {number} chatId
   * @param {string} address
   */
  set(chatId, address) {
    this._byChatId.set(chatId, address);
  }

  /**
   * @param {number} chatId
   */
  delete(chatId) {
    this._byChatId.delete(chatId);
  }
}

module.exports = { LinkedAddressStore };
