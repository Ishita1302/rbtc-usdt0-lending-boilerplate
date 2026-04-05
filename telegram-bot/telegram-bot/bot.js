const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Telegraf } = require("telegraf");
const { ethers } = require("ethers");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL = process.env.ROOTSTOCK_RPC_URL || process.env.RSK_TESTNET_RPC || "https://public-node.testnet.rsk.co";
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
const CHAIN_NAME = process.env.CHAIN_NAME || "Rootstock Testnet";
const USDT0_DECIMALS = Number(process.env.USDT0_DECIMALS || 6);

if (!BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing BOT_PRIVATE_KEY or PRIVATE_KEY in .env");
}

function resolveJsonFile(envPath, fallbackPath) {
  const directPath = envPath ? path.resolve(__dirname, envPath) : null;
  if (directPath && fs.existsSync(directPath)) {
    return directPath;
  }
  const joined = path.resolve(__dirname, fallbackPath);
  if (fs.existsSync(joined)) {
    return joined;
  }
  return null;
}

const addressFile = resolveJsonFile(
  process.env.CONTRACT_ADDRESS_FILE,
  "../../frontend/src/abis/contract-address.json"
);

const lendingAbiFile = resolveJsonFile(
  process.env.LENDING_POOL_ABI_FILE,
  "../../frontend/src/abis/LendingPool.json"
);

const usdt0AbiFile = resolveJsonFile(
  process.env.USDT0_ABI_FILE,
  "../../frontend/src/abis/MockUSDT0.json"
);

if (!addressFile) {
  throw new Error("Unable to find contract-address.json. Set CONTRACT_ADDRESS_FILE in .env");
}

if (!lendingAbiFile) {
  throw new Error("Unable to find LendingPool ABI. Set LENDING_POOL_ABI_FILE in .env");
}

if (!usdt0AbiFile) {
  throw new Error("Unable to find USDT0 ABI. Set USDT0_ABI_FILE in .env");
}

const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
const lendingPoolAddress = process.env.LENDING_POOL_ADDRESS || addresses.LendingPool;
const usdt0Address = process.env.USDT0_ADDRESS || addresses.USDT0;

if (!lendingPoolAddress || !usdt0Address) {
  throw new Error("Missing LendingPool or USDT0 address in address file or env");
}

const lendingPoolAbi = JSON.parse(fs.readFileSync(lendingAbiFile, "utf8"));
const usdt0Abi = JSON.parse(fs.readFileSync(usdt0AbiFile, "utf8"));

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const lendingPool = new ethers.Contract(lendingPoolAddress, lendingPoolAbi, signer);
const usdt0 = new ethers.Contract(usdt0Address, usdt0Abi, signer);
const bot = new Telegraf(BOT_TOKEN);
const trackedAddresses = new Map();

function isValidAddress(value) {
  try {
    return Boolean(ethers.utils.getAddress(value));
  } catch (error) {
    return false;
  }
}

function normalizeAddress(value) {
  return ethers.utils.getAddress(value);
}

function chatWallet(chatId) {
  const byChat = trackedAddresses.get(chatId);
  if (byChat) {
    return byChat;
  }
  return signer.address;
}

function formatTx(hash) {
  return `https://explorer.testnet.rsk.co/tx/${hash}`;
}

function formatAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function parseAmount(rawAmount) {
  if (!rawAmount) {
    return null;
  }
  const trimmed = rawAmount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

async function getAccountSnapshot(userAddress) {
  const [walletRbtcWei, walletUsdt0Raw, accountData] = await Promise.all([
    provider.getBalance(userAddress),
    usdt0.balanceOf(userAddress),
    lendingPool.getAccountData(userAddress)
  ]);

  return {
    walletRbtc: ethers.utils.formatEther(walletRbtcWei),
    walletUsdt0: ethers.utils.formatUnits(walletUsdt0Raw, USDT0_DECIMALS),
    collateralRbtc: ethers.utils.formatEther(accountData[0]),
    debtUsdt0: ethers.utils.formatUnits(accountData[1], USDT0_DECIMALS),
    collateralUsd: ethers.utils.formatUnits(accountData[2], 18),
    debtUsd: ethers.utils.formatUnits(accountData[3], 18),
    maxDebtUsd: ethers.utils.formatUnits(accountData[4], 18),
    healthFactor: ethers.utils.formatUnits(accountData[5], 18)
  };
}

function accountMessage(label, snapshot, userAddress) {
  return [
    `📍 ${label}: ${formatAddress(userAddress)}`,
    `💰 Wallet RBTC: ${snapshot.walletRbtc}`,
    `💵 Wallet USDT0: ${snapshot.walletUsdt0}`,
    `🏦 Collateral RBTC: ${snapshot.collateralRbtc}`,
    `📉 Debt USDT0: ${snapshot.debtUsdt0}`,
    `📊 Collateral USD: ${snapshot.collateralUsd}`,
    `📊 Debt USD: ${snapshot.debtUsd}`,
    `📈 Max Debt USD: ${snapshot.maxDebtUsd}`,
    `🛡️ Health Factor: ${snapshot.healthFactor}`
  ].join("\n");
}

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const defaultWallet = signer.address;
  if (!trackedAddresses.has(chatId)) {
    trackedAddresses.set(chatId, defaultWallet);
  }

  await ctx.reply(
    [
      "Welcome to Rootstock Lending Bot",
      `Network: ${CHAIN_NAME}`,
      `Signer wallet: ${defaultWallet}`,
      "",
      "Commands:",
      "/help",
      "/setaddress <wallet>",
      "/address",
      "/balance [wallet]",
      "/health [wallet]",
      "/deposit <rbtcAmount>",
      "/borrow <usdt0Amount>",
      "/repay <usdt0Amount>",
      "/withdraw <rbtcAmount>"
    ].join("\n")
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Use these commands:",
      "/setaddress <wallet> set your tracked wallet for read operations",
      "/address show your tracked wallet",
      "/balance [wallet] view wallet and lending balances",
      "/health [wallet] view collateral, debt and health factor",
      "/deposit <rbtcAmount> deposit RBTC collateral from bot signer",
      "/borrow <usdt0Amount> borrow USDT0 to bot signer",
      "/repay <usdt0Amount> approve + repay from bot signer",
      "/withdraw <rbtcAmount> withdraw RBTC from bot signer",
      "",
      `Current signer address: ${signer.address}`
    ].join("\n")
  );
});

bot.command("setaddress", async (ctx) => {
  const raw = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!isValidAddress(raw)) {
    await ctx.reply("Invalid address. Example: /setaddress 0xabc...");
    return;
  }
  const checksum = normalizeAddress(raw);
  trackedAddresses.set(ctx.chat.id, checksum);
  await ctx.reply(`Tracked wallet updated to ${checksum}`);
});

bot.command("address", async (ctx) => {
  const active = chatWallet(ctx.chat.id);
  await ctx.reply(`Tracked wallet: ${active}\nSigner wallet: ${signer.address}`);
});

bot.command("balance", async (ctx) => {
  try {
    const maybeAddress = ctx.message.text.split(" ").slice(1).join(" ").trim();
    const target = maybeAddress && isValidAddress(maybeAddress)
      ? normalizeAddress(maybeAddress)
      : chatWallet(ctx.chat.id);
    const snapshot = await getAccountSnapshot(target);
    await ctx.reply(accountMessage("Balance", snapshot, target));
  } catch (error) {
    await ctx.reply(`Failed to fetch balances: ${error.message}`);
  }
});

