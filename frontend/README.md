# Frontend README

This README explains the purpose and usage of the frontend application for the RBTC/USDT0 Simple Lending Boilerplate.

The goal of this document is to:
- Clarify what lives in the `frontend/` folder
- Describe how this React dApp connects to the deployed lending contracts
- Provide basic instructions to install, run, and extend the UI

## Purpose

The `frontend/` folder contains a minimal React-based web interface that allows you to:
- Connect a wallet to Rootstock (or a local Hardhat network)
- Deposit RBTC as collateral
- Borrow and repay USDT0
- View account data such as collateral, debt, and health factor

This README exists to keep the frontend-specific information separate from the main project README, which focuses on contracts, scripts, and protocol behavior.

## Getting Started

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Then open the printed URL (usually `http://localhost:5173/`) in your browser.

## Customization

You can use this UI as a starting point to:
- Change styling or layout
- Add more views or metrics around the lending pool
- Integrate additional wallets, networks, or tokens

