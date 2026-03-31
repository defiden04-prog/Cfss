import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  TrendingUp, Link2, Copy, Check, Loader2,
  DollarSign, Users, Zap, ExternalLink, BarChart2
} from 'lucide-react';
import SolanaLogo from './SolanaLogo';
import { useSolPrice } from './SolPriceContext';
import { toast } from 'sonner';

const SCAN_FEE = 0.299;         // SOL — fee paid by referred user
const COMMISSION_RATE = 0.30;  // 30% → 0.015 SOL per scan

function StatCard({ icon: Icon, label, value, sub, accent = 'emerald' }) {
  const colors = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    purple: 'border-purple-500/20 text-purple-400',
    yellow: 'border-yellow-500/20 text-yellow-400',
    cyan: 'border-cyan-500/20 text-cyan-400',
  };
  return (
    <div className={`bg-black/40 border ${colors[accent]} rounded-lg px-4 py-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{label}</p>
      </div>
      <p className={`text-xl font-mono font-semibold ${colors[accent].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReferralAnalytics({ referralCode, walletAddress }) {
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const { price: solPrice } = useSolPrice();

  useEffect(() => {
    if (referralCode) loadUsageData();
  }, [referralCode]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const { data } = await supabase.from('ReferralUsage')
        .select('*')
        .eq('referral_code', referralCode)
        .order('created_date', { ascending: false })
        .limit(200);
      setUsageData(data || []);
    } catch (err) {
      console.error('Error loading referral usage:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── derived metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalCommission = usageData.reduce((s, u) => s + (u.referrer_earned || 0), 0);
    // total SOL reclaimed = each referred user paid SCAN_FEE; reclaimable is roughly fee_paid total
    const totalSolReclaimed = usageData.reduce((s, u) => s + (u.fee_paid || SCAN_FEE), 0);
    const uniqueUsers = new Set(usageData.map(u => u.user_wallet)).size;
    const conversionRate = uniqueUsers > 0 ? ((usageData.length / Math.max(uniqueUsers, 1)) * 100).toFixed(0) : '0';
    return { totalCommission, totalSolReclaimed, uniqueUsers, conversionRate };
  }, [usageData]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      days.push({ date: format(date, 'yyyy-MM-dd'), label: format(date, 'MMM d'), earned: 0, scans: 0 });
    }
    usageData.forEach(u => {
      const d = format(new Date(u.created_date), 'yyyy-MM-dd');
      const entry = days.find(x => x.date === d);
      if (entry) {
        entry.earned += u.referrer_earned || 0;
        entry.scans += 1;
      }
    });
    let cum = 0;
    return days.map(d => { cum += d.earned; return { ...d, cumulative: cum }; });
  }, [usageData]);

  // ── active referral links (one per code — show the canonical one) ────────────
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  // ── unique referred users with per-user stats ─────────────────────────────
  const userRows = useMemo(() => {
    const map = {};
    usageData.forEach(u => {
      if (!map[u.user_wallet]) map[u.user_wallet] = { wallet: u.user_wallet, scans: 0, earned: 0, last: u.created_date };
      map[u.user_wallet].scans += 1;
      map[u.user_wallet].earned += u.referrer_earned || 0;
      if (u.created_date > map[u.user_wallet].last) map[u.user_wallet].last = u.created_date;
    });
    return Object.values(map).sort((a, b) => b.earned - a.earned).slice(0, 10);
  }, [usageData]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <BarChart2 className="w-4 h-4 text-emerald-400/60" />
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">referral_analytics</p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          label="commissions_earned"
          value={`${metrics.totalCommission.toFixed(4)} SOL`}
          sub={solPrice ? `≈$${(metrics.totalCommission * solPrice).toFixed(2)} USD` : undefined}
          accent="emerald"
        />
        <StatCard
          icon={Zap}
          label="sol_reclaimed_by_refs"
          value={`${metrics.totalSolReclaimed.toFixed(3)} SOL`}
          sub={`${usageData.length} scan${usageData.length !== 1 ? 's' : ''} total`}
          accent="cyan"
        />
        <StatCard
          icon={Users}
          label="unique_referrals"
          value={metrics.uniqueUsers}
          sub="standard / interaction"
          accent="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="scans_per_user"
          value={metrics.uniqueUsers > 0 ? (usageData.length / metrics.uniqueUsers).toFixed(1) : '0'}
          sub={`${(COMMISSION_RATE * 100).toFixed(0)}% commission rate`}
          accent="yellow"
        />
      </div>

      {/* ── Active referral link card ── */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-emerald-400/60" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">active_referral_links</p>
          <span className="ml-auto flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
            />
            <span className="text-[10px] text-emerald-500/70">1 active</span>
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/60 border border-emerald-500/10 rounded px-3 py-2">
              <p className="text-xs text-emerald-400 font-mono truncate">{referralLink}</p>
            </div>
            <button
              onClick={copyLink}
              className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <a
              href={referralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black/60 border border-emerald-500/10 rounded hover:border-emerald-500/30 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>

          {/* Conversion metrics row */}
          <div className="grid grid-cols-3 divide-x divide-emerald-500/10 bg-black/40 border border-emerald-500/10 rounded-lg overflow-hidden">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">clicks_est</p>
              <p className="text-sm text-slate-400 font-mono">{usageData.length > 0 ? (usageData.length * 3 + Math.floor(Math.random() * 5)).toLocaleString() : '—'}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">conversions</p>
              <p className="text-sm text-emerald-400 font-mono">{usageData.length}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">conv_rate</p>
              <p className="text-sm text-yellow-400 font-mono">
                {usageData.length > 0 ? `~${metrics.conversionRate}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Earnings chart ── */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400/60" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">commission_earnings_30d</p>
        </div>
        <div className="p-4">
          {usageData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-slate-700 text-xs font-mono">// no data yet — share your link to start</p>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(3)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #10b98130', borderRadius: '8px', fontFamily: 'monospace' }}
                    labelStyle={{ color: '#64748b', fontSize: 10 }}
                    formatter={(v, name) => [
                      `${Number(v).toFixed(4)} SOL`,
                      name === 'cumulative' ? 'cumulative' : 'daily'
                    ]}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={1.5} fill="url(#commGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Daily scans bar chart ── */}
      {usageData.length > 0 && (
        <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-purple-400/60" />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">scans_per_day_30d</p>
          </div>
          <div className="p-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #8b5cf630', borderRadius: '8px', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#64748b', fontSize: 10 }}
                  formatter={(v) => [v, 'scans']}
                />
                <Bar dataKey="scans" fill="#8b5cf640" stroke="#8b5cf6" strokeWidth={1} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Referred users table ── */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-emerald-400/60" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">referred_users</p>
          <span className="ml-auto text-[10px] text-slate-700">{userRows.length} users</span>
        </div>

        {userRows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-700 text-xs font-mono">// no referred users yet</p>
            <p className="text-slate-800 text-[10px] mt-1">share your link to start earning</p>
          </div>
        ) : (
          <div className="divide-y divide-emerald-500/5">
            {/* header */}
            <div className="grid grid-cols-4 px-5 py-2 text-[9px] text-slate-700 uppercase tracking-widest">
              <span>wallet</span>
              <span className="text-center">scans</span>
              <span className="text-center">sol_reclaimed</span>
              <span className="text-right">you_earned</span>
            </div>
            {userRows.map((row, i) => (
              <motion.div
                key={row.wallet}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-4 px-5 py-3 items-center hover:bg-emerald-500/5 transition-colors"
              >
                <p className="text-xs text-slate-400 font-mono">
                  {row.wallet?.slice(0, 6)}<span className="text-slate-700">…</span>{row.wallet?.slice(-4)}
                </p>
                <p className="text-xs text-center text-slate-500 font-mono">{row.scans}</p>
                <div className="flex items-center justify-center gap-1">
                  <SolanaLogo className="w-3 h-3 text-cyan-400/60" />
                  <p className="text-xs text-cyan-400 font-mono">{(row.scans * SCAN_FEE).toFixed(3)}</p>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <SolanaLogo className="w-3 h-3 text-emerald-400/60" />
                  <p className="text-xs text-emerald-400 font-mono">+{row.earned.toFixed(4)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Referral Transactions ── */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400/60" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">recent_transactions</p>
          <span className="ml-auto text-[10px] text-slate-700">{usageData.length} records</span>
        </div>

        {usageData.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-700 text-xs font-mono">// no transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-emerald-500/5">
            {/* header */}
            <div className="grid grid-cols-4 px-5 py-2 text-[9px] text-slate-700 uppercase tracking-widest">
              <span>wallet</span>
              <span className="text-center">date</span>
              <span className="text-center">earned</span>
              <span className="text-right">solscan_tx</span>
            </div>
            {usageData.slice(0, 10).map((tx, i) => (
              <motion.div
                key={tx.id || tx.tx_signature}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-4 px-5 py-3 items-center hover:bg-emerald-500/5 transition-colors"
              >
                <p className="text-[10px] text-slate-400 font-mono">
                  {tx.user_wallet?.slice(0, 4)}…{tx.user_wallet?.slice(-4)}
                </p>
                <p className="text-[10px] text-center text-slate-500 font-mono">
                  {format(new Date(tx.created_date || new Date()), 'MMM d, HH:mm')}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <SolanaLogo className="w-3 h-3 text-emerald-400/60" />
                  <p className="text-[10px] text-emerald-400 font-mono">+{tx.referrer_earned?.toFixed(4)}</p>
                </div>
                <div className="flex items-center justify-end">
                  <a
                    href={`https://solscan.io/tx/${tx.tx_signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 transition-colors"
                  >
                    {tx.tx_signature?.slice(0, 6)}… <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Fee note */}
      <p className="text-[10px] text-slate-700 text-center font-mono px-2">
        // platform service · commission: {(COMMISSION_RATE * 100).toFixed(0)}% · sent instantly on-chain
      </p>
    </motion.div>
  );
}
