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

 
  const { writeContract: deposit, data: depositTxHash, isPending: isDepositPending } = useWriteContract();
  const { writeContract: withdraw, data: withdrawTxHash, isPending: isWithdrawPending } = useWriteContract();
  const { writeContract: borrow, data: borrowTxHash, isPending: isBorrowPending } = useWriteContract();
  const { writeContract: repay, data: repayTxHash, isPending: isRepayPending } = useWriteContract();
  const { writeContract: approve, data: approveTxHash, isPending: isApprovePending } = useWriteContract();

  
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
    }
  }, [isDepositSuccess, isWithdrawSuccess, isBorrowSuccess, isRepaySuccess, isApproveSuccess]);

  const handleDeposit = () => {
    if (!depositAmount) return;
    deposit({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'depositRBTC',
      value: parseEther(depositAmount),
    });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount) return;
    withdraw({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'withdrawRBTC',
      args: [parseEther(withdrawAmount)],
    });
  };

  const handleBorrow = () => {
    if (!borrowAmount) return;
    borrow({
      address: addresses.LendingPool,
      abi: LendingPoolABI,
      functionName: 'borrowUSDT0',
      args: [parseUnits(borrowAmount, 6)], // USDT0 has 6 decimals
    });
  };

  const handleRepay = () => {
    if (!repayAmount) return;
    const amount = parseUnits(repayAmount, 6);
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
  const healthFactor = accountData ? formatUnits(accountData[5], 18) : '0';

  return (
    <div className="space-y-6">
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
             <p className="text-xs text-gray-500">Available to Borrow: Check Max Debt USD</p>
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
                {isApprovePending || isApproveConfirming ? 'Approving...' : (isRepayPending || isRepayConfirming ? 'Repaying...' : 'Repay')}
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
