import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIERS, TIER_ORDER } from './TierConfig';
import { Award, Check } from 'lucide-react';

export default function AllTiersCard({ currentTier }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          Referral Tiers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const isCurrentTier = tierKey === currentTier;
            const currentIndex = TIER_ORDER.indexOf(currentTier);
            const tierIndex = TIER_ORDER.indexOf(tierKey);
            const isUnlocked = tierIndex <= currentIndex;
            
            return (
              <div 
                key={tierKey}
                className={`relative p-4 rounded-xl border transition-all ${
                  isCurrentTier 
                    ? `bg-gradient-to-br ${tier.color} border-white/30 ring-2 ring-white/20` 
                    : isUnlocked 
                      ? `${tier.bgColor} ${tier.borderColor}` 
                      : 'bg-slate-900/50 border-slate-700 opacity-60'
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="text-center">
                  <span className="text-2xl">{tier.icon}</span>
                  <p className={`font-semibold mt-1 ${isCurrentTier ? 'text-white' : tier.textColor}`}>
                    {tier.name}
                  </p>
                  <p className={`text-xl font-bold ${isCurrentTier ? 'text-white' : 'text-slate-300'}`}>
                    {(tier.commission * 100).toFixed(0)}%
                  </p>
                  <div className="text-xs text-slate-400 mt-2 space-y-0.5">
                    <p>{tier.minReferrals}+ referrals</p>
                    <p>{tier.minEarnings}+ SOL</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
