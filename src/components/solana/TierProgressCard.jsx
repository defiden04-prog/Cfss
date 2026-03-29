import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIERS, getTierProgress, getNextTier } from './TierConfig';
import TierBadge from './TierBadge';
import { Trophy, Users, Coins, ArrowRight } from 'lucide-react';

export default function TierProgressCard({ referralData }) {
  const currentTier = referralData.tier || 'bronze';
  const tierData = TIERS[currentTier];
  const nextTierKey = getNextTier(currentTier);
  const nextTierData = nextTierKey ? TIERS[nextTierKey] : null;
  
  const { referralProgress, earningsProgress } = getTierProgress(
    referralData.referral_count || 0,
    referralData.total_earnings || 0,
    currentTier
  );

  return (
    <Card className={`bg-gradient-to-br ${tierData.bgColor} ${tierData.borderColor} border backdrop-blur-sm`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${tierData.textColor}`} />
            Your Tier
          </div>
          <TierBadge tier={currentTier} size="lg" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Commission Rate</span>
          <span className={`font-bold text-lg ${tierData.textColor}`}>
            {(tierData.commission * 100).toFixed(0)}%
          </span>
        </div>

        {nextTierData && (
          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Progress to</span>
              <TierBadge tier={nextTierKey} size="sm" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Referrals
                </span>
                <span className="text-slate-300">
                  {referralData.referral_count || 0} / {nextTierData.minReferrals}
                </span>
              </div>
              <Progress value={referralProgress} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Earnings
                </span>
                <span className="text-slate-300">
                  {(referralData.total_earnings || 0).toFixed(3)} / {nextTierData.minEarnings} SOL
                </span>
              </div>
              <Progress value={earningsProgress} className="h-2" />
            </div>
          </div>
        )}

        {!nextTierData && (
          <div className="pt-2 border-t border-slate-700/50 text-center">
            <p className="text-cyan-300 text-sm font-medium">🎉 You've reached the highest tier!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
