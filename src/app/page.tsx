import Link from "next/link";

export default function LandingPage() {
  const defaultAgentId = "clv_rogue_agent_01";

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0c0c0c] relative overflow-hidden">
      {/* Background Texture: Subtle Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* Carbon Fiber / Brushed Metal Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      <div className="max-w-2xl w-full relative z-10">
        {/* Main Panel: Inset Control Surface */}
        <div className="p-12 bg-[#121212] rounded-xl border border-white/[0.05] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.05)]">
          
          {/* Wordmark: Embossed/Engraved Treatment */}
          <div className="mb-12 flex items-center justify-center gap-3">
            <span className="text-4xl font-bold tracking-tighter uppercase font-mono text-[#1a1a1a] 
              [text-shadow:1px_1px_1px_rgba(255,255,255,0.05),-1px_-1px_1px_rgba(0,0,0,0.8)] 
              drop-shadow-[0_2px_2px_rgba(0,0,0,1)]
              bg-clip-text bg-gradient-to-b from-[#222] to-[#111]">
              SentinelBoard
            </span>
            <div className="w-3 h-3 bg-accent-green rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_0_12px_var(--accent-green)] border border-accent-green/30" />
          </div>

          {/* Tagline: Technical Labeling */}
          <h1 className="text-xl md:text-2xl font-medium mb-8 text-[#a0a0a0] leading-snug">
            Risk-enforcement middleware for trading agents — hard rules enforced before execution, every decision logged.
          </h1>

          {/* Thesis: Verified Claim */}
          <p className="text-[#6c6c6c] leading-relaxed mb-14 max-w-lg mx-auto text-sm border-l-2 border-accent-amber/20 pl-6 italic">
            Agents have no independent risk guardian; this sits between any agent and the exchange. 
            It blocks what breaches configured limits and logs every decision with a timestamp and reason.
          </p>

        {/* CTA: Physical Pressable Button */}
        <div className="flex justify-center">
          <a
            href={`/dashboard/${defaultAgentId}`}
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm transition-all duration-75 active:translate-y-0.5"
          >
            {/* Button Shadow/Bezel */}
            <span className="absolute inset-0 bg-[#222] rounded-md border-t border-white/10 border-b-2 border-black/80 shadow-[0_4px_0_rgb(0,0,0),0_8px_15px_rgba(0,0,0,0.5)] group-hover:bg-[#282828] group-active:shadow-[0_1px_0_rgb(0,0,0),0_2px_5px_rgba(0,0,0,0.5)] group-active:bg-[#1a1a1a]" />
            
            {/* Button Content */}
            <span className="relative text-[#d0d0d0] group-hover:text-accent-green group-active:text-accent-green/80 flex items-center gap-2">
              Launch Dashboard
              <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse shadow-[0_0_5px_var(--accent-green)]" />
            </span>
            
            {/* Edge Top Highlight */}
            <span className="absolute top-0 left-1 right-1 h-[1px] bg-white/20 rounded-t-md opacity-50" />
          </a>
        </div>
        </div>

        {/* Decorative Hardware Elements */}
        <div className="mt-8 flex justify-between px-4 opacity-30">
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />)}
          </div>
          <span className="text-[10px] font-mono tracking-widest text-[#444] uppercase">
            Model: v2.4.0-GUARD
          </span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />)}
          </div>
        </div>
      </div>
    </main>
  );
}
