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

function parseBool(v) {
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/**
 * @param {string | undefined} raw
 * @returns {Set<number>}
 */
function parseTelegramIdSet(raw) {
  const ids = new Set();
  if (!raw?.trim()) return ids;
  for (const part of raw.split(",")) {
    const n = parseInt(part.trim(), 10);
    if (!Number.isNaN(n)) ids.add(n);
  }
  return ids;
}

/**
 * @param {string | undefined} raw
 * @returns {bigint[]}
 */
function parseChainIdList(raw) {
  if (!raw?.trim()) return [];
  const out = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    try {
      out.push(BigInt(t));
    } catch {
      throw new Error(`Invalid chain id in ALLOWED_CHAIN_IDS: ${t}`);
    }
  }
  return out;
}

function loadConfig() {
  const readOnlyMode = parseBool(process.env.READ_ONLY_MODE);
  const dangerousAllowPublicWrites = parseBool(process.env.DANGEROUS_ALLOW_PUBLIC_WRITES);
  const allowedTelegramIds = parseTelegramIdSet(process.env.ALLOWED_TELEGRAM_IDS);
  const iUnderstandTheRisk = parseBool(process.env.I_UNDERSTAND_THE_RISK);
  const allowedChainIds = parseChainIdList(process.env.ALLOWED_CHAIN_IDS);

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

  const rawPk =
    process.env.PRIVATE_KEY?.trim() || process.env.BOT_PRIVATE_KEY?.trim();
  const signerPrivateKey =
    readOnlyMode || !rawPk ? null : rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`;

  const rateLimitWindowMs = Math.max(
    1000,
    parseInt(process.env.RATE_LIMIT_WINDOW_MS?.trim() || "60000", 10) || 60000
  );
  const rateLimitMax = Math.max(
    1,
    parseInt(process.env.RATE_LIMIT_MAX?.trim() || "20", 10) || 20
  );

  const txConfirmTimeoutMs = Math.max(
    5000,
    parseInt(process.env.TX_CONFIRM_TIMEOUT_MS?.trim() || "60000", 10) || 60000
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
    signerPrivateKey,
    readOnlyMode,
    dangerousAllowPublicWrites,
    allowedTelegramIds,
    iUnderstandTheRisk,
    allowedChainIds,
    rateLimitWindowMs,
    rateLimitMax,
    txConfirmTimeoutMs,
  };
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 */
function assertWritePolicy(config) {
  if (config.readOnlyMode) return;
  if (!config.signerPrivateKey) return;
  if (config.dangerousAllowPublicWrites) return;
  if (config.allowedTelegramIds.size > 0) return;
  throw new Error(
    "Unsafe configuration: PRIVATE_KEY is set but neither ALLOWED_TELEGRAM_IDS nor DANGEROUS_ALLOW_PUBLIC_WRITES=true. " +
      "Every write uses the operator wallet — restrict Telegram user IDs or set READ_ONLY_MODE=true."
  );
}

/**
 * @param {bigint} chainId
 * @param {ReturnType<typeof loadConfig>} config
 */
function assertChainId(chainId, config) {
  if (config.iUnderstandTheRisk) {
    if (config.allowedChainIds.length === 0) {
      throw new Error(
        "I_UNDERSTAND_THE_RISK=true requires ALLOWED_CHAIN_IDS (comma-separated), e.g. ALLOWED_CHAIN_IDS=31 or 30,31"
      );
    }
    if (!config.allowedChainIds.includes(chainId)) {
      throw new Error(
        `Chain id ${chainId} is not in ALLOWED_CHAIN_IDS=${config.allowedChainIds.join(",")}`
      );
    }
    return;
  }
  const testnet = 31n;
  if (chainId !== testnet) {
    throw new Error(
      `Refusing to start: expected Rootstock testnet (chainId ${testnet}). Current: ${chainId}. ` +
        "Set I_UNDERSTAND_THE_RISK=true and ALLOWED_CHAIN_IDS for mainnet or other networks."
    );
  }
}

module.exports = {
  loadConfig,
  assertWritePolicy,
  assertChainId,
  PACKAGE_ROOT,
};
