import React from 'react';
import { Users, Zap } from 'lucide-react';
import SolanaLogo from './SolanaLogo';

export default function HeroStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
      <div className="group bg-black/40 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-md group-hover:bg-emerald-500/20 transition-all">
            <SolanaLogo className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-mono">accounts</p>
            <p className="text-base font-mono text-emerald-400">2 - 200</p>
          </div>
        </div>
      </div>
      
      <div className="group bg-black/40 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-md group-hover:bg-emerald-500/20 transition-all">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-mono">referral_bonus</p>
            <p className="text-base font-mono text-emerald-400">30%</p>
          </div>
        </div>
      </div>
      
      <div className="group bg-black/40 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-md group-hover:bg-yellow-500/20 transition-all">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] text-yellow-500/70 uppercase tracking-widest font-mono">network</p>
            <p className="text-base font-mono text-yellow-400">DEVNET</p>
          </div>
        </div>
      </div>
    </div>
  );
}
