'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

interface BlockRate {
  rule: string;
  count: number;
}

interface EquityPoint {
  timestamp: string;
  equity: number;
}

interface Props {
  blockRates: BlockRate[];
  equityHistory: EquityPoint[];
}

export function AnalyticsRow({ blockRates, equityHistory }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Blocks by Rule */}
      <div className="bg-surface panel flex flex-col h-[300px]">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold tracking-widest uppercase text-muted">
            Blocks by Rule
          </h2>
        </div>
        <div className="flex-1 p-4 pr-6 panel-inset m-2">
          {blockRates.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted italic text-xs">
              No rule violations yet — this agent is operating within its risk parameters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={blockRates}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="rule"
                  type="category"
                  stroke="#888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--accent-red)"
                  radius={[0, 2, 2, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Equity Over Time */}
      <div className="bg-surface panel flex flex-col h-[300px]">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold tracking-widest uppercase text-muted">
            Equity Over Time
          </h2>
        </div>
        <div className="flex-1 p-2 panel-inset m-2">
          {equityHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted italic text-xs">
              No historical data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={equityHistory}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="timestamp"
                  fontSize={9}
                  stroke="#888"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(t) => t.split(" ")[1]} // Show only time
                />
                <YAxis
                  fontSize={9}
                  stroke="#888"
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  itemStyle={{ color: "var(--accent-green)" }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="var(--accent-green)"
                  fillOpacity={1}
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
                <ReferenceLine
                  y={10000}
                  stroke="var(--accent-amber)"
                  strokeDasharray="5 5"
                  label={{
                    value: "INIT",
                    position: "right",
                    fill: "var(--accent-amber)",
                    fontSize: 8,
                    fontWeight: "bold",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
