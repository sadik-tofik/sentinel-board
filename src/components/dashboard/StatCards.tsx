'use client';

import { Activity, ShieldAlert, ShieldCheck, DollarSign } from "lucide-react";

interface Stats {
  totalAttempted: number;
  totalAllowed: number;
  totalBlocked: number;
  equityUsd: number;
}

interface Props {
  stats: Stats;
}

export function StatCards({ stats }: Props) {
  const allowRate = stats.totalAttempted > 0 
    ? (stats.totalAllowed / stats.totalAttempted * 100).toFixed(1)
    : "0.0";
  
  const blockRate = stats.totalAttempted > 0 
    ? (stats.totalBlocked / stats.totalAttempted * 100).toFixed(1)
    : "0.0";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Attempted"
        value={stats.totalAttempted.toString()}
        icon={<Activity size={14} className="text-muted" />}
        subtext="Total order attempts"
      />
      <StatCard
        label="Allowed"
        value={stats.totalAllowed.toString()}
        icon={<ShieldCheck size={14} className="text-accent-green" />}
        subtext={`${allowRate}% execution rate`}
        colorClass="text-accent-green"
      />
      <StatCard
        label="Blocked"
        value={stats.totalBlocked.toString()}
        icon={<ShieldAlert size={14} className="text-accent-red" />}
        subtext={`${blockRate}% rejection rate`}
        colorClass="text-accent-red"
      />
      <StatCard
        label="Equity"
        value={`$${stats.equityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={<DollarSign size={14} className="text-accent-amber" />}
        subtext="Current account value"
        isMonospace
      />
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtext: string;
  colorClass?: string;
  isMonospace?: boolean;
}

function StatCard({ label, value, icon, subtext, colorClass = "", isMonospace = true }: CardProps) {
  return (
    <div className="bg-surface panel p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
          {label}
        </span>
        {icon}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${isMonospace ? 'font-financial' : ''} ${colorClass}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted italic font-medium uppercase tracking-tight">
        {subtext}
      </div>
      {/* Subtle background glow on hover */}
      <div className={`absolute -bottom-4 -right-4 w-12 h-12 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity bg-current ${colorClass}`} />
    </div>
  );
}
