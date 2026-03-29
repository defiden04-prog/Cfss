import React, { useState } from 'react';
import { Share2, Copy, Check, Twitter } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareClaimButton({ solReclaimed, walletAddress }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const getReferralCode = async () => {
    if (referralCode) return referralCode;
    setLoading(true);
    try {
      const { data } = await supabase.from('Referral').select('*').eq('referrer_wallet', walletAddress);
      if (data && data.length > 0) {
        setReferralCode(data[0].referral_code);
        return data[0].referral_code;
      }
      // Auto-create referral code
      const code = walletAddress.slice(0, 8).toUpperCase();
      const { data: newRefData } = await supabase.from('Referral').insert([{
        referrer_wallet: walletAddress,
        referral_code: code,
        total_earnings: 0,
        referral_count: 0,
        tier: 'bronze',
        tier_earnings: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
      }]).select();
      const newRef = newRefData?.[0];
      if (newRef) setReferralCode(newRef.referral_code);
      return newRef?.referral_code;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    await getReferralCode();
    setOpen(true);
  };

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : window.location.origin;

  const tweetText = `Just reclaimed ${solReclaimed.toFixed(4)} SOL from empty token accounts on Solana! 🤑\n\nFree SOL is sitting in your wallet — claim it now:\n${referralLink}`;

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank'
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg text-emerald-400 text-xs font-mono transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        share & earn
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-80 bg-black border border-emerald-500/30 rounded-xl p-4 shadow-2xl shadow-emerald-500/10"
            >
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">share_claim</p>
              <div className="bg-black/60 border border-emerald-500/10 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">{tweetText}</p>
              </div>

              {referralCode && (
                <div className="mb-3 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-mono flex-1 truncate">{referralLink}</p>
                  <button onClick={copyLink} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={shareOnTwitter}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/30 rounded-lg text-[#1DA1F2] text-xs font-mono transition-all"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  post on X
                </button>
                <button
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg text-emerald-400 text-xs font-mono transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  copy link
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
