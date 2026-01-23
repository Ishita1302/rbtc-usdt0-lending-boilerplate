const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting verification on localhost...");

  
  const addressPath = path.join(__dirname, "../frontend/src/abis/contract-address.json");
  if (!fs.existsSync(addressPath)) {
    throw new Error("contract-address.json not found! Run 'npm run demo' first.");
  }
  const addresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));
  console.log("Loaded addresses:", addresses);

  
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const pool = LendingPool.attach(addresses.LendingPool);

  const MockUSDT0 = await hre.ethers.getContractFactory("MockUSDT0");
  const usdt0 = MockUSDT0.attach(addresses.USDT0);

  const signers = await hre.ethers.getSigners();
  const user = signers[1]; // Use account #1
  console.log("Testing with user:", user.address);

  const initialBal = await hre.ethers.provider.getBalance(user.address);
  console.log("Initial RBTC Balance:", hre.ethers.formatEther(initialBal));

  const initialAccountData = await pool.getAccountData(user.address);
  const initialCollateral = initialAccountData[0];
  console.log("Initial Collateral:", hre.ethers.formatEther(initialCollateral));

  const initialDebt = initialAccountData[1];
  console.log("Initial Debt:", hre.ethers.formatUnits(initialDebt, 6));

  console.log("\n[1] Testing Deposit...");
  const depositAmount = hre.ethers.parseEther("1.0"); // 1 RBTC
  const txDeposit = await pool.connect(user).depositRBTC({ value: depositAmount });
  await txDeposit.wait();
  
  let accountData = await pool.getAccountData(user.address);
  const expectedCollateral = initialCollateral + depositAmount;
  if (accountData[0] !== expectedCollateral) {
    throw new Error(`Deposit failed. Expected ${expectedCollateral}, got ${accountData[0]}`);
  }
  console.log("✅ Deposit successful. New Collateral:", hre.ethers.formatEther(accountData[0]));

  console.log("\n[2] Testing Borrow...");
  const borrowAmount = hre.ethers.parseUnits("500", 6);
  const txBorrow = await pool.connect(user).borrowUSDT0(borrowAmount);
  await txBorrow.wait();

  accountData = await pool.getAccountData(user.address);
  const userUsdtBalance = await usdt0.balanceOf(user.address);
  
  const expectedDebt = initialDebt + borrowAmount;

  if (accountData[1] !== expectedDebt) {
    throw new Error(`Borrow failed. Debt mismatch. Expected ${expectedDebt}, got ${accountData[1]}`);
  }
  console.log("✅ Borrow successful. New Debt:", hre.ethers.formatUnits(accountData[1], 6));
  console.log("   Health Factor:", hre.ethers.formatUnits(accountData[5], 18));

  console.log("\n[3] Testing Repay...");
  const repayAmount = hre.ethers.parseUnits("200", 6);
  
   
  const txApprove = await usdt0.connect(user).approve(addresses.LendingPool, repayAmount);
  await txApprove.wait();
  console.log("   Approved USDT0 for repay");

  const txRepay = await pool.connect(user).repayUSDT0(repayAmount);
  await txRepay.wait();

  accountData = await pool.getAccountData(user.address);
  const expectedDebtAfterRepay = expectedDebt - repayAmount;
  
  if (accountData[1] !== expectedDebtAfterRepay) {
    throw new Error(`Repay failed. Expected debt ${expectedDebtAfterRepay}, got ${accountData[1]}`);
  }
  console.log("✅ Repay successful. New Debt:", hre.ethers.formatUnits(accountData[1], 6));

  console.log("\n[4] Testing Withdraw...");
  const withdrawAmount = hre.ethers.parseEther("0.1");
  const preWithdrawBal = await hre.ethers.provider.getBalance(user.address);
  
  const txWithdraw = await pool.connect(user).withdrawRBTC(withdrawAmount);
  const receipt = await txWithdraw.wait();
  
  const gasUsed = receipt.gasUsed * receipt.gasPrice;
  const postWithdrawBal = await hre.ethers.provider.getBalance(user.address);
  
  const expectedBal = preWithdrawBal + withdrawAmount - gasUsed;
  console.log("   Balance change:", hre.ethers.formatEther(postWithdrawBal - preWithdrawBal));
  
  accountData = await pool.getAccountData(user.address);
  const expectedCollateralAfterWithdraw = expectedCollateral - withdrawAmount;
  
  if (accountData[0] !== expectedCollateralAfterWithdraw) {
    throw new Error(`Withdraw failed. Expected collateral ${expectedCollateralAfterWithdraw}, got ${accountData[0]}`);
  }
  console.log("✅ Withdraw successful. New Collateral:", hre.ethers.formatEther(accountData[0]));

  console.log("\n🎉 ALL VALIDATION CHECKS PASSED!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
