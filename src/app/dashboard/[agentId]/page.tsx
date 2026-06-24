'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StatCards } from '@/components/dashboard/StatCards';
import { LiveDecisionFeed } from '@/components/dashboard/LiveDecisionFeed';
import { AnalyticsRow } from '@/components/dashboard/AnalyticsRow';
import { RuleConfigPanel } from '@/components/dashboard/RuleConfigPanel';
import { DashboardErrorBoundary } from '@/components/dashboard/ErrorBoundary';

interface AgentData {
  id: string;
  name: string;
  equityUsd: number;
  ruleConfig: any;
  positions: any[];
}

interface StatsData {
  totalAttempted: number;
  totalAllowed: number;
  totalBlocked: number;
  blockRateByRule: Record<string, number>;
}

export default function DashboardPage() {
  const params = useParams();
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (params?.agentId) {
      setAgentId(params.agentId as string);
    }
  }, [params]);

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<number>(0);
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED'>('ALL');
  
  // Track poll count/ID to prevent out-of-order state updates
  const pollIdRef = useRef(0);
  // Track high-water mark for drawdown display
  const [highWaterMark, setHighWaterMark] = useState(10000);

  const fetchData = async (id: string) => {
    const currentPollId = ++pollIdRef.current;
    
    try {
      const res = await fetch(`/api/agents/${id}/dashboard`);

      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }

      const data = await res.json();

      if (currentPollId === pollIdRef.current) {
        setAgent(data.agent);
        setStats(data.stats);
        setOrders(data.orders);
        setIsLive(true);
        setLastPollTime(Date.now());
        
        if (data.agent.equityUsd > highWaterMark) {
          setHighWaterMark(data.agent.equityUsd);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      if (currentPollId === pollIdRef.current) {
        const now = Date.now();
        if (lastPollTime === 0 || now - lastPollTime > 10000) {
          setIsLive(false);
        }
      }
    }
  };

  useEffect(() => {
    if (!agentId) return;

    let mounted = true;
    
    const runPoll = async () => {
      if (!mounted) return;
      await fetchData(agentId);
    };

    runPoll();
    const interval = setInterval(runPoll, 3000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [agentId]);

  const handleSaveRules = async (newConfig: any) => {
    // Ground Rule #3: Strip read-only fields
    const { id, agentId: _, updatedAt, ...editableConfig } = newConfig;

    const res = await fetch(`/api/agents/${agentId}/rules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editableConfig),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Failed to save rules');
    }

    if (agentId) {
      fetchData(agentId);
    }
  };

  // Re-calculate equity history for chart client-side
  // Formula: Starting balance ($10,000) + progressive sum of PnL
  const equityHistory = useMemo(() => {
    if (!orders.length) return [];
    
    // We'll use order timestamps and dummy incremental points for the chart.
    // In a real scenario, we'd have a time-series of equity.
    // Here we derive it from orders to show movement.
    const points = [{ timestamp: "T-0 00:00:00", equity: 10000 }];
    let currentEquity = 10000;
    
    // Reverse to process chronologically
    [...orders].reverse().forEach((order, i) => {
      if (order.decision === 'ALLOWED') {
        // Simulating some equity movement per allowed order for the demo chart
        // Since we don't have historical equity snapshots in DB yet.
        currentEquity += (Math.random() - 0.4) * 50; 
      }
      points.push({
        timestamp: `${i} ${new Date(order.createdAt).toLocaleTimeString([], { hour12: false })}`,
        equity: currentEquity
      });
    });

    // Add current real equity as the final point
    if (agent) {
      points.push({
        timestamp: `NOW ${new Date().toLocaleTimeString([], { hour12: false })}`,
        equity: agent.equityUsd
      });
    }

    return points.slice(-20); // Last 20 points
  }, [orders, agent]);

  const blockRates = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.blockRateByRule).map(([rule, count]) => ({
      rule: rule.replace(/_/g, ' '),
      count
    })).sort((a, b) => b.count - a.count);
  }, [stats]);

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-muted font-financial animate-pulse tracking-[0.5em] uppercase">
        INITIALIZING TERMINAL...
      </div>
    );
  }

  const drawdownPct = highWaterMark > 0 
    ? ((highWaterMark - agent.equityUsd) / highWaterMark) * 100 
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DashboardErrorBoundary>
        <Header 
          agentName={agent.name} 
          isLive={isLive} 
          equity={agent.equityUsd} 
          drawdown={drawdownPct > 0 ? drawdownPct : 0} 
        />
      </DashboardErrorBoundary>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <DashboardErrorBoundary>
          <StatCards stats={{
            totalAttempted: stats?.totalAttempted || 0,
            totalAllowed: stats?.totalAllowed || 0,
            totalBlocked: stats?.totalBlocked || 0,
            equityUsd: agent.equityUsd
          }} />
        </DashboardErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <DashboardErrorBoundary>
              <AnalyticsRow blockRates={blockRates} equityHistory={equityHistory} />
            </DashboardErrorBoundary>
            
            <DashboardErrorBoundary>
              <LiveDecisionFeed 
                events={orders} 
                filter={feedFilter} 
                onFilterChange={setFeedFilter} 
              />
            </DashboardErrorBoundary>
          </div>

          <div className="flex flex-col">
            <DashboardErrorBoundary>
              <RuleConfigPanel 
                agentId={agentId!} 
                initialConfig={agent.ruleConfig} 
                onSave={handleSaveRules} 
              />
            </DashboardErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
