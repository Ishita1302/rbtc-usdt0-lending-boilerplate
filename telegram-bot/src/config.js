"use strict";

const path = require("path");
const { resolveArtifactPath } = require("./lib/abi-loader");

const PACKAGE_ROOT = path.join(__dirname, "..");

const DEFAULT_LENDING_POOL_ARTIFACT = path.join(
  PACKAGE_ROOT,
  "..",
  "artifacts",
  "contracts",
  "LendingPool.sol",
  "LendingPool.json"
);

const DEFAULT_USDT0_ARTIFACT = path.join(
  PACKAGE_ROOT,
  "..",
  "artifacts",
  "contracts",
  "tokens",
  "MockUSDT0.sol",
  "MockUSDT0.json"
);

function requiredEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function loadConfig() {
  const rpcUrl =
    process.env.RSK_RPC_URL?.trim() ||
    process.env.ROOTSTOCK_RPC_URL?.trim() ||
    "https://public-node.testnet.rsk.co";

  const lendingPoolArtifact = resolveArtifactPath(
    PACKAGE_ROOT,
    process.env.LENDING_POOL_ARTIFACT_PATH,
    DEFAULT_LENDING_POOL_ARTIFACT
  );

  const usdt0Artifact = resolveArtifactPath(
    PACKAGE_ROOT,
    process.env.USDT0_ARTIFACT_PATH,
    DEFAULT_USDT0_ARTIFACT
  );

  return {
    telegramBotToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
    rpcUrl,
    addresses: {
      lendingPool: requiredEnv("LENDING_POOL_ADDRESS"),
      usdt0: requiredEnv("USDT0_ADDRESS"),
    },
    artifacts: {
      lendingPool: lendingPoolArtifact,
      usdt0: usdt0Artifact,
    },
    signerPrivateKey: (() => {
      const pk =
        process.env.PRIVATE_KEY?.trim() || process.env.BOT_PRIVATE_KEY?.trim();
      if (!pk) return null;
      return pk.startsWith("0x") ? pk : `0x${pk}`;
    })(),
  };
}

module.exports = {
  loadConfig,
  PACKAGE_ROOT,
};
