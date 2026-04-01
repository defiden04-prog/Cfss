import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Shield, Search, Wallet, Zap, Lock } from 'lucide-react';
import SolanaLogo from './SolanaLogo';

const STEPS = [
  { id: 'connect',   icon: Shield,   label: 'Secure Connection',      sublabel: 'Establishing encrypted channel...' },
  { id: 'verify',    icon: Search,   label: 'Verifying Wallet',        sublabel: 'Confirming ownership on-chain...' },
  { id: 'eligibility', icon: Lock,   label: 'Analyzing Eligibility',   sublabel: 'Scanning empty token accounts...' },
  { id: 'sign',      icon: Wallet,   label: 'Signing Transaction',     sublabel: 'Preparing batch instructions...' },
  { id: 'broadcast', icon: Zap,      label: 'Broadcasting to Network', sublabel: 'Sending to Solana validators...' },
];

export default function AccountClaimModal({ 
  isOpen, 
  totalAccounts, 
  totalSol, 
  onProceed, 
  onCancel,
  onClose,
  executing = false,
  completed = false,
  signature = null
}) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [simulationDone, setSimulationDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(-1);
      setSimulationDone(false);
      return;
    }
    if (executing || completed) return; // Don't run simulation if already executing

    // Simulate step-by-step progress
    let step = 0;
    setCurrentStep(0);
    const advance = () => {
      step += 1;
      if (step < STEPS.length) {
        setCurrentStep(step);
        setTimeout(advance, 600 + Math.random() * 400);
      } else {
        setSimulationDone(true);
      }
    };
    const t = setTimeout(advance, 800 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [isOpen, executing, completed]);

  const progress = completed ? 100 : executing ? 90 : simulationDone ? 100 : currentStep >= 0 ? Math.round(((currentStep) / STEPS.length) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="w-full max-w-md bg-zinc-950 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)] mx-auto"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-emerald-500/15 bg-emerald-500/5 flex items-center gap-3">
              <motion.div
                animate={{ rotate: (simulationDone || completed) ? 0 : 360 }}
                transition={{ duration: 2, repeat: (simulationDone || completed) ? 0 : Infinity, ease: 'linear' }}
              >
                <SolanaLogo className="w-5 h-5 text-emerald-400" />
              </motion.div>
              <span className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">
                {completed ? 'transaction_confirmed' : executing ? 'executing_on_chain...' : simulationDone ? 'ready_to_extract' : 'pre_claim_audit...'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${completed ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className="text-[10px] text-emerald-400/70 tabular-nums">{progress}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="p-6">
              {!completed ? (
                <>
                  {/* Steps List */}
                  {!executing && (
                    <div className="space-y-3 mb-6">
                      {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const isActive = i === currentStep && !simulationDone;
                        const isComplete = simulationDone || i < currentStep;
                        return (
                          <motion.div key={step.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded border flex items-center justify-center ${isComplete ? 'bg-emerald-500/20 border-emerald-500/50' : isActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 opacity-30'}`}>
                              {isComplete ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Icon className="w-3 h-3 text-slate-500" />}
                            </div>
                            <span className={`text-[11px] ${isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-slate-600'}`}>{step.label}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {executing && (
                    <div className="py-8 text-center space-y-4">
                      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto opacity-50" />
                      <div className="space-y-1">
                        <p className="text-sm text-white font-bold">Broadcasting Transaction</p>
                        <p className="text-[10px] text-slate-500">Waiting for Solana cluster confirmation...</p>
                      </div>
                    </div>
                  )}

                  {/* Summary & Warnings */}
                  {simulationDone && !executing && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">net_extraction</p>
                            <div className="flex items-center gap-2">
                              <SolanaLogo className="w-5 h-5 text-emerald-400" />
                              <span className="text-2xl font-bold tabular-nums text-emerald-400">
                                {totalSol.toFixed(4)} SOL
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">accounts</p>
                            <p className="text-lg font-mono text-white">{totalAccounts}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-500 text-xs font-bold hover:bg-white/5 transition-all">cancel</button>
                        <button onClick={onProceed} className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2">
                          <Zap className="w-4 h-4" />
                          EXTRACT SOL
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                /* SUCCESS VIEW */
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center space-y-6">
                  <div className="relative inline-block">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/50 mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-emerald-400/20 rounded-full" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Claim Successful!</h2>
                    <p className="text-xs text-slate-400">Your SOL has been reclaimed and sent to your wallet.</p>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 inline-flex items-center gap-3 mx-auto">
                    <SolanaLogo className="w-5 h-5" />
                    <span className="text-xl font-bold text-emerald-400">+{totalSol.toFixed(4)} SOL</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {signature && (
                      <a 
                        href={`https://solscan.io/tx/${signature}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full px-4 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        VIEW ON SOLSCAN
                      </a>
                    )}
                    <button onClick={onCancel} className="w-full px-4 py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all">
                      BACK TO SCANNER
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
