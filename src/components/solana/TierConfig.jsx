// Referral Tier Configuration
export const TIERS = {
  bronze: {
    name: 'Bronze',
    commission: 0.30,
    minReferrals: 0,
    minEarnings: 0,
    color: 'from-amber-700 to-amber-900',
    borderColor: 'border-amber-600/50',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: '🥉'
  },
  silver: {
    name: 'Silver',
    commission: 0.35,
    minReferrals: 5,
    minEarnings: 0.5, // Increased since base fee is higher
    color: 'from-slate-400 to-slate-600',
    borderColor: 'border-slate-400/50',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-400/20',
    icon: '🥈'
  },
  gold: {
    name: 'Gold',
    commission: 0.40,
    minReferrals: 20,
    minEarnings: 2,
    color: 'from-yellow-500 to-yellow-700',
    borderColor: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: '🥇'
  },
  platinum: {
    name: 'Platinum',
    commission: 0.45,
    minReferrals: 50,
    minEarnings: 10,
    color: 'from-cyan-400 to-purple-600',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-500/20',
    icon: '💎'
  }
};

export const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

export function calculateTier(referralCount, totalEarnings) {
  let currentTier = 'bronze';
  
  for (const tierKey of TIER_ORDER) {
    const tier = TIERS[tierKey];
    if (referralCount >= tier.minReferrals && totalEarnings >= tier.minEarnings) {
      currentTier = tierKey;
    }
  }
  
  return currentTier;
}

export function getNextTier(currentTier) {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex < TIER_ORDER.length - 1) {
    return TIER_ORDER[currentIndex + 1];
  }
  return null;
}

export function getTierProgress(referralCount, totalEarnings, currentTier) {
  const nextTierKey = getNextTier(currentTier);
  if (!nextTierKey) return { referralProgress: 100, earningsProgress: 100 };
  
  const nextTier = TIERS[nextTierKey];
  const currentTierData = TIERS[currentTier];
  
  const referralRange = nextTier.minReferrals - currentTierData.minReferrals;
  const earningsRange = nextTier.minEarnings - currentTierData.minEarnings;
  
  const referralProgress = Math.min(100, ((referralCount - currentTierData.minReferrals) / referralRange) * 100);
  const earningsProgress = Math.min(100, ((totalEarnings - currentTierData.minEarnings) / earningsRange) * 100);
  
  return { referralProgress, earningsProgress, nextTier: nextTierKey };
}
