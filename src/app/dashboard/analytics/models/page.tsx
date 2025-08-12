"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getModelComparison } from "@/services/api";

export default function ModelsComparisonPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await getModelComparison({ window: "30d", k_runs: 3, lookahead_min: 30 });
        if (!mounted) return;
        setData(resp);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const renderBar = (pct: number, colorClass: string) => (
    <div className="h-2 bg-white/10 rounded">
      <div className={`h-full rounded ${colorClass}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );

  const UM = (m: string) => (data?.user_model || []).find((x: any) => x.model === m);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Models Comparison</h1>
        <p className="text-gray-400 text-sm">Window: {data?.window || "30d"} • K={data?.k_runs ?? 3} • Lookahead={data?.lookahead_min ?? 30}m</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {["gemini", "together"].map((m) => {
          const u = UM(m) || {};
          return (
            <Card key={m} className="border-white/10 bg-white/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold capitalize">{m}</h3>
                <span className="text-xs text-gray-400">n={u.n ?? 0}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Next‑run success</span><span className="text-white">{u.success1 !== undefined ? Math.round((u.success1 || 0)*100) : 0}%</span></div>
                  {renderBar(((u.success1 || 0) * 100) || 0, "bg-emerald-500")}
                </div>
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Time to fix</span><span className="text-white">{u.ttf_min !== undefined && u.ttf_min !== null ? `${u.ttf_min.toFixed(1)} min` : "—"}</span></div>
                </div>
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Error reduction</span><span className="text-white">{u.delta_errors ?? 0}</span></div>
                </div>
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Rating</span><span className="text-white">{u.rating ? u.rating.toFixed(1) : "—"}</span></div>
                </div>
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Fallback rate</span><span className="text-white">{u.fallback_rate ? Math.round(u.fallback_rate*100) : 0}%</span></div>
                </div>
                <div>
                  <div className="flex justify-between"><span className="text-gray-400">Latency</span><span className="text-white">{u.latency_ms ? `${u.latency_ms.toFixed(0)} ms` : "—"}</span></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/10 bg-white/5 p-6">
        <h3 className="text-white font-semibold mb-3">Paired differences (Gemini − Together)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            { k: "success1", label: "Δ Next‑run success", fmt: (v:number)=> `${Math.round(v*100)}%` },
            { k: "ttf_min", label: "Δ Time to fix", fmt: (v:number)=> `${v.toFixed(1)} min` },
            { k: "delta_errors", label: "Δ Error reduction", fmt: (v:number)=> `${v}` },
            { k: "delta_quiz", label: "Δ Quiz %", fmt: (v:number)=> `${v.toFixed(1)} pp` },
            { k: "rating", label: "Δ Rating", fmt: (v:number)=> `${v.toFixed(2)}` },
            { k: "fallback_rate", label: "Δ Fallback", fmt: (v:number)=> `${Math.round(v*100)}%` },
          ].map(row => {
            const s = data?.paired?.[row.k];
            const val = typeof s?.mean === 'number' ? s.mean : 0;
            return (
              <div key={row.k} className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">{row.label}</span><span className="text-white">{row.fmt(val)}</span></div>
                {row.k === 'success1' ? renderBar((val*100)||0, 'bg-blue-500') : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}