bot.command("health", async (ctx) => {
  try {
    const maybeAddress = ctx.message.text.split(" ").slice(1).join(" ").trim();
    const target = maybeAddress && isValidAddress(maybeAddress)
      ? normalizeAddress(maybeAddress)
      : chatWallet(ctx.chat.id);
    const snapshot = await getAccountSnapshot(target);
    await ctx.reply(
      [
        `📍 Wallet: ${formatAddress(target)}`,
        `🏦 Collateral RBTC: ${snapshot.collateralRbtc}`,
        `📉 Debt USDT0: ${snapshot.debtUsdt0}`,
        `📊 Collateral USD: ${snapshot.collateralUsd}`,
        `📊 Debt USD: ${snapshot.debtUsd}`,
        `📈 Max Debt USD: ${snapshot.maxDebtUsd}`,
        `🛡️ Health Factor: ${snapshot.healthFactor}`
      ].join("\n")
    );
  } catch (error) {
    await ctx.reply(`Failed to fetch health factor: ${error.message}`);
  }
});

bot.command("deposit", async (ctx) => {
  const amount = parseAmount(ctx.message.text.split(" ").slice(1).join(" "));
  if (!amount) {
    await ctx.reply("Invalid amount. Example: /deposit 0.01");
    return;
  }
  try {
    const tx = await lendingPool.depositRBTC({ value: ethers.utils.parseEther(amount) });
    const receipt = await tx.wait();
    await ctx.reply(
      [
        `✅ Deposited ${amount} RBTC`,
        `Tx: ${receipt.transactionHash}`,
        `Explorer: ${formatTx(receipt.transactionHash)}`
      ].join("\n")
    );
  } catch (error) {
    await ctx.reply(`Deposit failed: ${error.message}`);
  }
});

bot.command("borrow", async (ctx) => {
  const amount = parseAmount(ctx.message.text.split(" ").slice(1).join(" "));
  if (!amount) {
    await ctx.reply("Invalid amount. Example: /borrow 100");
    return;
  }
  try {
    const borrowRaw = ethers.utils.parseUnits(amount, USDT0_DECIMALS);
    const tx = await lendingPool.borrowUSDT0(borrowRaw);
    const receipt = await tx.wait();
    await ctx.reply(
      [
        `✅ Borrowed ${amount} USDT0`,
        `Tx: ${receipt.transactionHash}`,
        `Explorer: ${formatTx(receipt.transactionHash)}`
      ].join("\n")
    );
  } catch (error) {
    await ctx.reply(`Borrow failed: ${error.message}`);
  }
});

bot.command("repay", async (ctx) => {
  const amount = parseAmount(ctx.message.text.split(" ").slice(1).join(" "));
  if (!amount) {
    await ctx.reply("Invalid amount. Example: /repay 50");
    return;
  }
  try {
    const repayRaw = ethers.utils.parseUnits(amount, USDT0_DECIMALS);
    const approveTx = await usdt0.approve(lendingPool.address, repayRaw);
    await approveTx.wait();
    const repayTx = await lendingPool.repayUSDT0(repayRaw);
    const receipt = await repayTx.wait();
    await ctx.reply(
      [
        `✅ Repaid ${amount} USDT0`,
        `Tx: ${receipt.transactionHash}`,
        `Explorer: ${formatTx(receipt.transactionHash)}`
      ].join("\n")
    );
  } catch (error) {
    await ctx.reply(`Repay failed: ${error.message}`);
  }
});

bot.command("withdraw", async (ctx) => {
  const amount = parseAmount(ctx.message.text.split(" ").slice(1).join(" "));
  if (!amount) {
    await ctx.reply("Invalid amount. Example: /withdraw 0.001");
    return;
  }
  try {
    const withdrawRaw = ethers.utils.parseEther(amount);
    const tx = await lendingPool.withdrawRBTC(withdrawRaw);
    const receipt = await tx.wait();
    await ctx.reply(
      [
        `✅ Withdrew ${amount} RBTC`,
        `Tx: ${receipt.transactionHash}`,
        `Explorer: ${formatTx(receipt.transactionHash)}`
      ].join("\n")
    );
  } catch (error) {
    await ctx.reply(`Withdraw failed: ${error.message}`);
  }
});

bot.catch(async (error, ctx) => {
  await ctx.reply(`Unhandled bot error: ${error.message}`);
});

bot.launch().then(() => {
  console.log(`Telegram bot started on ${CHAIN_NAME}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`LendingPool: ${lendingPool.address}`);
  console.log(`USDT0: ${usdt0.address}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
