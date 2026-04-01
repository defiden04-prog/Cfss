import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Terminal, Users, Zap, ArrowRight } from 'lucide-react';
import SolanaLogo from './SolanaLogo';

function useCountUp(target, duration = 400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

const TAGLINES = [
  '> scanning wallets...',
  '> reclaiming locked SOL...',
  '> closing empty accounts...',
  '> sending SOL to owners...',
];

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 4,
}));

export default function HeroSection() {
  const [baseUsers] = useState(() => 1800 + Math.floor(Math.random() * 40));
  const [baseSol] = useState(() => 2600 + Math.floor(Math.random() * 20));
  const usersClaimed = useCountUp(baseUsers, 800);
  const solRecovered = useCountUp(baseSol, 900);
  const [tagline, setTagline] = useState(0);
  const [liveCount, setLiveCount] = useState(5500);
  const [solTick, setSolTick] = useState(0);
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  // Cycle taglines
  useEffect(() => {
    const t = setInterval(() => setTagline(p => (p + 1) % TAGLINES.length), 2800);
    return () => clearInterval(t);
  }, []);

  // Slowly increment live users
  useEffect(() => {
    const t = setInterval(() => {
      setLiveCount(p => p + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Random SOL ticker micro-increment
  useEffect(() => {
    const t = setInterval(() => {
      setSolTick(p => p + parseFloat((Math.random() * 0.0002).toFixed(4)));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 20);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 20);
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="text-center mb-10 relative select-none">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-emerald-400/20"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {/* Floating Solana Logos */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={`sol-${i}`}
            className="absolute text-emerald-500/10"
            style={{ left: `${15 + i * 25}%`, top: `${20 + i * 15}%` }}
            animate={{ 
              y: [0, -40, 0], 
              rotate: [0, 45, -45, 0],
              opacity: [0.05, 0.15, 0.05] 
            }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SolanaLogo className="w-12 h-12" />
          </motion.div>
        ))}
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
      >
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-xs text-emerald-400 font-mono">
          <AnimatePresence mode="wait">
            <motion.span
              key={liveCount}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="inline-block"
            >
              {liveCount.toLocaleString()}
            </motion.span>
          </AnimatePresence>
          {' '}users online now
        </span>
      </motion.div>

      {/* Title with parallax */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ x: springX, y: springY }}
        className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight leading-tight"
      >
        Claim Your{' '}
        <span className="relative inline-block">
          <motion.span
            className="text-emerald-400 font-semibold"
            animate={{ textShadow: ['0 0 0px rgba(52,211,153,0)', '0 0 20px rgba(52,211,153,0.6)', '0 0 0px rgba(52,211,153,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Free Solana
          </motion.span>
          <motion.span
            className="absolute -bottom-1 left-0 h-px bg-emerald-400/50 w-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />
        </span>
      </motion.h2>

      {/* Tagline cycling */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="h-6 mb-8 flex items-center justify-center gap-2"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={tagline}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="text-sm text-emerald-500/70 font-mono flex items-center gap-2"
          >
            <ArrowRight className="w-3 h-3 text-emerald-600" />
            {TAGLINES[tagline]}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Live counters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-3 gap-3 max-w-2xl mx-auto"
      >
        {/* Users Claimed */}
        <motion.div
          whileHover={{ scale: 1.04, borderColor: 'rgba(52,211,153,0.5)' }}
          className="bg-black/50 border border-emerald-500/20 rounded-xl p-4 cursor-default transition-colors"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-emerald-400/60" />
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">claimed</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={usersClaimed}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-semibold text-emerald-400 tabular-nums"
            >
              {usersClaimed.toLocaleString()}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-slate-600 mt-1">wallets</p>
        </motion.div>

        {/* SOL Recovered */}
        <motion.div
          whileHover={{ scale: 1.04, borderColor: 'rgba(52,211,153,0.5)' }}
          className="bg-black/50 border border-emerald-500/20 rounded-xl p-4 cursor-default transition-colors"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <SolanaLogo className="w-3.5 h-3.5 text-emerald-400/60" />
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">recovered</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={Math.floor(solRecovered)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-semibold text-emerald-400 tabular-nums"
            >
              {(solRecovered + (solTick || 0)).toFixed(2)}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-slate-600 mt-1">SOL total</p>
        </motion.div>

        {/* Live users */}
        <motion.div
          whileHover={{ scale: 1.04, borderColor: 'rgba(234,179,8,0.5)' }}
          className="bg-black/50 border border-yellow-500/20 rounded-xl p-4 cursor-default transition-colors"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400/60" />
            </motion.div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">live</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={liveCount}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold text-yellow-400 tabular-nums"
            >
              {liveCount.toLocaleString()}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-slate-600 mt-1">users online</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
