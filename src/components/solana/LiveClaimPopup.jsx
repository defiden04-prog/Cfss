import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SolanaLogo from './SolanaLogo';

const WALLETS = [
  '7xKp', 'Bq3R', 'mN8f', 'Tz2W', 'aK9v', 'pQ4s', 'yR7n', 'hD5c',
  'uX1b', 'wL6e', 'cF3m', 'jV0k', 'oS8t', 'iG2z', 'rE4d', 'nH9l',
];
const SUFFIXES = ['...w3Bx', '...9KpR', '...mZ4q', '...Lf8n', '...2vXc', '...7tNs', '...dR1y', '...Hk5u'];

function randomBetween(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomWallet() {
  const prefix = WALLETS[Math.floor(Math.random() * WALLETS.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${prefix}${suffix}`;
}

export default function LiveClaimPopup() {
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    const spawn = () => {
      const id = Date.now();
      const sol = randomBetween(50, 600);
      const wallet = randomWallet();
      setPopups(prev => [...prev.slice(-4), { id, sol, wallet }]);
      setTimeout(() => {
        setPopups(prev => prev.filter(p => p.id !== id));
      }, 4500);
    };

    spawn();
    const interval = setInterval(spawn, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 left-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {popups.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, x: -60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex items-center gap-3 bg-black/90 border border-emerald-500/30 rounded-lg px-4 py-3 shadow-lg shadow-emerald-900/20 backdrop-blur-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: 240 }}
          >
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 truncate">{popup.wallet}</p>
              <p className="text-xs text-emerald-400">
                claimed{' '}
                <span className="text-white font-medium">{popup.sol} SOL</span>
              </p>
            </div>
            <SolanaLogo className="w-4 h-4 text-emerald-400/60 shrink-0" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
