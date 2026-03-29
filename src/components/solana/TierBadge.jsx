import React from 'react';
import { TIERS } from './TierConfig';

export default function TierBadge({ tier, size = 'md' }) {
  const tierData = TIERS[tier] || TIERS.bronze;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${tierData.color} ${sizeClasses[size]} font-semibold text-white`}>
      <span>{tierData.icon}</span>
      <span>{tierData.name}</span>
    </span>
  );
}
