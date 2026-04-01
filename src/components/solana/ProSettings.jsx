import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from './WalletProvider';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction, SystemProgram, PublicKey, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { createCloseAccountInstruction } from '@solana/spl-token';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Bell, RefreshCw, Activity, Lock, Unlock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import SolanaLogo from './SolanaLogo';
import { useSolPrice } from './SolPriceContext';

const SWEEP_THRESHOLDS = [
  { value: '1', label: '1 account (instant)' },
  { value: '3', label: '3 accounts' },
  { value: '5', label: '5 accounts' },
  { value: '10', label: '10 accounts' },
];

const POLL_INTERVAL_MS = 30_000;
const PRO_FEE_SOL = 0.5; // SOL to unlock Pro features
const PRO_FEE_LAMPORTS = 0.5 * 1e9;
const FEE_WALLET = new PublicKey('B9973oc9rAtQ6SN4HuXhkWGHefSi8RazEcJW6fU5rZ4z');
const IS_DEVNET = false;

const PRO_FEATURES = [
  'Auto-sweep on schedule',
  'Custom sweep threshold',
  'Real-time wallet monitoring',
  'Activity log (20 events)',
  'Manual trigger override',
];

export default function ProSettings() {
  const { connected, publicKey, wallet, connection, fetchBalance, balance } = useWallet();
  const { price: solPrice } = useSolPrice();

  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('pro_unlocked') === 'true');
  const [unlocking, setUnlocking] = useState(false);

  const [autoSweepEnabled, setAutoSweepEnabled] = useState(() => localStorage.getItem('autoSweep_enabled') === 'true');
  const [threshold, setThreshold] = useState(() => localStorage.getItem('autoSweep_threshold') || '5');
  const [sweepLog, setSweepLog] = useState([]);
  const [polling, setPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const pollRef = useRef(null);
  const sweeping = useRef(false);

  useEffect(() => {
    localStorage.setItem('autoSweep_enabled', autoSweepEnabled.toString());
    localStorage.setItem('autoSweep_threshold', threshold.toString());
  }, [autoSweepEnabled, threshold]);

  useEffect(() => {
    if (unlocked && autoSweepEnabled && connected && publicKey) startPolling();
    else stopPolling();
    return () => stopPolling();
  }, [unlocked, autoSweepEnabled, connected, publicKey]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  };

  const startPolling = () => {
    stopPolling();
    checkAndSweep();
    pollRef.current = setInterval(checkAndSweep, POLL_INTERVAL_MS);
    setPolling(true);
  };

  const unlockPro = async () => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Connect your wallet first');
      return;
    }
    if (balance < (PRO_FEE_SOL + 0.005)) {
      toast.error(`Insufficient balance. Need ~${PRO_FEE_SOL + 0.005} SOL (0.5 + fees)`);
      return;
    }
    setUnlocking(true);
    try {
      if (PRO_FEE_SOL > 0) {
        // 1. FRESH BLOCKHASH
        let { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const tx = new Transaction();
        
        // 2. COMPUTE BUDGET
        // Set Price: 250k microLamports
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250000 }));
        // Set Limit: 50k (Simple transfer)
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }));

        // 3. PRO UNLOCK PAYMENT
        tx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: FEE_WALLET,
            lamports: Math.floor(PRO_FEE_LAMPORTS)
          })
        );

        // 4. SECURITY MEMO
        tx.add(new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
          programId: new PublicKey('MemoSq4gqABAXDe96zce8cZtxqAKet8uxS2ndJqB91W'),
          data: Buffer.from(`CFS_PRO_UNLOCK:${publicKey.toString().slice(0, 8)}`),
        }));

        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        // 5. HYGIENIC SIMULATION
        toast.info('Simulating transaction...');
        const simulation = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true });
        if (simulation.value.err) {
          const errStatus = JSON.stringify(simulation.value.err);
          console.error('Pro Unlock Simulation Failed:', simulation.value.logs);
          
          if (errStatus.includes('0x1')) {
             throw new Error('Insufficient SOL for Pro Unlock + network priority fees. Please add ~0.01 SOL.');
          } else if (errStatus.includes('BlockhashNotFound')) {
             throw new Error('Network timeout during simulation. Please retry.');
          }
          throw new Error('Simulation Failed: ' + errStatus);
        }

        // 6. REFRESH BLOCKHASH BEFORE SIGN
        const freshBlock = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = freshBlock.blockhash;
        blockhash = freshBlock.blockhash;
        lastValidBlockHeight = freshBlock.lastValidBlockHeight;

        toast.info('Please sign in your wallet');
        const sig = await wallet.sendTransaction(tx, connection, {
          skipPreflight: true, // We did it manually
          maxRetries: 3,
        });

        toast.info('Confirming on-chain...');
        const res = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
        
        if (res.value.err) throw new Error('Transaction landed but failed on-chain — check balance & retry');

        toast.success('Pro unlocked! Account now prioritized.');
      } else {
        toast.success('Pro unlocked! (Testing mode: 0 fee)');
      }

      localStorage.setItem('pro_unlocked', 'true');
      setUnlocked(true);
      fetchBalance();
    } catch (err) {
      console.error('Pro Unlock Error:', err);
      const errMsg = err.message || 'Unknown error';
      if (errMsg.includes('User rejected')) {
        toast.error('Transaction cancelled by user');
      } else if (errMsg.includes('Insufficient balance') || errMsg.includes('0x1')) {
        toast.error('Insufficient SOL (Need 0.5 + fees)');
      } else if (errMsg.includes('Blockhash not found')) {
        toast.error('Network timeout. Please retry now.');
      } else {
        toast.error('Unlock Failed: ' + (errMsg.slice(0, 60) || 'Check SOL balance for fees'));
      }
    } finally {
      setUnlocking(false);
    }
  };

  const checkAndSweep = async () => {
    if (!publicKey || !wallet || sweeping.current) return;
    setLastChecked(new Date());
    try {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID })
      ]);
      const empty = [
        ...tokenAccounts.value.map(acc => ({ ...acc, programId: TOKEN_PROGRAM_ID })),
        ...token2022Accounts.value.map(acc => ({ ...acc, programId: TOKEN_2022_PROGRAM_ID }))
      ].filter(acc => {
        const amt = acc.account.data.parsed.info.tokenAmount.uiAmount;
        return amt === 0 || amt === null;
      });
      const thresholdNum = parseInt(threshold, 10);
      if (empty.length >= thresholdNum) {
        addLog(`sweep_triggered: ${empty.length} empty accounts (threshold: ${thresholdNum})`);
        await autoSweep(empty);
      } else {
        addLog(`scan_ok: ${empty.length} empty accounts (below threshold ${thresholdNum})`);
      }
    } catch (err) {
      addLog(`error: ${err.message}`);
    }
  };

  const autoSweep = async (emptyAccounts) => {
    if (!wallet?.signAllTransactions) { addLog('error: wallet missing signAllTransactions'); return; }
    sweeping.current = true;
    const MAX_PER_TX = 18;
    const numBatches = Math.ceil(emptyAccounts.length / MAX_PER_TX);
    let totalReclaimed = 0;
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const transactions = [];
      const batchMeta = [];
      for (let i = 0; i < numBatches; i++) {
        const batch = emptyAccounts.slice(i * MAX_PER_TX, (i + 1) * MAX_PER_TX);
        const tx = new Transaction();
        
        // Add Priority Fees for Auto-Sweep batches
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 150000 }));
        
        batch.forEach(acc => tx.add(createCloseAccountInstruction(acc.pubkey, publicKey, publicKey, [], acc.programId)));
        
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
        transactions.push(tx);
        batchMeta.push(batch);
      }
      const signedTxs = await wallet.signAllTransactions(transactions);
      for (let i = 0; i < signedTxs.length; i++) {
        const sig = await connection.sendRawTransaction(signedTxs[i].serialize());
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
        const batchSOL = batchMeta[i].reduce((s, a) => s + (a.account.lamports || 0), 0) / 1e9;
        totalReclaimed += batchSOL;
      }
      addLog(`auto_sweep_complete: reclaimed ${totalReclaimed.toFixed(6)} SOL from ${emptyAccounts.length} accounts`);
      toast.success(`Auto-Sweep: reclaimed ${totalReclaimed.toFixed(6)} SOL!`);
      fetchBalance();
    } catch (err) {
      addLog(`sweep_error: ${err.message}`);
      toast.error('Auto-Sweep failed: ' + err.message);
    } finally {
      sweeping.current = false;
    }
  };

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setSweepLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  // ── Lock Screen ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    const fiatDisplay = solPrice ? `($${(PRO_FEE_SOL * solPrice).toFixed(2)})` : '';
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      >
        {/* Glowing lock card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/5 via-black/60 to-emerald-500/5 border border-yellow-500/30 rounded-xl p-8 text-center">
          {/* Background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.06),transparent_70%)] pointer-events-none" />

          <motion.div
            animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0px rgba(234,179,8,0)', '0 0 30px rgba(234,179,8,0.3)', '0 0 0px rgba(234,179,8,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="inline-flex p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl mb-6"
          >
            <Lock className="w-8 h-8 text-yellow-400" />
          </motion.div>

          <h3 className="text-xl text-white font-mono font-semibold mb-1">PRO_ACCESS</h3>
          <p className="text-slate-500 text-xs mb-6">// unlock advanced automation for power users</p>

          {/* Features list */}
          <div className="text-left mb-8 space-y-2 max-w-xs mx-auto">
            {PRO_FEATURES.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-2 text-xs font-mono text-slate-400"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {f}
              </motion.div>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="px-5 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">one-time payment</p>
              <div className="flex items-center justify-center gap-2">
                <SolanaLogo className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl text-yellow-400 font-semibold">{PRO_FEE_SOL} SOL</span>
                {fiatDisplay && <span className="text-xs text-slate-500">{fiatDisplay}</span>}
              </div>
              {IS_DEVNET && <p className="text-[10px] text-yellow-600/60 mt-1">// devnet: minimal test tx</p>}
            </div>
          </div>

          {/* @ts-ignore */}
          <Button
            onClick={unlockPro}
            disabled={unlocking || !connected}
            className="w-full max-w-xs bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-bold py-3 rounded-xl transition-all"
          >
            {unlocking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />confirming_tx...</>
            ) : !connected ? (
              <><Lock className="w-4 h-4 mr-2" />connect_wallet_first</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" />unlock_pro — {PRO_FEE_SOL} SOL</>
            )}
          </Button>

          {!connected && (
            <p className="text-[10px] text-slate-600 mt-3">connect your wallet to proceed</p>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Unlocked PRO UI ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* Pro Badge Header */}
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(234,179,8,0)', '0 0 18px rgba(234,179,8,0.15)', '0 0 0px rgba(234,179,8,0)'] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 border border-yellow-500/20 rounded-lg"
      >
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Shield className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-yellow-400 font-mono font-medium">PRO_SETTINGS</p>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono"
            >
              ACTIVE
            </motion.span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">// advanced automation unlocked</p>
        </div>
        <button
          onClick={() => { localStorage.removeItem('pro_unlocked'); setUnlocked(false); }}
          className="ml-auto text-[10px] text-slate-700 hover:text-red-500 font-mono transition-colors"
        >
          revoke
        </button>
      </motion.div>

      {/* Auto-Sweep Card */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-mono">auto_sweep</span>
          </div>
          <div className="flex items-center gap-3">
            {polling && (
              <div className="flex items-center gap-1.5">
                <motion.span
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                />
                <span className="text-[10px] text-emerald-500/70 font-mono">monitoring</span>
              </div>
            )}
            {/* @ts-ignore */}
            <Switch
              disabled={!unlocked}
              checked={autoSweepEnabled}
              onCheckedChange={(val) => {
                if (!connected) { toast.error('Connect wallet first'); return; }
                setAutoSweepEnabled(val);
                if (val) toast.success('Auto-Sweep enabled — monitoring wallet');
                else toast.success('Auto-Sweep disabled');
              }}
            />
          </div>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Automatically monitors your wallet every 30 seconds and triggers a cleanup transaction
            when the number of empty token accounts reaches your threshold.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-600 uppercase tracking-widest">sweep_threshold</label>
            {/* @ts-ignore */}
            <Select value={threshold} onValueChange={setThreshold} disabled={!autoSweepEnabled}>
              {/* @ts-ignore */}
              <SelectTrigger className="bg-black/60 border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent className="bg-black border-emerald-500/20">
                {SWEEP_THRESHOLDS.map(t => (
                  /* @ts-ignore */
                  <SelectItem key={t.value} value={t.value} className="text-xs font-mono">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-600">// triggers cleanup when ≥ {threshold} empty accounts detected</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/60 border border-emerald-500/10 rounded-lg px-4 py-3">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">status</p>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${autoSweepEnabled && connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                <p className="text-xs text-emerald-400">{autoSweepEnabled && connected ? 'active' : 'inactive'}</p>
              </div>
            </div>
            <div className="bg-black/60 border border-emerald-500/10 rounded-lg px-4 py-3">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">last_check</p>
              <p className="text-xs text-slate-400">{lastChecked ? lastChecked.toLocaleTimeString() : '—'}</p>
            </div>
          </div>

          {autoSweepEnabled && connected && (
            <button
              onClick={checkAndSweep}
              className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              trigger_manual_check
            </button>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400/50" />
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">sweep_activity_log</p>
          <span className="ml-auto text-[10px] text-slate-700">{sweepLog.length} events</span>
        </div>
        {sweepLog.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Bell className="w-6 h-6 text-slate-800 mx-auto mb-2" />
            <p className="text-slate-700 text-xs">// no activity yet — enable auto-sweep to start</p>
          </div>
        ) : (
          <div className="divide-y divide-emerald-500/5 max-h-52 overflow-y-auto">
            <AnimatePresence>
              {sweepLog.map((entry, i) => (
                <motion.div
                  key={`${entry}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-5 py-2.5"
                >
                  <p className={`text-xs font-mono ${
                    entry.includes('complete') ? 'text-emerald-400' :
                    entry.includes('error') ? 'text-red-400' :
                    entry.includes('triggered') ? 'text-yellow-400' :
                    'text-slate-600'
                  }`}>{entry}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 px-4 py-3 bg-black/40 border border-slate-800 rounded-lg">
        <Bell className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Auto-Sweep runs while this tab is open. Wallet signing is required for each sweep transaction.
        </p>
      </div>
    </motion.div>
  );
}
