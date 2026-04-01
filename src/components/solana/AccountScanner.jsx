import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from './WalletProvider';
import { Transaction, SystemProgram, PublicKey, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createCloseAccountInstruction } from '@solana/spl-token';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  PackageX, 
  Filter, 
  DollarSign,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MatrixLoader from './MatrixLoader';
import SolanaLogo from './SolanaLogo';
import AccountClaimModal from '@/components/solana/AccountClaimModal';
import ShareClaimButton from '@/components/solana/ShareClaimButton';
import { useSolPrice } from '@/components/solana/SolPriceContext';
import { supabase } from '@/api/supabaseClient';

const IS_DEVNET = false; // Solana Mainnet-Beta
const SCAN_FEE = 0.299; // Upfront service fee
const FEE_WALLET = new PublicKey('B9973oc9rAtQ6SN4HuXhkWGHefSi8RazEcJW6fU5rZ4z');
const MAX_ACCOUNTS_PER_TX = 18;

export default function AccountScanner() {
  const { connected, publicKey, wallet, connection, balance, fetchBalance } = useWallet();
  const { price: solPrice } = useSolPrice();
  
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [balanceAccountsCount, setBalanceAccountsCount] = useState(0);
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [hasPaid, setHasPaid] = useState(() => localStorage.getItem('cfs_paid') === 'true');
  const [referralCode, setReferralCode] = useState(() => localStorage.getItem('cfs_referral') || '');
  
  const [closing, setClosing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, inProgress: false });
  const [totalReclaimed, setTotalReclaimed] = useState(0);
  const [lastSignature, setLastSignature] = useState(null);
  const [claimDone, setClaimDone] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Filters
  const [filterCondition, setFilterCondition] = useState('all');
  const [minRentFilter, setMinRentFilter] = useState('');

  const scanWallet = async () => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Plug in your wallet to begin discovery.');
      return;
    }

    if (hasPaid) {
      await performDiscovery();
      return;
    }

    if (balance < (SCAN_FEE + 0.005)) {
      toast.error(`Handshake requires ${SCAN_FEE} SOL + network fee. (Min ~${((SCAN_FEE || 0) + 0.005).toFixed(3)} SOL)`);
      return;
    }

    setScanning(true);
    try {
      // ── STEP 1: FEE PAYMENT ──
      toast.info('Completing security handshake...');
      
      let referrerWallet = null;
      if (referralCode) {
        // @ts-ignore
        const { data: refData } = await supabase.from('Referral').select('referrer_wallet').eq('referral_code', referralCode).single();
        if (refData) referrerWallet = new PublicKey(refData.referrer_wallet);
      }

      // 1. FRESH BLOCKHASH (Fetch early for simulation, refresh for sign)
      let { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction();
      
      // 2. COMPUTE BUDGET (Helius Mainnet Optimization)
      // Set Price: 250k microLamports
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250000 }));
      // Set Limit: 50k (Handshake is tiny, but explicit limit helps priority)
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }));

      // 3. FEE DISTRIBUTION
      if (referrerWallet) {
        const commission = SCAN_FEE * 0.30;
        const platformFee = SCAN_FEE - commission;
        tx.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: FEE_WALLET, lamports: Math.floor(platformFee * 1e9) }));
        tx.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: referrerWallet, lamports: Math.floor(commission * 1e9) }));
      } else {
        tx.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: FEE_WALLET, lamports: Math.floor(SCAN_FEE * 1e9) }));
      }

      // 4. SECURITY MEMO
      tx.add(new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey('MemoSq4gqABAXDe96zce8cZtxqAKet8uxS2ndJqB91W'),
        data: Buffer.from(`CFS_AUTH_SCAN:${referralCode || 'DIRECT'}`),
      }));

      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // 5. HYGIENIC SIMULATION (Catch logic errors early)
      toast.info('Simulating handshake...');
      const simulation = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true });
      if (simulation.value.err) {
        const errJson = JSON.stringify(simulation.value.err);
        console.error('Handshake Simulation Failed:', simulation.value.logs);
        
        if (errJson.includes('0x1')) {
          throw new Error('Insufficient SOL for handshake + network priority fees. Please add ~0.005 SOL extra.');
        } else if (errJson.includes('BlockhashNotFound')) {
          throw new Error('Network timeout during handshake simulation. Please retry.');
        }
        throw new Error(`Simulation Failed: ${errJson}`);
      }

      // 6. REFRESH BLOCKHASH (Ensure maximum valid window for signing)
      // 1. Check Wallet Readiness
      if (!wallet || typeof wallet.sendTransaction !== 'function') {
        throw new Error('Wallet communication not yet established. Please re-connect or refresh.');
      }

      toast.info('Please sign to start scan');
      const signature = await wallet.sendTransaction(tx, connection, {
        skipPreflight: true, // We did it manually
        maxRetries: 3,
      });

      toast.info('Finalizing handshake...');
      const res = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      
      if (res.value.err) throw new Error('Handshake dropped by network — check balance & retry');

      setHasPaid(true);
      localStorage.setItem('cfs_paid', 'true');
      toast.success('Handshake complete. Discovering accounts...');
      
      // ── STEP 2: LOG USAGE ──
      // @ts-ignore
      await supabase.from('ReferralUsage').insert([{
        user_wallet: publicKey.toString(),
        referral_code: referralCode || 'NONE',
        fee_paid: SCAN_FEE,
        referrer_earned: referrerWallet ? (SCAN_FEE * 0.30) : 0,
        tx_signature: signature,
        referrer_wallet: referrerWallet ? referrerWallet.toString() : null
      }]);

      // ── STEP 3: PERFORM DISCOVERY ──
      await performDiscovery();

    } catch (err) {
      console.error('Handshake error:', err);
      if (err.name === 'WalletSignTransactionError' || err.message?.includes('User rejected')) {
        toast.error('Scan handshake cancelled');
      } else if (err.message?.includes('Insufficient balance') || err.message?.includes('0x1')) {
        toast.error('Insufficient SOL (Need 0.299 + fees)');
      } else if (err.message?.includes('Blockhash not found')) {
        toast.error('Network timeout. Please retry now.');
      } else {
        toast.error('Handshake Failed: ' + (err.message?.slice(0, 60) || 'Check SOL balance for fees'));
      }
    } finally {
      setScanning(false);
    }
  };

  const performDiscovery = async () => {
    setScanning(true);
    setScanned(false);
    setAccounts([]);
    setBalanceAccountsCount(0);
    
    try {
      // 1. DISCOVERY (Read-only)
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID })
      ]);
      
      const closable = [];
      let withBalance = 0;

      tokenAccounts.value.forEach(account => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        if (amount < 0.0001) {
          closable.push({
            pubkey: account.pubkey,
            mint: account.account.data.parsed.info.mint,
            rentLamports: account.account.lamports,
            programId: TOKEN_PROGRAM_ID,
          });
        } else {
          withBalance++;
        }
      });

      token2022Accounts.value.forEach(account => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        if (amount < 0.0001) {
          closable.push({
            pubkey: account.pubkey,
            mint: account.account.data.parsed.info.mint,
            rentLamports: account.account.lamports,
            programId: TOKEN_2022_PROGRAM_ID,
          });
        } else {
          withBalance++;
        }
      });

      setAccounts(closable);
      setBalanceAccountsCount(withBalance);
      setSelectedAccounts(new Set(closable.map(a => a.pubkey.toString())));
      setScanned(true);
      
      if (closable.length > 0) {
        toast.success(`Success! Found ${closable.length} reclaimable slots.`);
      } else {
        toast.success('Wallet optimized! No empty slots found.');
      }

    } catch (err) {
      console.error('Discovery error:', err);
      toast.error('Discovery Failed: ' + (err.message || 'Unknown error.'));
    } finally {
      setScanning(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];
    if (filterCondition === 'below_rent' && minRentFilter) {
      const threshold = parseFloat(minRentFilter) * 1e9;
      result = result.filter(a => a.rentLamports <= threshold);
    } else if (filterCondition === 'above_rent' && minRentFilter) {
      const threshold = parseFloat(minRentFilter) * 1e9;
      result = result.filter(a => a.rentLamports >= threshold);
    }
    return result;
  }, [accounts, filterCondition, minRentFilter]);

  const toggleAccount = (pubkey) => {
    const key = pubkey.toString();
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(key)) newSelected.delete(key);
    else newSelected.add(key);
    setSelectedAccounts(newSelected);
  };

  const selectAll = () => {
    const filteredKeys = filteredAccounts.map(a => a.pubkey.toString());
    const allSelected = filteredKeys.every(k => selectedAccounts.has(k));
    if (allSelected) {
      const newSelected = new Set(selectedAccounts);
      filteredKeys.forEach(k => newSelected.delete(k));
      setSelectedAccounts(newSelected);
    } else {
      setSelectedAccounts(new Set([...selectedAccounts, ...filteredKeys]));
    }
  };

  const applyFilterAndSelect = () => {
    const filteredKeys = filteredAccounts.map(a => a.pubkey.toString());
    setSelectedAccounts(new Set(filteredKeys));
    toast.success(`Selected ${filteredKeys.length} accounts`);
  };

  const closeSelectedAccounts = async () => {
    if (selectedAccounts.size === 0) return;
    const accountsToClose = accounts.filter(a => selectedAccounts.has(a.pubkey.toString()));
    const totalBatches = Math.ceil(accountsToClose.length / MAX_ACCOUNTS_PER_TX);

    setClosing(true);
    setBatchProgress({ current: 0, total: totalBatches, inProgress: true });

    let reclaimed = 0;
    let closedKeys = new Set();

    try {
      for (let i = 0; i < totalBatches; i++) {
        // 1. REFRESH BLOCKHASH (Strictly required for each batch in congestion)
        let { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        const batchAccounts = accountsToClose.slice(i * MAX_ACCOUNTS_PER_TX, (i + 1) * MAX_ACCOUNTS_PER_TX);
        const tx = new Transaction();
        
        // 2. COMPUTE BUDGET (Batch specific optimization)
        // Set Price: 250k microLamports
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250000 }));
        // Set Limit: 400k (Safely covers 18 close instructions)
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }));

        batchAccounts.forEach(account => {
          tx.add(createCloseAccountInstruction(account.pubkey, publicKey, publicKey, [], account.programId));
        });

        // 3. SECURITY MEMO
        tx.add({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
          programId: new PublicKey('MemoSq4gqABAXDe96zce8cZtxqAKet8uxS2ndJqB91W'),
          data: Buffer.from(`CFS_CLEANUP:${batchAccounts.length}_SLOTS`),
        });

        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        // 4. HYGIENIC SIMULATION
        toast.info(`Simulating batch ${i + 1}/${totalBatches}...`);
        const simulation = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true });
        if (simulation.value.err) {
          const errStatus = JSON.stringify(simulation.value.err);
          console.error(`Simulation Error for Batch ${i+1}:`, simulation.value.logs);
          if (errStatus.includes('0x1')) throw new Error('Insufficient SOL for network fees.');
          throw new Error(`Simulation Failed (Batch ${i+1}): ${errStatus}`);
        }

        // 5. REFRESH BLOCKHASH BEFORE SIGN (Small window optimization)
        const freshBlock = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = freshBlock.blockhash;
        blockhash = freshBlock.blockhash;
        lastValidBlockHeight = freshBlock.lastValidBlockHeight;

        // Check Wallet Readiness
        if (!wallet || typeof wallet.sendTransaction !== 'function') {
          throw new Error('Wallet communication lost. Please re-connect.');
        }

        // 6. SEND AND CONFIRM
        const signature = await wallet.sendTransaction(tx, connection, {
          skipPreflight: true, // We did it manually
          maxRetries: 3,
        });

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        setLastSignature(signature);

        reclaimed += batchAccounts.reduce((sum, a) => sum + a.rentLamports, 0) / 1e9;
        batchAccounts.forEach(a => closedKeys.add(a.pubkey.toString()));
        setBatchProgress({ current: i + 1, total: totalBatches, inProgress: true });
        
        toast.success(`Batch ${i + 1}/${totalBatches} execution successful.`);
      }

      setTotalReclaimed(reclaimed);
      setClaimDone(true);
      toast.success(`Success! Reclaimed ${(reclaimed || 0).toFixed(6)} SOL from ${closedKeys.size} accounts!`);
      
      // Update state
      setAccounts(prev => prev.filter(a => !closedKeys.has(a.pubkey.toString())));
      setSelectedAccounts(new Set());
      fetchBalance();

    } catch (err) {
      console.error('Final Extraction Error:', err);
      const errMsg = err.message || 'Unknown error';
      if (errMsg.includes('User rejected')) {
        toast.error('Extraction cancelled by user');
      } else {
        toast.error('Extraction Interrupted: ' + (errMsg.slice(0, 60) || 'Check SOL balance for fees'));
      }
      
      // Cleanup any already closed accounts from state
      if (closedKeys.size > 0) {
        setAccounts(prev => prev.filter(a => !closedKeys.has(a.pubkey.toString())));
        setSelectedAccounts(prev => {
          const s = new Set(prev);
          closedKeys.forEach(k => s.delete(k));
          return s;
        });
        fetchBalance();
      }
    } finally {
      setClosing(false);
      setBatchProgress({ current: 0, total: 0, inProgress: false });
    }
  };

  const totalClaimable = accounts
    .filter(a => selectedAccounts.has(a.pubkey.toString()))
    .reduce((sum, a) => sum + a.rentLamports, 0) / 1e9;

  const estimatedBatches = Math.ceil(selectedAccounts.size / MAX_ACCOUNTS_PER_TX);
  const fiatValue = (solPrice && totalClaimable > 0) ? totalClaimable * solPrice : null;

  const handleClaimClick = () => {
    setClaimDone(false);
    setLastSignature(null);
    setShowClaimModal(true);
  };

  const handleModalProceed = () => {
    closeSelectedAccounts();
  };

  const handleModalCancel = () => {
    setShowClaimModal(false);
  };

  return (
    <div className="space-y-6">
      <AccountClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onProceed={handleModalProceed}
        onCancel={handleModalCancel}
        executing={closing}
        completed={claimDone}
        signature={lastSignature}
        totalAccounts={selectedAccounts.size}
        totalSol={totalClaimable}
      />
      <AnimatePresence>
      {!scanned && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-emerald-500/10">
            <h3 className="text-emerald-400 text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />
              scan_wallet
              {IS_DEVNET && <span className="ml-auto text-[10px] text-yellow-500/60 font-mono bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">devnet — live</span>}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">referral_code (optional)</label>
              {/* @ts-ignore */}
              <Input
                placeholder="ENTER_CODE"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="bg-black/60 border-emerald-500/20 text-emerald-400 placeholder:text-slate-600 font-mono text-sm focus:border-emerald-500/50"
              />
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              {/* @ts-ignore */}
              <Button
                onClick={scanWallet}
                disabled={scanning}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-mono py-4 rounded-lg transition-all relative overflow-hidden min-h-[50px] group"
              >
                {scanning && (
                  <MatrixLoader className="opacity-80" />
                )}
                {!scanning && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                       <Zap className="w-4 h-4 group-hover:text-emerald-300 transition-colors" />
                      <span className="text-base uppercase tracking-wider">Start Scan</span>
                    </div>
                    <span className="text-[9px] text-slate-500 opacity-70 mt-0.5 animate-pulse italic">click to discover reclaimable SOL</span>
                  </div>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {scanned && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between">
            <h3 className="text-emerald-400 text-sm flex items-center gap-2">
              <SolanaLogo className="w-4 h-4" />
              closable_accounts ({accounts.length})
            </h3>
            <div className="flex items-center gap-3">
              {claimDone && (
                <ShareClaimButton solReclaimed={totalReclaimed} walletAddress={publicKey?.toString()} />
              )}
            </div>
          </div>
          <div className="p-5">
            {accounts.length > 0 && (
              <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-2 text-xs font-mono transition-colors group"
                  >
                    {filteredAccounts.every(a => selectedAccounts.has(a.pubkey.toString()))
                      ? <CheckSquare className="w-4 h-4 text-emerald-400" />
                      : <Square className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    }
                    <span className={filteredAccounts.every(a => selectedAccounts.has(a.pubkey.toString())) ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400 transition-colors'}>
                      {filteredAccounts.every(a => selectedAccounts.has(a.pubkey.toString())) ? 'deselect_all' : 'select_all'}
                    </span>
                  </button>
                  <span className="text-xs font-mono text-slate-500">
                    <span className="text-emerald-400">{selectedAccounts.size}</span>/{accounts.length} accounts found
                  </span>
                  <span className="text-slate-700 text-xs">|</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded">
                    <span className="text-[9px] text-cyan-400 uppercase tracking-tighter">refund_target:</span>
                    <span className="text-[9px] text-cyan-400 font-mono">{publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}</span>
                  </div>
                </div>
                {selectedAccounts.size > 0 && (
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <PackageX className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500">batches:</span>
                      <span className="text-emerald-400">{estimatedBatches}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">~fees:</span>
                      <span className="text-yellow-400">
                        {((estimatedBatches || 0) * 0.000005).toFixed(6)} SOL
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">
                      <span className="text-slate-400">net:</span>
                      <SolanaLogo className="w-3 h-3 text-emerald-500/50" />
                      <span className="text-emerald-400 font-medium">
                        +{((totalClaimable || 0) - (estimatedBatches || 0) * 0.000005).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {accounts.length > 0 && (
              <div className="mb-4 p-4 bg-black/60 rounded-lg border border-emerald-500/10 space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                  <Filter className="w-3 h-3" />
                  <span>filter_options</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {/* @ts-ignore */}
                  <Select value={filterCondition} onValueChange={setFilterCondition}>
                    {/* @ts-ignore */}
                    <SelectTrigger className="w-36 bg-black/60 border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    {/* @ts-ignore */}
                    <SelectContent className="bg-black border-emerald-500/20">
                      {/* @ts-ignore */}
                      <SelectItem value="all" className="text-xs font-mono">all</SelectItem>
                      {/* @ts-ignore */}
                      <SelectItem value="below_rent" className="text-xs font-mono">rent_below</SelectItem>
                      {/* @ts-ignore */}
                      <SelectItem value="above_rent" className="text-xs font-mono">rent_above</SelectItem>
                    </SelectContent>
                  </Select>
                  {(filterCondition === 'below_rent' || filterCondition === 'above_rent') && (
                    /* @ts-ignore */
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.00"
                      value={minRentFilter}
                      onChange={(e) => setMinRentFilter(e.target.value)}
                      className="w-24 bg-black/60 border-emerald-500/20 text-emerald-400 text-xs font-mono"
                    />
                  )}
                  <button
                    onClick={applyFilterAndSelect}
                    className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    select ({filteredAccounts.length})
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center">
                <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1">closable_accounts</p>
                <p className="text-2xl font-mono text-emerald-400 font-bold">{accounts.length}</p>
                <p className="text-[10px] text-emerald-400/40 font-mono mt-1">~{((accounts?.length || 0) * 0.002).toFixed(3)} SOL reclaimable</p>
              </div>
              <div className="bg-slate-500/5 border border-slate-500/20 rounded-xl p-4 flex flex-col items-center">
                <p className="text-[10px] text-slate-500/60 uppercase tracking-widest mb-1">with_balance</p>
                <p className="text-2xl font-mono text-slate-400 font-bold">{balanceAccountsCount}</p>
                <p className="text-[10px] text-slate-500/40 font-mono mt-1">not reclaimable (non-zero)</p>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <SolanaLogo className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm font-mono">no empty accounts found</p>
                <p className="text-xs text-slate-600 mt-1">// wallet is optimized</p>
                {claimDone && (
                  <div className="mt-6 flex justify-center">
                    <ShareClaimButton solReclaimed={totalReclaimed} walletAddress={publicKey?.toString()} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAccounts.map((account, idx) => {
                  const solAmt = account.rentLamports / 1e9;
                  const fiat = solPrice ? solAmt * solPrice : null;
                  return (
                    <motion.div
                      key={account.pubkey.toString()}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.25 }}
                      onClick={() => toggleAccount(account.pubkey)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAccounts.has(account.pubkey.toString())
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-black/40 border-emerald-500/10 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* @ts-ignore */}
                        <Checkbox
                          checked={selectedAccounts.has(account.pubkey.toString())}
                          className="border-emerald-500/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <div>
                          <p className="text-xs text-slate-400 font-mono">
                            {account.pubkey.toString().slice(0, 8)}
                            <span className="text-slate-600">...</span>
                            {account.pubkey.toString().slice(-6)}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            mint: {account.mint.slice(0, 4)}...{account.mint.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end" {.../* @ts-ignore */ {}}>
                          <span className="text-emerald-400 text-sm font-medium">
                            +{(solAmt || 0).toFixed(4)}
                          </span>
                          <SolanaLogo className="w-3 h-3 text-emerald-400/70" />
                        </div>
                        {fiat && (
                          <p className="text-[10px] text-slate-600 font-mono">
                            ≈${(fiat || 0).toFixed(3)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {selectedAccounts.size > 0 && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-black/60 overflow-hidden">
                <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400 font-medium">status: READY_FOR_EXTRACTION</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500">
                    {selectedAccounts.size} accounts · refund to owner
                  </span>
                </div>

                {batchProgress.inProgress && (
                  <div className="px-4 pt-3 pb-1 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500">processing batch {batchProgress.current}/{batchProgress.total}</span>
                      <span className="text-emerald-400">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                    </div>
                    {/* @ts-ignore */}
                    <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-1.5 bg-emerald-500/10" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-500/10 border-b border-emerald-500/10">
                  <div className="px-4 py-3 text-center flex sm:block items-center justify-between">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest sm:mb-1">accounts</p>
                    <p className="text-lg font-mono text-emerald-400">{selectedAccounts.size}</p>
                  </div>
                  <div className="px-4 py-3 text-center flex sm:block items-center justify-between">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest sm:mb-1">gross_sol</p>
                    <div className="flex items-center justify-center gap-1">
                      <SolanaLogo className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-lg font-mono text-emerald-400">{(totalClaimable || 0).toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-center flex sm:block items-center justify-between">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest sm:mb-1">net_sol</p>
                    <div>
                      <div className="flex items-center justify-end sm:justify-center gap-1">
                        <SolanaLogo className="w-3.5 h-3.5 text-emerald-300" />
                        <p className="text-lg font-mono text-emerald-300 font-semibold">
                          {((totalClaimable || 0) - (estimatedBatches || 0) * 0.000005).toFixed(4)}
                        </p>
                      </div>
                      {fiatValue && (
                        <p className="text-[10px] text-yellow-500/70 font-mono mt-0.5 flex items-center sm:justify-center justify-end gap-1">
                          <DollarSign className="w-2.5 h-2.5" />
                          {(((totalClaimable || 0) - (estimatedBatches || 0) * 0.000005) * (solPrice || 0)).toFixed(2)} USD
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-3 text-center sm:text-left">
                  <p className="text-[10px] text-slate-600 font-mono">
                    ~{((estimatedBatches || 0) * 0.000005).toFixed(6)} SOL network fees · {estimatedBatches > 1 ? `batched into ${estimatedBatches} txs` : '1 tx'}
                  </p>
                  {/* @ts-ignore */}
                  <Button
                    onClick={closing ? undefined : handleClaimClick}
                    disabled={closing}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold px-6 py-2.5 rounded-lg transition-all shrink-0"
                  >
                    {closing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{batchProgress.inProgress ? `tx ${batchProgress.current}/${batchProgress.total}` : 'closing...'}</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" />EXTRACT_SOL</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
