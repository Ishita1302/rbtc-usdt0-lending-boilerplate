import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import LendingPoolABI from '../abis/LendingPool.json';
import MockUSDT0ABI from '../abis/MockUSDT0.json';
import addresses from '../abis/contract-address.json';

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const { data: balanceData } = useBalance({ address });

  // Read Account Data
  const { data: accountData, refetch: refetchAccountData } = useReadContract({
    address: addresses.LendingPool,
    abi: LendingPoolABI,
    functionName: 'getAccountData',
    args: [address],
    query: {
        enabled: !!address,
        refetchInterval: 5000,
    }
  });

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: addresses.USDT0,
    abi: MockUSDT0ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
        enabled: !!address,
    }
  });

  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.USDT0,
    abi: MockUSDT0ABI,
    functionName: 'allowance',
    args: [address, addresses.LendingPool],
     query: {
        enabled: !!address,
    }
  });

 
  const { writeContract: deposit, data: depositTxHash, isPending: isDepositPending, isError: isDepositError, error: depositError } = useWriteContract();
  const { writeContract: withdraw, data: withdrawTxHash, isPending: isWithdrawPending, isError: isWithdrawError, error: withdrawError } = useWriteContract();
  const { writeContract: borrow, data: borrowTxHash, isPending: isBorrowPending, isError: isBorrowError, error: borrowError } = useWriteContract();
  const { writeContract: repay, data: repayTxHash, isPending: isRepayPending, isError: isRepayError, error: repayError } = useWriteContract();
  const { writeContract: approve, data: approveTxHash, isPending: isApprovePending, isError: isApproveError, error: approveError } = useWriteContract();

  const [notification, setNotification] = useState(null);

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });
  const { isLoading: isBorrowConfirming, isSuccess: isBorrowSuccess } = useWaitForTransactionReceipt({ hash: borrowTxHash });
  const { isLoading: isRepayConfirming, isSuccess: isRepaySuccess } = useWaitForTransactionReceipt({ hash: repayTxHash });
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });


  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess || isBorrowSuccess || isRepaySuccess || isApproveSuccess) {
      refetchAccountData();
      refetchUsdtBalance();
      refetchAllowance();
      setDepositAmount('');
      setWithdrawAmount('');
      setBorrowAmount('');
      setRepayAmount('');
      setNotification({ type: 'success', message: 'Transaction successful!' });
    }
  }, [isDepositSuccess, isWithdrawSuccess, isBorrowSuccess, isRepaySuccess, isApproveSuccess]);

  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  useEffect(() => {
    if (isDepositError) setNotification({ type: 'error', message: depositError?.shortMessage || depositError?.message || 'Deposit failed' });
    if (isWithdrawError) setNotification({ type: 'error', message: withdrawError?.shortMessage || withdrawError?.message || 'Withdraw failed' });
    if (isBorrowError) setNotification({ type: 'error', message: borrowError?.shortMessage || borrowError?.message || 'Borrow failed' });
    if (isRepayError) setNotification({ type: 'error', message: repayError?.shortMessage || repayError?.message || 'Repay failed' });
    if (isApproveError) setNotification({ type: 'error', message: approveError?.shortMessage || approveError?.message || 'Approval failed' });
  }, [isDepositError, isWithdrawError, isBorrowError, isRepayError, isApproveError]);

  const handleDeposit = () => {
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) {
        setNotification({ type: 'error', message: 'Please enter a valid positive amount.' });
        return;
    }
    if (balanceData && parseEther(depositAmount) > balanceData.value) {
        setNotification({ type: 'error', message: 'Insufficient RBTC balance.' });
        return;
    }
    deposit({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'depositRBTC',
      value: parseEther(depositAmount),
    });
  };

  const handleWithdraw = () => {
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num <= 0) {
        setNotification({ type: 'error', message: 'Please enter a valid positive amount.' });
        return;
    }
    // Check against max withdraw (simple check against collateral, though health factor matters more)
    // We won't strictly block here based on health factor as that's complex to calc on frontend perfectly without contract call,
    // but we can check against deposited amount.
    if (accountData && parseEther(withdrawAmount) > accountData[0]) {
         setNotification({ type: 'error', message: 'Exceeds deposited collateral.' });
         return;
    }

    withdraw({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'withdrawRBTC',
      args: [parseEther(withdrawAmount)],
    });
  };

  const handleBorrow = () => {
    const num = parseFloat(borrowAmount);
    if (isNaN(num) || num <= 0) {
        setNotification({ type: 'error', message: 'Please enter a valid positive amount.' });
        return;
    }
    // Check against available borrow
    const maxDebt = accountData ? accountData[4] : 0n;
    const currentDebt = accountData ? accountData[3] : 0n;
    const available = maxDebt > currentDebt ? maxDebt - currentDebt : 0n;
    // borrowAmount is in USDT0 (6 decimals), available is in USD (18 decimals).
    // Assuming 1 USDT0 = 1 USD for simplicity in check, or rigorous conversion.
    // The contract likely uses 18 decimals for internal accounting.
    // Let's rely on the contract to fail if health factor drops, but we can do a basic check.
    // accountData[4] is maxDebt in USD (1e18). borrowAmount is USDT (1e6).
    // 1 USDT ~= 1 USD.
    const borrowAmountE18 = parseUnits(borrowAmount, 18);
    if (borrowAmountE18 > available) {
        setNotification({ type: 'error', message: 'Exceeds available borrow limit.' });
        return;
    }

    borrow({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'borrowUSDT0',
      args: [parseUnits(borrowAmount, 6)], // USDT0 has 6 decimals
    });
  };

  const handleRepay = () => {
    const num = parseFloat(repayAmount);
    if (isNaN(num) || num <= 0) {
        setNotification({ type: 'error', message: 'Please enter a valid positive amount.' });
        return;
    }
    const amount = parseUnits(repayAmount, 6);
    if (usdtBalance && amount > usdtBalance) {
        setNotification({ type: 'error', message: 'Insufficient USDT0 balance.' });
        return;
    }

    if (usdtAllowance < amount) {
      approve({
        address: addresses.USDT0,
        abi: MockUSDT0ABI,
        functionName: 'approve',
        args: [addresses.LendingPool, amount],
      });
    } else {
      repay({
        address: addresses.LendingPool,
        abi: LendingPoolABI,
        functionName: 'repayUSDT0',
        args: [amount],
      });
    }
  };

  if (!isConnected) {
    return <div className="text-center p-8">Please connect your wallet to access the dashboard.</div>;
  }

  
  const collRbtc = accountData ? formatEther(accountData[0]) : '0';
  const debtUsdt0 = accountData ? formatUnits(accountData[1], 6) : '0';
  const collUsd = accountData ? formatUnits(accountData[2], 18) : '0';
  const debtUsd = accountData ? formatUnits(accountData[3], 18) : '0';
  const maxDebtUsd = accountData ? formatUnits(accountData[4], 18) : '0';
  const healthFactor = accountData ? formatUnits(accountData[5], 18) : '0';

  // Calculate available to borrow
  const availableToBorrow = accountData ? formatUnits(
      accountData[4] > accountData[3] ? accountData[4] - accountData[3] : 0n,
      18
  ) : '0';

  const isApprovalNeeded = repayAmount && usdtAllowance !== undefined && parseUnits(repayAmount, 6) > usdtAllowance;

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-md ${notification.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {notification.message}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Collateral (RBTC)</h3>
          <p className="text-2xl font-bold">{parseFloat(collRbtc).toFixed(4)} RBTC</p>
          <p className="text-sm text-gray-400">≈ ${parseFloat(collUsd).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Debt (USDT0)</h3>
          <p className="text-2xl font-bold">{parseFloat(debtUsdt0).toFixed(2)} USDT0</p>
          <p className="text-sm text-gray-400">≈ ${parseFloat(debtUsd).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Health Factor</h3>
          <p className={`text-2xl font-bold ${parseFloat(healthFactor) < 1.1 ? 'text-red-500' : 'text-green-500'}`}>
            {parseFloat(healthFactor) > 100 ? '> 100' : parseFloat(healthFactor).toFixed(4)}
          </p>
          <p className="text-sm text-gray-400">Liquidation at &lt; 1.0</p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold">Collateral Management</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Deposit RBTC</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                placeholder="0.0"
              />
              <button
                onClick={handleDeposit}
                disabled={isDepositPending || isDepositConfirming}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isDepositPending || isDepositConfirming ? 'Processing...' : 'Deposit'}
              </button>
            </div>
             <p className="text-xs text-gray-500">Wallet Balance: {balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'} RBTC</p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium">Withdraw RBTC</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                placeholder="0.0"
              />
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawPending || isWithdrawConfirming}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-300"
              >
                 {isWithdrawPending || isWithdrawConfirming ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
            <p className="text-xs text-gray-500">Max Withdraw: {parseFloat(collRbtc).toFixed(4)} RBTC (Subject to Health Factor)</p>
          </div>
        </div>

      
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold">Loan Management</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Borrow USDT0</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                placeholder="0.0"
              />
              <button
                onClick={handleBorrow}
                disabled={isBorrowPending || isBorrowConfirming}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-300"
              >
                {isBorrowPending || isBorrowConfirming ? 'Processing...' : 'Borrow'}
              </button>
            </div>
             <p className="text-xs text-gray-500">Available to Borrow: ${parseFloat(availableToBorrow).toFixed(2)}</p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium">Repay USDT0</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                placeholder="0.0"
              />
              <button
                onClick={handleRepay}
                disabled={isRepayPending || isRepayConfirming || isApprovePending || isApproveConfirming}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300"
              >
                {isApprovePending || isApproveConfirming ? 'Approving...' : 
                 isRepayPending || isRepayConfirming ? 'Repaying...' : 
                 isApprovalNeeded ? 'Approve' : 'Repay'}
              </button>
            </div>
             <p className="text-xs text-gray-500">Wallet Balance: {usdtBalance ? formatUnits(usdtBalance, 6) : '0'} USDT0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
