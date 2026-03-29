import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from './WalletProvider';
import { supabase } from '@/api/supabaseClient';
import SolanaLogo from './SolanaLogo';
import { TIERS, TIER_ORDER, calculateTier, getNextTier, getTierProgress } from './TierConfig';
import { Loader2, Users, Copy, Check, Activity, TrendingUp, Shield, Zap, ArrowUpCircle } from 'lucide-react';
import SolRecoveryChart from './SolRecoveryChart';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { toast } from 'sonner';

function StatCard({ label, value, sub, icon: Icon, accent = 'emerald' }) {
  const colors = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    yellow: 'border-yellow-500/20 text-yellow-400',
    cyan: 'border-cyan-500/20 text-cyan-400',
    purple: 'border-purple-500/20 text-purple-400',
  };
  return (
    <div className={`bg-black/40 border ${colors[accent]} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">{label}</p>
        <Icon className={`w-4 h-4 ${colors[accent].split(' ')[1]} opacity-50`} />
      </div>
      <p className={`text-2xl font-medium ${colors[accent].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1 font-mono">{sub}</p>}
    </div>
  );
}

export default function UserDashboard() {
  const { connected, publicKey, balance } = useWallet();
  const [referralData, setReferralData] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tierUpgradeNotif, setTierUpgradeNotif] = useState(null);
  // Track last known tier so we can detect upgrades from real-time updates
  const lastTierRef = useRef(null);

  useEffect(() => {
    if (connected && publicKey) {
      loadData();
    }
  }, [connected, publicKey]);

  // Real-time subscription: re-check tier whenever Referral entity updates
  useEffect(() => {
    if (!connected || !publicKey) return;
    const channel = supabase.channel('referral-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Referral' }, (payload) => {
        if (
          payload.new && 
          payload.new.referrer_wallet === publicKey.toString()
        ) {
          checkAndUpgradeTier(payload.new);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [connected, publicKey]);

  const checkAndUpgradeTier = async (r) => {
    const newTier = calculateTier(r.referral_count || 0, r.total_earnings || 0);
    const previousTier = lastTierRef.current;

    if (newTier !== r.tier) {
      await supabase.from('Referral').update({ tier: newTier }).eq('id', r.id);
      r.tier = newTier;
    }

    // Detect upgrade vs initial load
    if (previousTier && previousTier !== newTier) {
      const tierInfo = TIERS[newTier];
      const prevInfo = TIERS[previousTier];
      const tierIndex = TIER_ORDER.indexOf(newTier);
      const prevIndex = TIER_ORDER.indexOf(previousTier);

      if (tierIndex > prevIndex) {
        // Tier upgrade!
        setTierUpgradeNotif({ from: previousTier, to: newTier });
        toast.success(
          `🎉 tier_upgrade: ${prevInfo?.name} → ${tierInfo?.name} — commission is now ${(tierInfo.commission * 100).toFixed(0)}%`,
          { duration: 6000 }
        );
        // Auto-dismiss banner after 8s
        setTimeout(() => setTierUpgradeNotif(null), 8000);
      }
    }

    lastTierRef.current = newTier;
    setReferralData({ ...r });
  };

  const loadData = async () => {
    setLoading(true);
    const wallet = publicKey.toString();
    const [referralsRes, usageRes] = await Promise.all([
      supabase.from('Referral').select('*').eq('referrer_wallet', wallet),
      supabase.from('ReferralUsage').select('*').eq('referrer_wallet', wallet),
    ]);
    
    const referrals = referralsRes.data || [];
    const usage = usageRes.data || [];

    if (referrals.length > 0) {
      const r = referrals[0];
      // Set last tier before checking so initial load doesn't fire upgrade toast
      lastTierRef.current = r.tier || 'bronze';
      await checkAndUpgradeTier(r);
    }
    // Sort newest first
    setUsageHistory(usage.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  const copyCode = () => {
    if (!referralData) return;
    navigator.clipboard.writeText(referralData.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-12 text-center">
        <Shield className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-mono">// connect wallet to view dashboard</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-emerald-500/50 animate-spin" />
      </div>
    );
  }

  const tier = referralData?.tier || null;
  const tierData = tier ? TIERS[tier] : null;
  const nextTierKey = tier ? getNextTier(tier) : null;
  const nextTierData = nextTierKey ? TIERS[nextTierKey] : null;
  const progress = tier
    ? getTierProgress(referralData.referral_count || 0, referralData.total_earnings || 0, tier)
    : null;

  const totalEarned = referralData?.total_earnings || 0;
  const referralCount = referralData?.referral_count || 0;

  return (
    <div className="space-y-4" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Tier Upgrade Banner */}
      {tierUpgradeNotif && (() => {
        const toTier = TIERS[tierUpgradeNotif.to];
        const fromTier = TIERS[tierUpgradeNotif.from];
        return (
          <div className="flex items-center gap-3 bg-black/60 border border-emerald-400/40 rounded-lg px-5 py-3 animate-pulse">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 font-mono">
                tier_upgrade_detected
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {fromTier?.icon} {fromTier?.name} → {toTier?.icon} {toTier?.name}
                <span className="ml-2 text-emerald-500/70">// commission: {(toTier.commission * 100).toFixed(0)}%</span>
              </p>
            </div>
            <button onClick={() => setTierUpgradeNotif(null)} className="text-slate-700 hover:text-slate-500 text-xs ml-2">✕</button>
          </div>
        );
      })()}

      {/* Wallet Identity */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">wallet_address</p>
          <p className="text-emerald-400 text-sm">
            {publicKey.toString().slice(0, 12)}
            <span className="text-slate-600">...</span>
            {publicKey.toString().slice(-8)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">balance</p>
          <div className="flex items-center gap-1.5 justify-end">
            <SolanaLogo className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-400 text-sm">{balance.toFixed(4)} SOL</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="total_earned"
          value={`${totalEarned.toFixed(4)}`}
          sub="SOL from referrals"
          icon={SolanaLogo}
          accent="emerald"
        />
        <StatCard
          label="total_referrals"
          value={referralCount}
          sub={referralCount === 1 ? '1 user referred' : `${referralCount} users referred`}
          icon={Users}
          accent="cyan"
        />
        <StatCard
          label="current_tier"
          value={tierData ? tierData.name.toUpperCase() : 'NONE'}
          sub={tierData ? `${(tierData.commission * 100).toFixed(0)}% commission` : 'generate a code first'}
          icon={Shield}
          accent={tier === 'platinum' ? 'cyan' : tier === 'gold' ? 'yellow' : tier === 'silver' ? 'cyan' : 'emerald'}
        />
        <StatCard
          label="tx_history"
          value={usageHistory.length}
          sub="referral transactions"
          icon={Activity}
          accent="purple"
        />
      </div>

      {/* Referral Code + Tier Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Referral Code */}
        <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">referral_code</p>
          {referralData ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-black/60 border border-emerald-500/20 rounded px-3 py-2">
                  <p className="text-emerald-400 text-lg tracking-[0.3em]">{referralData.referral_code}</p>
                </div>
                <button
                  onClick={copyCode}
                  className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-600">
                link: <span className="text-slate-500">{window.location.origin}?ref={referralData.referral_code}</span>
              </p>
            </>
          ) : (
            <p className="text-slate-600 text-xs">// no code generated yet — go to referral tab</p>
          )}
        </div>

        {/* Tier Progress */}
        <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-5">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">tier_progress</p>
          {tier ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tierData.icon}</span>
                  <span className={`text-sm font-medium ${tierData.textColor}`}>{tierData.name}</span>
                </div>
                {nextTierData && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <Zap className="w-3 h-3" />
                    <span className="text-[10px]">next: {nextTierData.name}</span>
                  </div>
                )}
              </div>
              {nextTierKey && progress ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>referrals</span>
                      <span>{referralCount} / {TIERS[nextTierKey].minReferrals}</span>
                    </div>
                    <Progress value={progress.referralProgress} className="h-1 bg-emerald-500/10" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>earnings</span>
                      <span>{totalEarned.toFixed(3)} / {TIERS[nextTierKey].minEarnings} SOL</span>
                    </div>
                    <Progress value={progress.earningsProgress} className="h-1 bg-emerald-500/10" />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-emerald-400/60">// max tier reached — {tierData.icon} platinum</p>
              )}
            </>
          ) : (
            <p className="text-slate-600 text-xs">// generate a referral code to unlock tiers</p>
          )}
        </div>
      </div>

      {/* SOL Recovery Chart */}
      <SolRecoveryChart walletAddress={publicKey?.toString()} />

      {/* Transaction History */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400/50" />
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">referral_tx_history</p>
          <span className="ml-auto text-[10px] text-slate-700">{usageHistory.length} records</span>
        </div>

        {usageHistory.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-8 h-8 text-slate-800 mx-auto mb-3" />
            <p className="text-slate-600 text-xs">// no referral activity yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] text-slate-700 uppercase tracking-widest border-b border-emerald-500/5">
              <div className="col-span-4">user</div>
              <div className="col-span-3">date</div>
              <div className="col-span-2 text-right">fee_paid</div>
              <div className="col-span-3 text-right">you_earned</div>
            </div>
            <div className="divide-y divide-emerald-500/5 max-h-64 overflow-y-auto">
              {usageHistory.map((tx) => (
                <div key={tx.id} className="grid grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-emerald-500/5 transition-all">
                  <div className="col-span-4">
                    <p className="text-xs text-slate-500">
                      {tx.user_wallet?.slice(0, 6)}
                      <span className="text-slate-700">...</span>
                      {tx.user_wallet?.slice(-4)}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[10px] text-slate-600">
                      {tx.created_date ? format(new Date(tx.created_date), 'MMM d, HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="col-span-2 text-right flex items-center justify-end gap-1">
                    <span className="text-xs text-slate-600">{(tx.fee_paid || 0).toFixed(3)}</span>
                    <SolanaLogo className="w-3 h-3 text-slate-700" />
                  </div>
                  <div className="col-span-3 text-right flex items-center justify-end gap-1">
                    <span className="text-xs text-emerald-400">+{(tx.referrer_earned || 0).toFixed(4)}</span>
                    <SolanaLogo className="w-3 h-3 text-emerald-500/50" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
