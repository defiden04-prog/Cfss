import React from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/logo.png';

export default function AppLogo({ className = "w-8 h-8" }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: 1,
        y: [0, -2, 0]
      }}
      transition={{ 
        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 0.5 }
      }}
      className={`${className} overflow-hidden rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]`}
    >
      <img src={logo} alt="App Logo" className="w-full h-full object-cover" />
    </motion.div>
  );
}
