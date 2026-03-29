import React, { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import TierBadge from './TierBadge';
import SolanaLogo from './SolanaLogo';
import { TIER_ORDER } from './TierConfig';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('earnings');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    loadLeaderboard();
    const channel = supabase.channel('leaderboard-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Referral' }, () => loadLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sortBy, timeFilter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const sortField = sortBy === 'earnings' ? '-total_earnings' : '-referral_count';
      const { data: resData } = await supabase.from('Referral')
        .select('*')
        .order(sortField.replace(/^-/, ''), { ascending: !sortField.startsWith('-') })
        .limit(50);
      const data = resData || [];
      
      let filtered = data;
      if (timeFilter !== 'all') {
        const now = new Date();
        let cutoff;
        if (timeFilter === 'daily') cutoff = new Date(now.setDate(now.getDate() - 1));
        else if (timeFilter === 'weekly') cutoff = new Date(now.setDate(now.getDate() - 7));
        else if (timeFilter === 'monthly') cutoff = new Date(now.setMonth(now.getMonth() - 1));
        filtered = data.filter(r => new Date(r.created_date) >= cutoff);
      }
      
      if (sortBy === 'tier') {
        filtered.sort((a, b) => {
          const tierA = TIER_ORDER.indexOf(a.tier || 'bronze');
          const tierB = TIER_ORDER.indexOf(b.tier || 'bronze');
          if (tierB !== tierA) return tierB - tierA;
          return (b.total_earnings || 0) - (a.total_earnings || 0);
        });
      }
      
      setLeaders(filtered.slice(0, 20));
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const timeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily' },
  ];

  const sortOptions = [
    { value: 'earnings', label: 'Earnings' },
    { value: 'referrals', label: 'Referrals' },
    { value: 'tier', label: 'Tier' },
  ];

  return (
    <div className="space-y-4" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-sm text-emerald-400 flex items-center gap-2">
          <SolanaLogo className="w-4 h-4" />
          top_referrers
        </h2>
        
        {/* Filters */}
        <div className="flex gap-2">
          <div className="flex bg-black/60 border border-emerald-500/20 rounded-lg p-0.5">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeFilter(opt.value)}
                className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                  timeFilter === opt.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {opt.label.toLowerCase()}
              </button>
            ))}
          </div>
          
          <div className="flex bg-black/60 border border-emerald-500/20 rounded-lg p-0.5">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                  sortBy === opt.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {opt.label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-emerald-500/50 animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-xs">no referrers yet</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] text-slate-600 uppercase tracking-widest border-b border-emerald-500/10">
              <div className="col-span-1">#</div>
              <div className="col-span-5">wallet</div>
              <div className="col-span-2 text-center">tier</div>
              <div className="col-span-2 text-right">refs</div>
              <div className="col-span-2 text-right">earned</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-emerald-500/5">
              {leaders.map((leader, index) => (
                <div
                  key={leader.id}
                  className={`grid grid-cols-12 gap-4 items-center px-4 py-3 transition-all ${
                    index < 3 ? 'bg-emerald-500/5' : 'hover:bg-emerald-500/5'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    {index < 3 ? (
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-slate-400/20 text-slate-400' :
                        'bg-amber-600/20 text-amber-500'
                      }`}>
                        {index + 1}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs pl-1.5">{index + 1}</span>
                    )}
                  </div>

                  {/* Wallet */}
                  <div className="col-span-5">
                    <span className="text-xs text-slate-400">
                      {leader.referrer_wallet?.slice(0, 6)}
                      <span className="text-slate-700">...</span>
                      {leader.referrer_wallet?.slice(-4)}
                    </span>
                  </div>

                  {/* Tier */}
                  <div className="col-span-2 flex justify-center">
                    <TierBadge tier={leader.tier || 'bronze'} size="sm" />
                  </div>

                  {/* Referrals */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-slate-500">
                      {leader.referral_count || 0}
                    </span>
                  </div>

                  {/* Earnings */}
                  <div className="col-span-2 text-right flex items-center justify-end gap-1">
                    <span className={`text-xs font-medium ${
                      index < 3 ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {(leader.total_earnings || 0).toFixed(3)}
                    </span>
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
