import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Coins, Link2, Share2, Loader2, Send, Twitter } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import ReferralAnalytics from './ReferralAnalytics';
import SolanaLogo from './SolanaLogo';
import TierProgressCard from './TierProgressCard';
import AllTiersCard from './AllTiersCard';
import TierBadge from './TierBadge';
import ShareReferralImage from './ShareReferralImage';
import { calculateTier, TIERS } from './TierConfig';

export default function ReferralDashboard() {
  const { connected, publicKey } = useWallet();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadReferralData();
    }
  }, [connected, publicKey]);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('Referral').select('*').eq('referrer_wallet', publicKey.toString());
      if (data && data.length > 0) {
        const referral = data[0];
        // Calculate and update tier if needed
        const newTier = calculateTier(referral.referral_count || 0, referral.total_earnings || 0);
        if (newTier !== referral.tier) {
          await supabase.from('Referral').update({ tier: newTier }).eq('id', referral.id);
          referral.tier = newTier;
        }
        setReferralData(referral);
      }
    } catch (err) {
      console.error('Error loading referral:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Generate unique code from wallet address
      const code = publicKey.toString().slice(0, 8).toUpperCase();
      
      const { data } = await supabase.from('Referral').insert([{
        referrer_wallet: publicKey.toString(),
        referral_code: code,
        total_earnings: 0,
        referral_count: 0,
        tier: 'bronze',
        tier_earnings: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
      }]).select();
      
      const newReferral = data ? data[0] : null;
      if (newReferral) setReferralData(newReferral);
      toast.success('Referral code generated!');
    } catch (err) {
      console.error('Error creating referral:', err);
      toast.error('Failed to generate referral code');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralData.referral_code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const link = `${window.location.origin}?ref=${referralData.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  if (!connected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Connect your wallet to access referral dashboard</p>
        </CardContent>
      </Card>
    );
  }

  if (loading && !referralData) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-300">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!referralData) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Start Earning with Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 p-6 rounded-xl border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-2">Earn 30% Commission</h3>
            <p className="text-slate-400">
              When someone uses your referral code, you earn 30% of the protocol interaction (approx. 0.0897 SOL per scan).
              Generate your unique code and start sharing!
            </p>
          </div>
          <Button 
            onClick={generateReferralCode}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4 mr-2" />
            )}
            Generate My Referral Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-400" />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralData.referral_code}
              readOnly
              className="bg-slate-900/50 border-slate-600 text-white text-xl font-mono text-center tracking-wider"
            />
            <Button 
              onClick={copyCode}
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 px-4"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={copyLink}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            {referralData && (
              <>
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Reclaim SOL from empty token accounts! Use my referral code: ${referralData.referral_code} 🚀`)}&url=${encodeURIComponent(`${window.location.origin}?ref=${referralData.referral_code}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </a>
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}?ref=${referralData.referral_code}`)}&text=${encodeURIComponent(`Reclaim SOL from empty token accounts using my referral link! 🚀`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Telegram
                </a>
              </>
            )}
          </div>
          <ShareReferralImage referralData={referralData} publicKey={publicKey?.toString()} />
        </CardContent>
      </Card>

      {/* Tier Progress */}
      <TierProgressCard referralData={referralData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-900/20 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/30 rounded-xl">
                <Users className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Total Referrals</p>
                <p className="text-3xl font-bold text-white">{referralData.referral_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-900/20 border-cyan-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl flex items-center gap-3 border border-emerald-500/20">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <SolanaLogo className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-500/50 uppercase tracking-widest font-mono">Commission_total</p>
                <p className="text-xl text-white font-mono font-bold">{referralData.total_earnings.toFixed(4)} SOL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Tiers Overview */}
      <AllTiersCard currentTier={referralData.tier || 'bronze'} />

      {/* Analytics Section */}
      <ReferralAnalytics 
        referralCode={referralData.referral_code} 
        walletAddress={publicKey?.toString()} 
      />

      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <h4 className="text-white font-semibold mb-3">How It Works</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-xs text-purple-300 font-bold">1</div>
              <p className="text-slate-400 text-sm">Share your referral code or link with friends</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-xs text-purple-300 font-bold">2</div>
              <p className="text-slate-400 text-sm">When they execute a scan via your link, you get 30% (approx. 0.0897 SOL)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-xs text-purple-300 font-bold">3</div>
              <p className="text-slate-400 text-sm">Earnings are sent directly to your wallet instantly!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
