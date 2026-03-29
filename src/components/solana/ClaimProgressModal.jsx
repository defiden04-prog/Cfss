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

export default function ClaimProgressModal({ visible, totalAccounts, totalSol, onProceed, onCancel }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCurrentStep(-1);
      setDone(false);
      return;
    }
    // Simulate step-by-step progress
    let step = 0;
    setCurrentStep(0);
    const advance = () => {
      step += 1;
      if (step < STEPS.length) {
        setCurrentStep(step);
        setTimeout(advance, 700 + Math.random() * 500);
      } else {
        setDone(true);
      }
    };
    const t = setTimeout(advance, 800 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [visible]);

  const progress = done ? 100 : currentStep >= 0 ? Math.round(((currentStep) / STEPS.length) * 100) : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-md bg-black border border-emerald-500/30 rounded-2xl overflow-hidden"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-emerald-500/15 bg-emerald-500/5 flex items-center gap-3">
              <motion.div
                animate={{ rotate: done ? 0 : 360 }}
                transition={{ duration: 2, repeat: done ? 0 : Infinity, ease: 'linear' }}
              >
                <SolanaLogo className="w-5 h-5 text-emerald-400" />
              </motion.div>
              <span className="text-emerald-400 text-sm font-medium">
                {done ? 'ready_to_execute' : 'preparing_claim...'}
              </span>
              <motion.div
                className="ml-auto text-xs text-emerald-400 tabular-nums"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: done ? 0 : Infinity }}
              >
                {progress}%
              </motion.div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-black/60 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              {!done && (
                <motion.div
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent"
                  animate={{ x: ['-100%', '700%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>

            {/* Steps */}
            <div className="px-6 py-5 space-y-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep && !done;
                const isComplete = done || i < currentStep;
                const isPending = i > currentStep && !done;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                      isComplete ? 'bg-emerald-500/20 border-emerald-500/50'
                      : isActive ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-black/40 border-white/5'
                    }`}>
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </motion.div>
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-slate-600'}`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-[10px] text-emerald-500/60 mt-0.5 truncate"
                        >
                          {step.sublabel}
                        </motion.p>
                      )}
                      {isComplete && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-emerald-500/50 mt-0.5"
                        >
                          ✓ complete
                        </motion.p>
                      )}
                    </div>

                    {/* Active pulse dot */}
                    {isActive && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Summary + CTA */}
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Summary box */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ready to claim</p>
                      <div className="flex items-center gap-1.5">
                        <SolanaLogo className="w-4 h-4 text-emerald-400" />
                        <span className="text-xl font-semibold text-emerald-400 tabular-nums">
                          +{totalSol.toFixed(4)} SOL
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5">{totalAccounts} accounts · 1 wallet popup</p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </motion.div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onCancel}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-slate-500 text-xs font-mono hover:border-white/20 hover:text-slate-300 transition-all"
                    >
                      cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onProceed}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      execute_claim
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
