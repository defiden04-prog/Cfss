import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';

import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
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
  const { connected, connecting, publicKey, disconnect, signTransaction, signAllTransactions, sendTransaction } = useSolanaWallet();
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

  // wallet object — expose sendTransaction for Phantom Lighthouse guard compatibility
  const wallet = useMemo(() => ({
    signTransaction: signTransaction ? (tx) => signTransaction(tx) : null,
    signAllTransactions: signAllTransactions ? (txs) => signAllTransactions(txs) : null,
    // Provide a descriptive fallback for sendTransaction to prevent Crashes
    sendTransaction: (tx, conn, opts) => {
        if (!sendTransaction) {
            console.warn('Wallet: sendTransaction called before initialization');
            throw new Error('Wallet not ready. If this persists, please refresh and reconnect.');
        }
        return sendTransaction(tx, conn, opts);
    },
  }), [signTransaction, signAllTransactions, sendTransaction]);

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
  // PhantomWalletAdapter is required for mobile deep-linking to work on standard browsers (Safari/Chrome)
  // Metadata for Phantom verification (Site Name, Icon, Logo)
  const wallets = useMemo(() => [
    new PhantomWalletAdapter({
      appConfig: {
        name: 'Claim Free Solana',
        icon: 'https://claimfreesolana.fun/logo.png', // Ensure this points to an actual logo
        url: 'https://claimfreesolana.fun'
      }
    }),
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

