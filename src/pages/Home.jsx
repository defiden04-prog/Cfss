import React, { useEffect, useState } from 'react';
import { WalletProvider } from '../components/solana/WalletProvider';
import { SolPriceProvider } from '../components/solana/SolPriceContext';
import SolHeaderTicker from '../components/solana/SolHeaderTicker';
import WalletButton from '../components/solana/WalletButton';
import AccountScanner from '../components/solana/AccountScanner';
import ReferralDashboard from '../components/solana/ReferralDashboard';
import HeroSection from '../components/solana/HeroSection';
import Leaderboard from '../components/solana/Leaderboard';
import SolanaLogo from '../components/solana/SolanaLogo';
import AppLogo from '../components/solana/AppLogo';
import LiveClaimPopup from '../components/solana/LiveClaimPopup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDashboard from '../components/solana/UserDashboard';
import { motion } from 'framer-motion';
import { Wallet, Users, Trophy, LayoutDashboard, Clock, Shield, Twitter, Send } from 'lucide-react';
import ScheduleManager from '../components/solana/ScheduleManager';
import CryptoTickerBar from '../components/solana/CryptoTickerBar';
import ProSettings from '../components/solana/ProSettings';

export default function Home() {
  const [referralFromUrl, setReferralFromUrl] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralFromUrl(ref);
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  return (
    <SolPriceProvider>
      <WalletProvider>
      <div className="min-h-screen bg-black" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        {/* Hacker grid background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
          
          {/* Global Solana Logo Background Accents */}
          {[1, 2, 3, 4, 5].map(i => (
            <motion.div
              key={`bg-sol-${i}`}
              className="absolute text-emerald-500/5"
              style={{ 
                left: `${(i * 17) % 100}%`, 
                top: `${(i * 23) % 100}%` 
              }}
              animate={{ 
                rotate: [0, 360],
                opacity: [0.03, 0.06, 0.03]
              }}
              transition={{ 
                duration: 20 + i * 5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              <SolanaLogo className="w-24 h-24" />
            </motion.div>
          ))}
        </div>

        <LiveClaimPopup />
        <div className="relative z-10">
          {/* Crypto Ticker Bar */}
          <CryptoTickerBar />

          {/* Header */}
          <header className="border-b border-emerald-500/10 backdrop-blur-sm sticky top-0 z-50 bg-black/80">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3"
              >
                  <AppLogo className="w-8 h-8" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-medium text-emerald-400 tracking-tight">FREE_SOL.CLAIM</h1>
                  <p className="text-[10px] text-yellow-500/80 font-mono tracking-widest">{IS_DEVNET ? '// DEVNET' : '// MAINNET'}</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <div className="hidden md:block">
                  <SolHeaderTicker />
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <a
                    href="https://x.com/claimfreesolana"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-mono text-slate-400 hover:text-white"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Twitter</span>
                  </a>
                  <a
                    href="https://t.me/claimfreesolanaoff"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-mono text-slate-400 hover:text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Telegram</span>
                  </a>
                </div>
                <WalletButton />
              </motion.div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <HeroSection />

            {/* Tabs */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="w-full h-auto bg-black/60 border border-emerald-500/20 p-1 rounded-lg mb-6 grid grid-cols-2 sm:flex gap-1 sm:gap-0">
                <TabsTrigger 
                  value="scan" 
                  className="w-full sm:flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-500 rounded-md py-2.5 font-mono text-xs sm:text-sm transition-all"
                >
                  <Wallet className="w-4 h-4 mr-1.5 sm:mr-2" />
                  scan
                </TabsTrigger>
                <TabsTrigger 
                  value="dashboard" 
                  className="w-full sm:flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-500 rounded-md py-2.5 font-mono text-xs sm:text-sm transition-all"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5 sm:mr-2" />
                  dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="referral" 
                  className="w-full sm:flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-500 rounded-md py-2.5 font-mono text-xs sm:text-sm transition-all"
                >
                  <Users className="w-4 h-4 mr-1.5 sm:mr-2" />
                  referral
                </TabsTrigger>
                <TabsTrigger 
                  value="leaderboard" 
                  className="w-full sm:flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-500 rounded-md py-2.5 font-mono text-xs sm:text-sm transition-all"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  leaderboard
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule" 
                  className="flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-500 rounded-md py-2.5 font-mono text-sm transition-all"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  schedule
                </TabsTrigger>
                <TabsTrigger 
                  value="pro" 
                  className="flex-1 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 text-slate-500 rounded-md py-2.5 font-mono text-sm transition-all"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  pro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan">
                <AccountScanner initialReferral={referralFromUrl || localStorage.getItem('referralCode')} />
              </TabsContent>

              <TabsContent value="dashboard">
                <UserDashboard />
              </TabsContent>

              <TabsContent value="referral">
                <ReferralDashboard />
              </TabsContent>

              <TabsContent value="leaderboard">
                <Leaderboard />
              </TabsContent>

              <TabsContent value="schedule">
                <ScheduleManager />
              </TabsContent>

              <TabsContent value="pro">
                <ProSettings />
              </TabsContent>
            </Tabs>
            </motion.div>

            {/* Info Section */}
            <div className="mt-12 bg-black/40 border border-emerald-500/10 rounded-lg p-6">
              <h3 className="text-sm font-mono text-emerald-400 mb-3">// what_are_empty_accounts</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-mono">
                Every SPL token interaction creates a token account (~0.002 SOL rent).
                When balance = 0, rent stays locked. This tool closes empty accounts and returns your SOL.
              </p>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-600 text-xs font-mono">
                <SolanaLogo className="w-3 h-3" />
                <span>solana_mainnet</span>
              </div>
            </footer>
          </main>
        </div>
      </div>
      </WalletProvider>
    </SolPriceProvider>
  );
}
