# RBTC/USDT0 Mini Lending Boilerplate (Replit/Cookbook-friendly)

> **Goal:** a tiny, runnable boilerplate that shows how to:
> - deposit **RBTC (native)** as collateral,
> - **borrow USDT0 (ERC-20, 6 decimals)**,
> - query prices via a simple **UmbrellaOracleAdapter** (mock),
> - and compute **health factor** — all in a few minutes.

⚠️ **Educational only. Not audited. Do NOT deploy to mainnet.**

---

## Quick Start (local / Replit)

1) **Install** (first run only):
```bash
npm install
```

2) **Run the end‑to‑end demo** (compiles + deploys locally + interacts):
```bash
npm run demo
```

You will see logs like:
- deployer & user addresses
- deployed contract addresses (USDT0, Oracle, Pool)
- account snapshots after **deposit**, **borrow**, **repay**, **withdraw**

> On Hardhat, the "native RBTC" is just the local chain's native coin. The boilerplate treats it as RBTC for consistency.

---

## Deploy to Rootstock (optional)

1) Copy `.env.example` → `.env`, fill in:
```
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RSK_TESTNET_RPC=https://public-node.testnet.rsk.co
RSK_MAINNET_RPC=https://public-node.rsk.co
```

2) Replace the mock USDT0 with a real token:
- In real deployments, point the **LendingPool** constructor to the **real USDT0 address**.
- Keep the oracle mapping: `address(0)` stands for native **RBTC**; `address(USDT0)` for USDT0.

3) Prices:
- This boiler uses **UmbrellaOracleAdapter** with owner‑settable prices.
- For a real integration, replace it with a production oracle (e.g. RedStone/Umbrella) and keep the `IPriceOracle` interface.

Then run your custom deployment using:
`npx hardhat run --network rskTestnet scripts/demo-testnet.js`

---

## Contracts Overview (minimal unit)

- **contracts/LendingPool.sol**  
  Core logic to deposit native **RBTC**, borrow **USDT0**, check solvency with **LTV**, compute **health factor**.
  - `depositRBTC()` payable
  - `borrowUSDT0(amount)`
  - `repayUSDT0(amount)`
  - `withdrawRBTC(amount)`
  - `getAccountData(user)` returns collateral/debt in tokens + **USD** and **HF**

- **contracts/oracles/UmbrellaOracleAdapter.sol**  
  Simple, owner‑settable prices (USD with **18 decimals**). Replace this with a real oracle adapter later.

- **contracts/interfaces/IPriceOracle.sol**  
  Minimal interface: `getPrice(asset) → priceE18`

- **contracts/tokens/MockUSDT0.sol**  
  ERC‑20 with **6 decimals**, mintable. Used only for quick demos.

**Decimals & math**:
- Oracle returns **USD price with 18 decimals** for both assets.
- RBTC has **18 decimals**, USDT0 has **6 decimals**. The pool normalizes to **1e18** for USD math.

---

## Minimal Interaction Examples

- **Deposit** 0.01 RBTC:
```js
await pool.depositRBTC({ value: ethers.parseEther("0.01") });
```

- **Borrow** 400 USDT0:
```js
await pool.borrowUSDT0(ethers.parseUnits("400", 6));
```

- **Repay** 200 USDT0:
```js
await usdt0.approve(poolAddr, ethers.parseUnits("200", 6));
await pool.repayUSDT0(ethers.parseUnits("200", 6));
```

- **Withdraw** 0.002 RBTC (keeps HF ≥ 1):
```js
await pool.withdrawRBTC(ethers.parseEther("0.002"));
```

- **Set prices** in the mock adapter (owner only):
```js
await oracle.setBatch(
  [ethers.ZeroAddress, usdt0Addr],
  [ethers.parseUnits("65000", 18), ethers.parseUnits("1", 18)]
);
```

---

## What’s deliberately **omitted** (to keep it tiny)

- Interest accrual (no time‑based rates)
- aTokens/cTokens or interest‑bearing receipts
- Liquidations, close/liq factors
- Pause/role systems beyond `Ownable`
- Multiple collateral/borrow assets
- Real oracle wiring (we use a minimal mock adapter)

This is a **first step** you can fork and extend into a full money market.

---

## File Tree

```
contracts/
  interfaces/IPriceOracle.sol
  LendingPool.sol
  oracles/UmbrellaOracleAdapter.sol
  tokens/MockUSDT0.sol
scripts/
  demo.js
  demo-testnet.js
hardhat.config.js
package.json
.env.example
README.md
```

---

## License

MIT for the boilerplate. OpenZeppelin contracts are under their own license.
