'use client';

import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface OrderEvent {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  requestedQty: number;
  requestedUsd: number;
  decision: "ALLOWED" | "BLOCKED";
  ruleFired: string | null;
  reason: string;
  createdAt: string;
}

interface Props {
  events: OrderEvent[];
  filter: "ALL" | "ALLOWED" | "BLOCKED";
  onFilterChange: (filter: "ALL" | "ALLOWED" | "BLOCKED") => void;
}

export function LiveDecisionFeed({ events, filter, onFilterChange }: Props) {
  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    return e.decision === filter;
  });

  return (
    <div className="flex flex-col h-full bg-surface panel">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-widest uppercase text-muted">
          Live Decision Feed
        </h2>
        <div className="flex gap-2 text-[10px] font-bold tracking-tighter uppercase">
          {(["ALL", "ALLOWED", "BLOCKED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-2 py-1 rounded-sm transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-surface text-muted hover:text-foreground border border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-financial text-xs panel-inset m-1">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-muted italic">
            No events to display
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 transition-colors hover:bg-white/5 border-l-2 ${
                  event.decision === "ALLOWED"
                    ? "border-l-accent-green"
                    : "border-l-accent-red bg-accent-red/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-muted">
                      {new Date(event.createdAt).toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="font-bold underline decoration-accent-amber/50">
                      {event.symbol}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 font-bold ${
                        event.side === "LONG"
                          ? "text-accent-green"
                          : "text-accent-red"
                      }`}
                    >
                      {event.side === "LONG" ? (
                        <ChevronUp size={14} strokeWidth={3} />
                      ) : (
                        <ChevronDown size={14} strokeWidth={3} />
                      )}
                      {event.side}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">
                      ${event.requestedUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-bold text-[10px] tracking-widest ${
                        event.decision === "ALLOWED"
                          ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
                          : "bg-accent-red/10 text-accent-red border border-accent-red/30"
                      }`}
                    >
                      {event.decision === "ALLOWED" ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {event.decision === "ALLOWED" ? "ALLOWED" : "BLOCKED"}
                    </div>
                  </div>
                </div>
                {event.decision === "BLOCKED" && (
                  <div className="mt-2 pl-4 border-l border-accent-red/30 py-1">
                    <div className="text-[10px] uppercase font-bold text-accent-amber mb-0.5">
                      VIOLATION: {event.ruleFired?.replace(/_/g, " ")}
                    </div>
                    <div className="text-muted italic leading-relaxed">
                      {event.reason}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
