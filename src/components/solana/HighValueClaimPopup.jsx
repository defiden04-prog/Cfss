import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, TrendingUp, DollarSign } from 'lucide-react';

export default function HighValueClaimPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const hash = "58asnR8e...LMSs2";
  const solscanUrl = "https://solscan.io/tx/58asnR8eAS2htrmYjM2WNdk5kGvkjeT51rGwXiCKYxNZV6dYkVsMxrER5pt5owGufJ5PUmU4yKYmbbrEP5kLMSs2";

  useEffect(() => {
    const show = () => {
      setIsVisible(true);
      // Auto-hide after 6 seconds
      setTimeout(() => setIsVisible(false), 6000);
    };

    // Show immediately on load
    const initialDelay = setTimeout(show, 3000);
    
    // Repeat every 15 seconds
    const interval = setInterval(show, 15000);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-6 z-[60] pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 100, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
            whileHover={{ scale: 1.05 }}
            className="pointer-events-auto block group"
          >
            <div className="bg-black/90 border-2 border-yellow-500/40 rounded-xl p-4 shadow-[0_0_30px_rgba(234,179,8,0.15)] backdrop-blur-md relative overflow-hidden min-w-[280px]">
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
              
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0">
                  <TrendingUp className="w-6 h-6 text-yellow-500 shadow-sm" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.2em] font-mono leading-none">
                      MEGA_CLAIM_DETECTED
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-yellow-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white font-mono tracking-tighter">$17,000.00</span>
                    <span className="text-[10px] text-slate-400 font-mono">CLAIMED</span>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      <div className="w-1 h-1 rounded-full bg-yellow-500 animate-ping" />
                      <span className="text-[9px] text-slate-400 font-mono font-medium">TX: {hash}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar timer */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-yellow-500/50"
              />
            </div>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
