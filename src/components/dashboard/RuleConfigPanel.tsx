'use client';

import { useState } from "react";
import { Save, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

interface RuleConfig {
  maxPositionSizeUsd: number;
  maxDrawdownPct: number;
  maxCorrelatedPositions: number;
  cooldownAfterLossMin: number;
  maxOrdersPerMinute: number;
}

interface Props {
  agentId: string;
  initialConfig: RuleConfig;
  onSave: (config: RuleConfig) => Promise<void>;
}

export function RuleConfigPanel({ agentId, initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<RuleConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);
    try {
      await onSave(config);
      setStatus({ type: 'success', message: 'Rules enforced successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Failed to update rules.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof RuleConfig, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setConfig(prev => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <div className="bg-surface panel h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ShieldCheck className="text-accent-amber" size={18} />
        <h2 className="text-sm font-bold tracking-widest uppercase text-muted">
          Rule Configuration
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigField
            label="Max Position Size"
            value={config.maxPositionSizeUsd}
            unit="USD"
            onChange={(v) => handleChange('maxPositionSizeUsd', v)}
            description="Blocks any single order exceeding this USD value."
          />
          <ConfigField
            label="Max Drawdown"
            value={config.maxDrawdownPct}
            unit="%"
            onChange={(v) => handleChange('maxDrawdownPct', v)}
            description="Total account-wide drawdown limit from high-water mark."
          />
          <ConfigField
            label="Cooldown After Loss"
            value={config.cooldownAfterLossMin}
            unit="MIN"
            onChange={(v) => handleChange('cooldownAfterLossMin', v)}
            description="Wait timer triggered after any realized loss."
          />
          <ConfigField
            label="Rate Limit"
            value={config.maxOrdersPerMinute}
            unit="OPM"
            onChange={(v) => handleChange('maxOrdersPerMinute', v)}
            description="Maximum order attempts allowed per rolling 60s."
          />
          <ConfigField
            label="Correlated Limit"
            value={config.maxCorrelatedPositions}
            unit="POS"
            onChange={(v) => handleChange('maxCorrelatedPositions', v)}
            description="Max open positions within the same sector/group."
          />
        </div>

        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
          <div className="flex-1">
            {status && (
              <div className={`flex items-center gap-2 text-xs font-bold uppercase transition-all duration-300 ${
                status.type === 'success' ? 'text-accent-green' : 'text-accent-red'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.message}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2 bg-accent-amber text-black font-bold uppercase tracking-widest text-xs transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? 'ENFORCING...' : 'SAVE RULES'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: number;
  unit: string;
  onChange: (v: string) => void;
  description: string;
}

function ConfigField({ label, value, unit, onChange, description }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] font-mono text-accent-amber/70 font-bold">
          {unit}
        </span>
      </div>
      <div className="relative group panel-inset">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2 text-sm font-financial outline-none focus:text-accent-amber transition-all"
        />
      </div>
      <p className="text-[9px] text-muted leading-tight italic">
        {description}
      </p>
    </div>
  );
}
