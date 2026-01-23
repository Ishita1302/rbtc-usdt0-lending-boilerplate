const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting dust deposit verification on localhost...");

  
  const addressPath = path.join(__dirname, "../frontend/src/abis/contract-address.json");
  if (!fs.existsSync(addressPath)) {
    throw new Error("contract-address.json not found! Run 'npm run demo' first.");
  }
  const addresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));

  
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const pool = LendingPool.attach(addresses.LendingPool);

  
  const signers = await hre.ethers.getSigners();
  const user = signers.length > 3 ? signers[3] : signers[0]; // Use account #3 if available, else deployer
  console.log("Testing with user:", user.address);

  
  const dustAmount = hre.ethers.parseEther("0.0000001"); // 1e11 wei
  console.log(`\n[1] Attempting to deposit a dust amount: ${hre.ethers.formatEther(dustAmount)} RBTC...`);

  try {
    const txDeposit = await pool.connect(user).depositRBTC({ value: dustAmount });
    await txDeposit.wait();
    console.log("✅ Dust deposit transaction was successful.");

    const accountData = await pool.getAccountData(user.address);
    console.log("New Collateral:", hre.ethers.formatEther(accountData[0]));
    const collateralUSD = hre.ethers.formatUnits(accountData[2], 18);
    console.log("New Collateral USD:", collateralUSD);
    if (parseFloat(collateralUSD) <= 0) {
      throw new Error("Validation Error: Collateral USD value is zero or less after deposit.");
    }
    console.log("✅ Collateral USD value is greater than zero.");

  } catch (error) {
    console.error("❌ Dust deposit failed. Analyzing error...");
    console.error(error.message);
    if (error.reason) {
        console.error("Revert Reason:", error.reason);
    }
    // Re-throwing the error to make sure the script exits with a failure code
    throw error;
  }
}

main().catch((error) => {
  console.error("Script failed:", error.message);
  process.exitCode = 1;
});
