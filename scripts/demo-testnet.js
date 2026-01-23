const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

 
  const MockUSDT0 = await hre.ethers.getContractFactory("MockUSDT0");
  const initialSupply = hre.ethers.parseUnits("1000000", 6); // 1,000,000
  const usdt0 = await MockUSDT0.deploy(initialSupply);
  await usdt0.waitForDeployment();
  const usdt0Addr = await usdt0.getAddress();
  const usdt0Decimals = await usdt0.decimals();
  const USDT0_SCALE = 10n ** BigInt(usdt0Decimals);
  console.log("USDT0  :", usdt0Addr, "decimals:", usdt0Decimals);

  
  const Oracle = await hre.ethers.getContractFactory("UmbrellaOracleAdapter");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("Oracle :", oracleAddr);

  const priceRBTC = hre.ethers.parseUnits("111000", 18); // $111,000
  const priceUSDT0 = hre.ethers.parseUnits("1", 18);    // $1
  await (await oracle.setBatch(
    [hre.ethers.ZeroAddress, usdt0Addr],
    [priceRBTC, priceUSDT0]
  )).wait();


  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const ltvBps = 7000;
  const pool = await LendingPool.deploy(usdt0Addr, oracleAddr, ltvBps);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("Pool   :", poolAddr);

  
  try {
    const fs = require("fs");
    const path = require("path");
    const frontendDir = path.join(__dirname, "../frontend/src/abis");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    const addresses = { USDT0: usdt0Addr, Oracle: oracleAddr, LendingPool: poolAddr };
    fs.writeFileSync(path.join(frontendDir, "contract-address.json"), JSON.stringify(addresses, null, 2));
    console.log("Addresses written to frontend/src/abis/contract-address.json");
  } catch (e) {
    console.warn("Failed to write addresses to frontend:", e.message);
  }

  
  const seedAmount = hre.ethers.parseUnits("100000", usdt0Decimals);
  await (await usdt0.transfer(poolAddr, seedAmount)).wait();

  
  const depositAmt = hre.ethers.parseEther("0.01"); // ajusta si quieres
  await (await pool.depositRBTC({ value: depositAmt })).wait();
  console.log("Deposited RBTC:", hre.ethers.formatEther(depositAmt));

  const printAccount = async (label) => {
    const d = await pool.getAccountData(deployer.address);
    console.log(`\n== ${label} ==`);
    console.log("Collateral (RBTC):", hre.ethers.formatEther(d[0]));
    console.log("Debt (USDT0)     :", hre.ethers.formatUnits(d[1], usdt0Decimals));
    console.log("Collateral USD   :", hre.ethers.formatUnits(d[2], 18));
    console.log("Debt USD         :", hre.ethers.formatUnits(d[3], 18));
    console.log("Max Debt USD     :", hre.ethers.formatUnits(d[4], 18));
    console.log("Health Factor    :", hre.ethers.formatUnits(d[5], 18));
  };

  await printAccount("After deposit");

  
  const data = await pool.getAccountData(deployer.address);
  const headroomUsdE18 = data[4] - data[3];
  const pUSDT0 = await oracle.getPrice(usdt0Addr);
  let borrowAmt = (headroomUsdE18 * USDT0_SCALE) / pUSDT0;
  borrowAmt = (borrowAmt * 95n) / 100n; // 95%
  if (borrowAmt === 0n) borrowAmt = 1n;
  await (await pool.borrowUSDT0(borrowAmt)).wait();
  console.log("Borrowed USDT0 ~", hre.ethers.formatUnits(borrowAmt, usdt0Decimals));
  await printAccount("After borrow");

  
  const repayAmt = (borrowAmt * 40n) / 100n; // 40% del préstamo
  await (await usdt0.approve(poolAddr, repayAmt)).wait();
  await (await pool.repayUSDT0(repayAmt)).wait();
  console.log("Repaid USDT0 ~", hre.ethers.formatUnits(repayAmt, usdt0Decimals));
  await printAccount("After repay");

  
  const withdrawAmt = hre.ethers.parseEther("0.002");
  await (await pool.withdrawRBTC(withdrawAmt)).wait();
  console.log("Withdrew RBTC:", hre.ethers.formatEther(withdrawAmt));
  await printAccount("After withdraw");

  console.log("\nDemo testnet completed ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
