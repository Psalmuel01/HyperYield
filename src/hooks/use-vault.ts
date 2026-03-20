import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/sonner';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface UserPosition {
  shares: number;
  dotValue: number;
  yieldEarned: number;
  yieldPercent: number;
  depositTimestamp: number | null;
}

export interface VaultState {
  totalDOT: number;
  totalShares: number;
  sharePrice: number;
  apy: number;
  userCount: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'xcm_dispatch' | 'yield_accrual';
  user: string;
  amount: number;
  shares?: number;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'dispatched';
  txHash: string;
}

const MOCK_APY = 15.2;
const INITIAL_SHARE_PRICE = 1.0;

const generateTxHash = () =>
  '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const shortenAddress = (addr: string) =>
  addr.slice(0, 6) + '...' + addr.slice(-4);

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'deposit', user: '0x7a3b...4f2e', amount: 250, shares: 243.9, timestamp: Date.now() - 120000, status: 'confirmed', txHash: generateTxHash() },
  { id: '2', type: 'xcm_dispatch', user: '0x7a3b...4f2e', amount: 250, timestamp: Date.now() - 118000, status: 'confirmed', txHash: generateTxHash() },
  { id: '3', type: 'deposit', user: '0x9c1d...8a3f', amount: 500, shares: 487.8, timestamp: Date.now() - 60000, status: 'confirmed', txHash: generateTxHash() },
  { id: '4', type: 'yield_accrual', user: 'vault', amount: 0.42, timestamp: Date.now() - 30000, status: 'confirmed', txHash: generateTxHash() },
  { id: '5', type: 'xcm_dispatch', user: '0x9c1d...8a3f', amount: 500, timestamp: Date.now() - 58000, status: 'dispatched', txHash: generateTxHash() },
];

export function useVault() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [dotBalance, setDotBalance] = useState(100);
  const [pendingTx, setPendingTx] = useState<{ type: string; hash: string } | null>(null);

  const [vaultState, setVaultState] = useState<VaultState>({
    totalDOT: 12847.5,
    totalShares: 12532.1,
    sharePrice: 1.0252,
    apy: MOCK_APY,
    userCount: 47,
  });

  const [userPosition, setUserPosition] = useState<UserPosition>({
    shares: 0,
    dotValue: 0,
    yieldEarned: 0,
    yieldPercent: 0,
    depositTimestamp: null,
  });

  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  const connectWallet = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum?.request) {
      toast.error('No EVM wallet detected. Please install MetaMask or another wallet.');
      return;
    }

    try {
      const accountsUnknown = await ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = Array.isArray(accountsUnknown)
        ? accountsUnknown.filter((a): a is string => typeof a === 'string')
        : [];
      const account = accounts[0];
      if (!account) {
        toast.error('No account selected in the wallet.');
        return;
      }

      setWalletAddress(account);
      setConnected(true);
      // Placeholder until the contract integration is wired up.
      setDotBalance(100);
    } catch (err: unknown) {
      // Common: user rejected request.
      toast.error(err instanceof Error ? `Wallet connection failed: ${err.message}` : 'Wallet connection failed.');
    }
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;

    const onAccountsChanged = (accountsUnknown: unknown) => {
      const accounts = Array.isArray(accountsUnknown)
        ? accountsUnknown.filter((a): a is string => typeof a === 'string')
        : [];
      const account = accounts[0] ?? '';
      if (!account) {
        setConnected(false);
        setWalletAddress('');
        setUserPosition({ shares: 0, dotValue: 0, yieldEarned: 0, yieldPercent: 0, depositTimestamp: null });
        return;
      }
      setWalletAddress(account);
    };

    // Keep state aligned when the user switches accounts.
    ethereum.on('accountsChanged', onAccountsChanged);
    return () => {
      ethereum.removeListener?.('accountsChanged', onAccountsChanged);
    };
    // Intentionally does not depend on callbacks/state to keep listener stable.
  }, []);

  const disconnectWallet = useCallback(() => {
    setConnected(false);
    setWalletAddress('');
    setUserPosition({ shares: 0, dotValue: 0, yieldEarned: 0, yieldPercent: 0, depositTimestamp: null });
  }, []);

  const deposit = useCallback((amount: number) => {
    if (amount <= 0 || amount > dotBalance) return;

    const txHash = generateTxHash();
    setPendingTx({ type: 'Depositing DOT & dispatching XCM to Bifrost', hash: txHash });

    setTimeout(() => {
      const shares = amount / vaultState.sharePrice;
      const newUserShares = userPosition.shares + shares;
      const newDotValue = newUserShares * vaultState.sharePrice;

      setDotBalance(prev => prev - amount);
      setUserPosition({
        shares: newUserShares,
        dotValue: newDotValue,
        yieldEarned: newDotValue - (userPosition.dotValue > 0 ? userPosition.dotValue - userPosition.yieldEarned + amount : amount),
        yieldPercent: 0,
        depositTimestamp: userPosition.depositTimestamp || Date.now(),
      });
      setVaultState(prev => ({
        ...prev,
        totalDOT: prev.totalDOT + amount,
        totalShares: prev.totalShares + shares,
        userCount: userPosition.shares === 0 ? prev.userCount + 1 : prev.userCount,
      }));

      const short = shortenAddress(walletAddress);
      setTransactions(prev => [
        { id: Date.now().toString(), type: 'deposit', user: short, amount, shares, timestamp: Date.now(), status: 'confirmed', txHash },
        { id: (Date.now() + 1).toString(), type: 'xcm_dispatch', user: short, amount, timestamp: Date.now(), status: 'dispatched', txHash: generateTxHash() },
        ...prev,
      ]);

      setPendingTx(null);
    }, 2500);
  }, [dotBalance, vaultState.sharePrice, userPosition, walletAddress]);

  const withdraw = useCallback((shareAmount: number) => {
    if (shareAmount <= 0 || shareAmount > userPosition.shares) return;

    const txHash = generateTxHash();
    setPendingTx({ type: 'Redeeming vDOT via XCM from Bifrost', hash: txHash });

    setTimeout(() => {
      const dotAmount = shareAmount * vaultState.sharePrice;
      const newShares = userPosition.shares - shareAmount;
      const newDotValue = newShares * vaultState.sharePrice;

      setDotBalance(prev => prev + dotAmount);
      setUserPosition({
        shares: newShares,
        dotValue: newDotValue,
        yieldEarned: newShares > 0 ? userPosition.yieldEarned * (newShares / userPosition.shares) : 0,
        yieldPercent: newShares > 0 ? userPosition.yieldPercent : 0,
        depositTimestamp: newShares > 0 ? userPosition.depositTimestamp : null,
      });
      setVaultState(prev => ({
        ...prev,
        totalDOT: prev.totalDOT - dotAmount,
        totalShares: prev.totalShares - shareAmount,
        userCount: newShares === 0 ? prev.userCount - 1 : prev.userCount,
      }));

      const short = shortenAddress(walletAddress);
      setTransactions(prev => [
        { id: Date.now().toString(), type: 'withdraw', user: short, amount: dotAmount, shares: shareAmount, timestamp: Date.now(), status: 'confirmed', txHash },
        ...prev,
      ]);

      setPendingTx(null);
    }, 3000);
  }, [userPosition, vaultState.sharePrice, walletAddress]);

  return {
    connected,
    walletAddress,
    dotBalance,
    vaultState,
    userPosition,
    transactions,
    pendingTx,
    connectWallet,
    disconnectWallet,
    deposit,
    withdraw,
  };
}
