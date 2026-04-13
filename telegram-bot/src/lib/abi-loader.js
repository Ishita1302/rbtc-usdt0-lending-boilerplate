"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} filePath
 * @returns {ReadonlyArray<object>}
 */
function loadAbiFromHardhatArtifact(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Artifact not found: ${filePath}\n` +
        "From the repo root run: npx hardhat compile"
    );
  }

  const raw = fs.readFileSync(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in artifact: ${filePath}`);
  }

  if (!Array.isArray(parsed.abi)) {
    throw new Error(`Artifact missing abi array: ${filePath}`);
  }

  return parsed.abi;
}

/**
 * @param {string} baseDir - Directory used to resolve relative paths (e.g. telegram-bot root)
 * @param {string | undefined} customPath - Env override; absolute or relative to baseDir
 * @param {string} defaultAbsolutePath - Fully resolved default artifact path
 * @returns {string}
 */
function resolveArtifactPath(baseDir, customPath, defaultAbsolutePath) {
  const trimmed = customPath?.trim();
  if (!trimmed) return defaultAbsolutePath;
  return path.isAbsolute(trimmed) ? trimmed : path.join(baseDir, trimmed);
}

module.exports = {
  loadAbiFromHardhatArtifact,
  resolveArtifactPath,
};
