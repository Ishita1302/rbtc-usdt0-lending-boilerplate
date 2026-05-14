"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { loadConfig, assertWritePolicy, assertChainId } = require("./config");
const { rpcHostnameForLog } = require("./utils/rpc-url");
const { createLendingClient } = require("./services/lending-client");
const { LinkedAddressStore } = require("./session/linked-address-store");
const { WriteGate } = require("./security/write-gate");
const { createBot } = require("./app");

async function main() {
  const config = loadConfig();
  assertWritePolicy(config);

  const client = createLendingClient({
    rpcUrl: config.rpcUrl,
    addresses: config.addresses,
    artifactPaths: {
      lendingPool: config.artifacts.lendingPool,
      usdt0: config.artifacts.usdt0,
    },
    signerPrivateKey: config.signerPrivateKey,
  });

  await client.init();

  const net = await client.provider.getNetwork();
  assertChainId(net.chainId, config);
  console.log(`RPC chainId: ${net.chainId} host=${rpcHostnameForLog(config.rpcUrl)}`);
  if (client.wallet) {
    console.log(`Signer: ${client.wallet.address}`);
  }
  console.log(`USDT0 decimals (on-chain): ${client.usdt0Decimals}`);
  if (config.readOnlyMode) {
    console.log("READ_ONLY_MODE: on-chain writes disabled (PRIVATE_KEY ignored).");
  }

  const linkedStore = new LinkedAddressStore();
  const writeGate = new WriteGate();
  const security = {
    allowedTelegramIds: config.allowedTelegramIds,
    dangerousAllowPublicWrites: config.dangerousAllowPublicWrites,
  };

  const bot = createBot({
    token: config.telegramBotToken,
    client,
    linkedStore,
    rateLimit: { windowMs: config.rateLimitWindowMs, max: config.rateLimitMax },
    security,
    writeGate,
    txConfirmTimeoutMs: config.txConfirmTimeoutMs,
  });

  await bot.launch();
  console.log("Bot running (long polling).");

  const shutdown = async (signal) => {
    try {
      await bot.stop(signal);
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
