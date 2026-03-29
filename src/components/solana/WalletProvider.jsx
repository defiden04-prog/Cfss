import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';

import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const MAINNET_RPC = clusterApiUrl('devnet');

// Internal context that bridges adapter → our app's API shape
const AppWalletContext = createContext(null);

function AppWalletBridge({ children }) {
  const { connected, connecting, publicKey, disconnect, signTransaction, signAllTransactions } = useSolanaWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    const bal = await connection.getBalance(publicKey);
    setBalance(bal / 1e9);
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) fetchBalance();
    else setBalance(0);
  }, [connected, publicKey, fetchBalance]);

  // wallet object with signTransaction method from the adapter hook directly
  const wallet = useMemo(() => ({
    signTransaction: signTransaction ? (tx) => signTransaction(tx) : null,
    signAllTransactions: signAllTransactions ? (txs) => signAllTransactions(txs) : null,
  }), [signTransaction, signAllTransactions]);

  return (
    <AppWalletContext.Provider value={{
      wallet,
      publicKey,
      connected,
      connecting,
      balance,
      connection,
      fetchBalance,
      disconnect,
    }}>
      {children}
    </AppWalletContext.Provider>
  );
}

export function WalletProvider({ children }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={MAINNET_RPC} config={{ commitment: 'confirmed' }}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppWalletBridge>
            {children}
          </AppWalletBridge>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export function useWallet() {
  const ctx = useContext(AppWalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
