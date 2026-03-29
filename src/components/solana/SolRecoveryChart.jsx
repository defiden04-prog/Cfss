import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/api/supabaseClient';
import { Loader2, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

// Generate fake global platform data for gamification
function buildGlobalData(days = 14) {
  let cumulative = 820;
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    cumulative += Math.floor(Math.random() * 140 + 60);
    return { day: format(date, 'MMM d'), globalCumulative: cumulative };
  });
}

export default function SolRecoveryChart({ walletAddress }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTotal, setUserTotal] = useState(0);
  const [globalTotal, setGlobalTotal] = useState(0);

  useEffect(() => {
    if (!walletAddress) return;
    load();
  }, [walletAddress]);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch user's referral usage (proxy for SOL activity)
      const { data } = await supabase.from('ReferralUsage').select('*').eq('referrer_wallet', walletAddress);
      const usage = data || [];
      const globalBase = buildGlobalData(14);

      // Build per-day user cumulative from usage history
      const byDay = {};
      usage.forEach(tx => {
        if (!tx.created_date) return;
        const day = format(new Date(tx.created_date), 'MMM d');
        byDay[day] = (byDay[day] || 0) + (tx.referrer_earned || 0);
      });

      let userCumulative = 0;
      const merged = globalBase.map(g => {
        userCumulative += byDay[g.day] || 0;
        return {
          day: g.day,
          global: g.globalCumulative,
          you: parseFloat(userCumulative.toFixed(4)),
        };
      });

      setData(merged);
      setUserTotal(userCumulative);
      setGlobalTotal(merged[merged.length - 1]?.global || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-black border border-emerald-500/30 rounded-lg p-3 text-xs font-mono shadow-xl">
        <p className="text-slate-500 mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === 'global' ? 'platform' : 'you'}: {p.value.toFixed(4)} SOL
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-emerald-500/40 animate-spin" />
      </div>
    );
  }

  const pct = globalTotal > 0 ? ((userTotal / globalTotal) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400/60" />
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">sol_recovery_chart</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">your_total</p>
            <p className="text-emerald-400 text-sm">{userTotal.toFixed(4)} SOL</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">platform_share</p>
            <p className="text-yellow-400 text-sm">{pct}%</p>
          </div>
        </div>
      </div>

      {/* Rank label */}
      <div className="px-5 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-mono">
            {userTotal === 0
              ? '// start claiming to appear on the chart'
              : userTotal < 0.1
              ? '// rookie — keep claiming to level up'
              : userTotal < 1
              ? '// rising — top 30% of claimers'
              : '// top tier — elite claimer 🏆'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-5">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v) => (
                <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>
                  {v === 'global' ? 'platform_total' : 'your_earnings'}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="global"
              stroke="#475569"
              strokeWidth={1.5}
              fill="url(#colorGlobal)"
              dot={false}
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="you"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorYou)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
