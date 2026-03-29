import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'ripple', symbol: 'XRP' },
  { id: 'cardano', symbol: 'ADA' },
  { id: 'avalanche-2', symbol: 'AVAX' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'polkadot', symbol: 'DOT' },
  { id: 'chainlink', symbol: 'LINK' },
];

function TickerItem({ coin, flash }) {
  const isPositive = coin.change >= 0;
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-1 rounded-md border font-mono text-xs transition-colors duration-300 shrink-0 ${
        flash === 'up'
          ? 'bg-emerald-500/20 border-emerald-500/50'
          : flash === 'down'
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-black/40 border-white/5'
      }`}
    >
      <span className="text-slate-400 font-semibold">{coin.symbol}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={coin.price}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="text-white tabular-nums"
        >
          ${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.span>
      </AnimatePresence>
      <span className={`flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(coin.change).toFixed(2)}%
      </span>
    </div>
  );
}

export default function CryptoTickerBar() {
  const [prices, setPrices] = useState({});
  const [flashes, setFlashes] = useState({});
  const prevPrices = useRef({});
  const trackRef = useRef(null);

  const fetchPrices = async () => {
    try {
      const ids = COINS.map(c => c.id).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await res.json();
      const newFlashes = {};
      const newPrices = {};
      COINS.forEach(coin => {
        const p = data[coin.id]?.usd;
        const ch = data[coin.id]?.usd_24h_change;
        if (p !== undefined) {
          newPrices[coin.id] = { price: p, change: ch };
          const prev = prevPrices.current[coin.id]?.price;
          if (prev !== undefined && p !== prev) {
            newFlashes[coin.id] = p > prev ? 'up' : 'down';
          }
        }
      });
      prevPrices.current = newPrices;
      setPrices(newPrices);
      if (Object.keys(newFlashes).length > 0) {
        setFlashes(newFlashes);
        setTimeout(() => setFlashes({}), 700);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 20000);
    return () => clearInterval(t);
  }, []);

  const coins = COINS.filter(c => prices[c.id]);
  if (coins.length === 0) return null;

  // Duplicate for seamless loop
  const allCoins = [...coins, ...coins];

  return (
    <div className="w-full overflow-hidden border-b border-emerald-500/10 bg-black/60 backdrop-blur-sm py-2">
      <div className="flex items-center gap-3 animate-marquee whitespace-nowrap" style={{ width: 'max-content' }}>
        {allCoins.map((coin, i) => (
          <TickerItem
            key={`${coin.id}-${i}`}
            coin={{ ...coin, ...(prices[coin.id] || {}) }}
            flash={flashes[coin.id]}
          />
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
