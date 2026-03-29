import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';

import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Use a browser-friendly RPC — the default public endpoint blocks browser requests (403)
const MAINNET_RPC = 'https://mainnet.helius-rpc.com/?api-key=2fd5f291-f1cd-4f86-8311-5254d60ff008';

// Internal context that bridges adapter → our app's API shape
const AppWalletContext = createContext(null);

function AppWalletBridge({ children }) {
  const { connected, connecting, publicKey, disconnect, signTransaction, signAllTransactions } = useSolanaWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
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
  // Phantom auto-registers as Standard Wallet — no need for PhantomWalletAdapter
  const wallets = useMemo(() => [
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

