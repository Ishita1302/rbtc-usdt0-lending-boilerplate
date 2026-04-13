"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { loadConfig } = require("./config");
const { createLendingClient } = require("./services/lending-client");
const { LinkedAddressStore } = require("./session/linked-address-store");
const { createBot } = require("./app");

async function main() {
  const config = loadConfig();
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
  console.log(`RPC chainId: ${net.chainId} (${config.rpcUrl})`);
  if (client.wallet) {
    console.log(`Signer: ${client.wallet.address}`);
  }
  console.log(`USDT0 decimals (on-chain): ${client.usdt0Decimals}`);

  const linkedStore = new LinkedAddressStore();
  const bot = createBot({
    token: config.telegramBotToken,
    client,
    linkedStore,
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
