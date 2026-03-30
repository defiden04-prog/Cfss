import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Share2, Loader2, Check, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const ClaimPass = ({ referralCode }) => {
  const { publicKey } = useWallet();
  const passRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const referralUrl = `https://claimfreesolana.fun?ref=${referralCode || ''}`;

  const downloadPass = async () => {
    if (!passRef.current) return;
    setIsGenerating(true);
    try {
      // Small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(passRef.current, {
        useCORS: true,
        scale: 3, // Very high resolution for printing/sharing
        backgroundColor: null,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `claim-pass-${referralCode || 'user'}.png`;
      link.click();
    } catch (err) {
      console.error('Error generating pass:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const sharePass = async () => {
    if (!passRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(passRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'claim-pass.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Claim Free Solana VIP Pass',
            text: `Join the elite! Reclaim your lost SOL with my VIP access. ${referralUrl}`,
          });
        } else {
          downloadPass();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error sharing pass:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!publicKey) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div 
        className="relative group cursor-pointer"
        style={{ perspective: 1000 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Shadow for 3D effect */}
        <div className="absolute -inset-2 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <motion.div 
          ref={passRef}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative w-full max-w-[450px] aspect-[1536/1024] rounded-xl overflow-hidden border border-emerald-500/20 bg-black shadow-2xl"
        >
          {/* Background Image */}
          <img 
            src="/claim-pass-bg.png" 
            alt="Claim Pass" 
            className="w-full h-full object-cover"
          />

          {/* Dynamic QR Code Overlay */}
          <div 
            style={{ transform: "translateZ(30px)" }} // Pop-out effect
            className="absolute right-[11.2%] bottom-[25.2%] w-[13.5%] aspect-square bg-white p-[2px] rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <QRCodeSVG 
              value={referralUrl} 
              size={512}
              level="H"
              includeMargin={false}
              className="w-full h-full"
            />
          </div>

          {/* VIP Badge pop-out */}
          <div 
            style={{ transform: "translateZ(50px)" }}
            className="absolute top-[8%] left-[8%] bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-lg shadow-emerald-500/40"
          >
            <Sparkles className="w-2 h-2" />
            VIP_MEMBER
          </div>

          {/* Subtle Scanlines Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[size:100%_2px,3px_100%] opacity-20" />
        </motion.div>

        {/* Hover Hint */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
          ROTATE_TO_INSPECT
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3 w-full max-w-sm">
        <Button 
          onClick={downloadPass}
          disabled={isGenerating}
          className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/40 font-mono text-xs h-10 shadow-lg shadow-emerald-500/5"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          get_pass
        </Button>

        <Button 
          onClick={sharePass}
          disabled={isGenerating}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono text-xs h-10"
        >
          <Share2 className="w-4 h-4 mr-2" />
          share_pass
        </Button>

        <Button 
          onClick={copyLink}
          variant="outline"
          className="w-full bg-black/40 border-white/5 text-slate-500 hover:text-white font-mono text-[9px] uppercase h-8"
        >
          {copied ? <Check className="w-3 h-3 mr-1.5 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1.5" />}
          copy_access_link
        </Button>
      </div>
    </div>
  );
};

export default ClaimPass;
