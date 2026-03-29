import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Loader2, Copy, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WalletButton() {
  const { connected, connecting, publicKey, balance, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  const shorten = (pk) => {
    const s = pk?.toString() ?? '';
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <Button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-mono px-5 py-2 rounded-lg transition-all"
      >
        {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
        {connecting ? 'connecting...' : 'connect_wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-emerald-500/30 bg-black/60 hover:bg-emerald-500/10 text-emerald-400 font-mono text-sm px-4 py-2 rounded-lg"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span>{shorten(publicKey)}</span>
            <span className="text-emerald-500/40">|</span>
            <span className="text-emerald-300">{balance.toFixed(4)} SOL</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-black border-emerald-500/20 text-white font-mono text-xs">
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer hover:bg-emerald-500/10 text-slate-300">
          {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'copied!' : 'copy_address'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setVisible(true)} className="cursor-pointer hover:bg-emerald-500/10 text-slate-300">
          <Wallet className="w-4 h-4 mr-2" />
          change_wallet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnect} className="cursor-pointer hover:bg-red-500/10 text-red-400">
          <LogOut className="w-4 h-4 mr-2" />
          disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
