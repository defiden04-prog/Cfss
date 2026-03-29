import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SolPriceTicker() {
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(null);
  const [flash, setFlash] = useState(null); // 'up' | 'down'
  const prevPrice = useRef(null);

  const fetchPrice = async () => {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
    );
    const data = await res.json();
    const newPrice = data?.solana?.usd;
    const newChange = data?.solana?.usd_24h_change;

    if (newPrice && prevPrice.current !== null) {
      setFlash(newPrice > prevPrice.current ? 'up' : newPrice < prevPrice.current ? 'down' : null);
      setTimeout(() => setFlash(null), 600);
    }
    prevPrice.current = newPrice;
    setPrice(newPrice);
    setChange24h(newChange);
  };

  useEffect(() => {
    fetchPrice();
    const t = setInterval(fetchPrice, 20000); // refresh every 20s
    return () => clearInterval(t);
  }, []);

  if (!price) return null;

  const isPositive = change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors duration-300 ${
        flash === 'up'
          ? 'bg-emerald-500/20 border-emerald-500/50'
          : flash === 'down'
          ? 'bg-red-500/10 border-red-500/40'
          : 'bg-black/60 border-emerald-500/20'
      }`}
    >
      <span className="text-slate-500">SOL</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={price}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="text-emerald-400 font-medium tabular-nums"
        >
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.span>
      </AnimatePresence>
      <span className={`flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change24h).toFixed(2)}%
      </span>
    </motion.div>
  );
}
