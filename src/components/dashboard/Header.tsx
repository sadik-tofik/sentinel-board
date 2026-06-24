'use client';

import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";

interface Props {
  agentName: string;
  isLive: boolean;
  equity: number;
  drawdown: number;
}

export function Header({ agentName, isLive, equity, drawdown }: Props) {
  return (
    <header className="bg-surface border-b border-border">
      {/* Top Row: Wordmark & Status */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-bold tracking-tighter uppercase group-hover:text-accent-green transition-colors">
              SentinelBoard
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-accent-green shadow-[0_0_8px_var(--accent-green)]' : 'bg-muted'}`} />
          </Link>
          <div className="w-px h-4 bg-border mx-2" />
          <span className="text-sm font-bold text-muted uppercase tracking-widest">
            {agentName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 ${
            isLive 
              ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' 
              : 'bg-accent-red/10 text-accent-red border border-accent-red/30'
          }`}>
            {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isLive ? 'LIVE' : 'DISCONNECTED'}
          </div>
        </div>
      </div>

      {/* Bottom Row: Key Market Data */}
      <div className="px-6 py-2 flex items-center gap-8 bg-black/20">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest leading-none mb-1">
            Account Equity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-financial leading-none tracking-tight">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {drawdown > 0 && (
              <span className="text-[10px] font-bold text-accent-red font-financial">
                -{drawdown.toFixed(2)}% DD
              </span>
            )}
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest leading-none mb-1">
            Operational Mode
          </span>
          <span className="text-xs font-bold text-accent-green uppercase tracking-wider">
            Active Enforcement
          </span>
        </div>
      </div>
    </header>
  );
}
