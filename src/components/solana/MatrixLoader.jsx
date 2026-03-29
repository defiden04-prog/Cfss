import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CHARS = '0123456789ABCDEF@#$%&*{}:;<>?/'.split('');

export default function MatrixLoader({ className = "" }) {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    // Create 15-20 columns for the rain effect
    const cols = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${i * 5}%`,
      delay: Math.random() * 2,
      duration: 1.5 + Math.random() * 2,
    }));
    setColumns(cols);
  }, []);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black/20 font-mono ${className}`}>
      <div className="absolute inset-0 flex justify-around">
        {columns.map((col) => (
          <RainColumn key={col.id} {...col} />
        ))}
      </div>
      
      {/* Central scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/60 border border-emerald-500/40 px-4 py-2 rounded-lg backdrop-blur-md z-10"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"
            />
            <span className="text-[10px] text-emerald-400 tracking-[0.2em] uppercase">bypassing_security_locks...</span>
          </div>
        </motion.div>
      </div>

      {/* Scanning line */}
      <motion.div
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-[2px] bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-0"
      />
    </div>
  );
}

function RainColumn({ left, delay, duration }) {
  const [chars, setChars] = useState([]);

  useEffect(() => {
    // Generate a random sequence of characters
    const sequence = Array.from({ length: 12 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
    setChars(sequence);
    
    const interval = setInterval(() => {
      setChars(prev => {
        const next = [...prev];
        next.shift();
        next.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
        return next;
      });
    }, 150);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center" style={{ left }}>
      <motion.div
        initial={{ y: -500 }}
        animate={{ y: 500 }}
        transition={{ 
          duration, 
          delay, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="flex flex-col gap-1"
      >
        {chars.map((char, i) => (
          <span 
            key={i} 
            className="text-[8px] leading-none text-emerald-500"
            style={{ 
              opacity: i === chars.length - 1 ? 1 : 0.2 + (i / chars.length) * 0.5,
              textShadow: i === chars.length - 1 ? '0 0 8px rgba(16,185,129,1)' : 'none'
            }}
          >
            {char}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
