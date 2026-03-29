import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useSolPrice } from './SolPriceContext';
import SolanaLogo from './SolanaLogo';

export default function SolHeaderTicker() {
  const { price, change, flash } = useSolPrice();

  if (!price) return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-600 text-xs font-mono animate-pulse">
      <SolanaLogo className="w-3.5 h-3.5" />
      <span>SOL ···</span>
    </div>
  );

  const isPositive = change >= 0;

  return (
    <motion.div
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors duration-300 ${
        flash === 'up'
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : flash === 'down'
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-black/40 border-emerald-500/20 text-emerald-400'
      }`}
      animate={flash ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <SolanaLogo className="w-3.5 h-3.5" />
      <span className="text-slate-300 font-semibold">SOL</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={price}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="tabular-nums text-white"
        >
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.span>
      </AnimatePresence>
      <span className={`flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    </motion.div>
  );
}
