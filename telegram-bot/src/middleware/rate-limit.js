"use strict";

/**
 * Simple sliding-window rate limiter keyed by Telegram user (fallback: chat).
 * @param {{ windowMs: number, max: number }} opts
 * @returns {import('telegraf').MiddlewareFn}
 */
function createRateLimitMiddleware({ windowMs, max }) {
  /** @type {Map<string, number[]>} */
  const buckets = new Map();

  return async (ctx, next) => {
    const uid = ctx.from?.id;
    const key =
      uid !== undefined ? `u:${uid}` : ctx.chat?.id !== undefined ? `c:${ctx.chat.id}` : "anon";
    const now = Date.now();
    let stamps = buckets.get(key) ?? [];
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= max) {
      await ctx.reply("Too many requests. Please wait a minute and try again.", {
        parse_mode: "HTML",
      });
      return;
    }
    stamps.push(now);
    buckets.set(key, stamps);
    return next();
  };
}

module.exports = { createRateLimitMiddleware };
