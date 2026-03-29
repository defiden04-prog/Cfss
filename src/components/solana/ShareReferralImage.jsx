import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from "@/components/ui/button";
import { Copy, Download, Share2, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SolanaLogo from './SolanaLogo';
import TierBadge from './TierBadge';
import AppLogo from './AppLogo';

export default function ShareReferralImage({ referralData, publicKey }) {
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const captureAndShare = async () => {
    if (!cardRef.current || !referralData) return;
    setCapturing(true);

    try {
      // Create a temporary clone for higher resolution without altering the UI
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Hi-Res
        useCORS: true,
        backgroundColor: '#000000',
        logging: false,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Failed to generate image.");

      const file = new File([blob], 'my_cfs_referral.png', { type: 'image/png' });

      // Try native Web Share API with files first (Mobile / OS native share)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Free SOL Claim Dashboard',
          text: `Reclaim SOL from empty token accounts using my referral code: ${referralData.referral_code} 🚀`,
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback: Download the image directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfs_dashboard_${referralData.referral_code}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Dashboard image downloaded! You can now attach it to your tweet or message.");
      }
    } catch (err) {
      console.error('Snapshot failed:', err);
      toast.error('Failed to generate sharing image. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  if (!referralData) return null;

  return (
    <>
      <Button 
        onClick={captureAndShare}
        disabled={capturing}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-black font-bold py-6 rounded-xl text-md flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 mt-6"
      >
        {capturing ? (
           <><Loader2 className="w-5 h-5 animate-spin"/> Generating Image...</>
        ) : (
           <><Camera className="w-5 h-5"/> Share Dashboard Snapshot </>
        )}
      </Button>

      {/* Hidden Card for the Snapshot Capture */}
      <div className="overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none">
        <div 
          ref={cardRef} 
          className="relative w-[600px] h-[400px] bg-black border border-emerald-500/30 p-8 flex flex-col justify-between"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          {/* Cyberpunk Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <AppLogo className="w-10 h-10" />
                <div>
                  <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">FREE_SOL.CLAIM</h1>
                  <p className="text-xs text-slate-400 tracking-widest uppercase">Referral Brag Card</p>
                </div>
              </div>
              <TierBadge tier={referralData.tier} size="lg" />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4">
                <p className="text-xs text-purple-400 uppercase tracking-widest mb-1">Total Referrals</p>
                <p className="text-4xl font-bold text-white">{referralData.referral_count}</p>
              </div>
              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Total Earned</p>
                <div className="flex items-center gap-2">
                  <SolanaLogo className="w-6 h-6 text-emerald-400" />
                  <p className="text-4xl font-bold text-white">{referralData.total_earnings.toFixed(3)}</p>
                </div>
              </div>
            </div>

            {/* Code Call-to-action */}
            <div className="mt-auto bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Use my referral code</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-emerald-400">{referralData.referral_code}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">wallet_ID</p>
                <p className="text-sm text-slate-400 font-mono">{publicKey.slice(0, 4)}...{publicKey.slice(-4)}</p>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-emerald-500/30 tracking-widest uppercase">
            verified on solana
          </div>
        </div>
      </div>
    </>
  );
}
