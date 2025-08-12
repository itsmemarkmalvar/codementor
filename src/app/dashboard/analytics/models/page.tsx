"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getModelComparison, getTopics } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock3, Bug, Star, ShieldAlert, Activity, Calendar, Hash, Timer, SlidersHorizontal, BookOpen } from "lucide-react";

export default function ModelsComparisonPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Array<{id:number; title:string}>>([]);
  const [filters, setFilters] = useState<{window:string; k_runs:number; lookahead_min:number; topic_id?: number; difficulty?: string; nmin:number}>({ window: "30d", k_runs: 3, lookahead_min: 30, nmin: 5 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [resp, ts] = await Promise.all([
          getModelComparison(filters),
          getTopics().catch(() => []),
        ]);
        if (!mounted) return;
        setData(resp);
        setTopics(Array.isArray(ts) ? ts : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const renderBar = (pct: number, colorClass: string) => (
    <div className="h-2 bg-white/10 rounded">
      <div className={`h-full rounded ${colorClass}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );

  const UM = (m: string) => (data?.user_model || []).find((x: any) => x.model === m);

  const disabled = (n?: number) => typeof n === 'number' && data?.nmin && n < data.nmin;

  const StatRow = ({
    label,
    value,
    icon,
  }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-gray-400">{icon}<span>{label}</span></span>
      <span className="text-white">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-white">AI Models Comparison</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="border-white/10 text-gray-300">Window: {data?.window || filters.window}</Badge>
          <Badge variant="outline" className="border-white/10 text-gray-300">K={data?.k_runs ?? filters.k_runs}</Badge>
          <Badge variant="outline" className="border-white/10 text-gray-300">Lookahead={data?.lookahead_min ?? filters.lookahead_min}m</Badge>
          <Badge variant="outline" className="border-white/10 text-gray-300">Nmin={data?.nmin ?? filters.nmin}</Badge>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Select value={filters.window} onValueChange={(v)=>setFilters(f=>({...f, window:v}))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white min-w-[150px] w-full">
              <span className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Window" className="truncate" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="90d">Last 90d</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(filters.k_runs)} onValueChange={(v)=>setFilters(f=>({...f, k_runs: Number(v)}))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white min-w-[150px] w-full">
              <span className="flex items-center gap-2 min-w-0">
                <Hash className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="K runs" className="truncate" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {[1,3,5].map(k=>(
                <SelectItem key={k} value={String(k)}>K={k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filters.lookahead_min)} onValueChange={(v)=>setFilters(f=>({...f, lookahead_min: Number(v)}))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white min-w-[150px] w-full">
              <span className="flex items-center gap-2 min-w-0">
                <Timer className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Lookahead" className="truncate" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {[15,30,60].map(m=>(
                <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.difficulty ?? 'all'} onValueChange={(v)=>setFilters(f=>({...f, difficulty: v === 'all' ? undefined : v}))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white min-w-[150px] w-full">
              <span className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Difficulty" className="truncate" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulties</SelectItem>
              {['beginner','easy','medium','hard','expert'].map(l=>(
                <SelectItem key={l} value={l}><span className="capitalize">{l}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.topic_id ? String(filters.topic_id) : 'all'} onValueChange={(v)=>setFilters(f=>({...f, topic_id: v === 'all' ? undefined : Number(v)}))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white min-w-[200px] w-full">
              <span className="flex items-center gap-2 min-w-0">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Topic" className="truncate" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {["gemini", "together"].map((m) => {
          const u = UM(m) || {};
          return (
            <Card key={m} className="border-white/10 bg-white/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold capitalize">{m}</h3>
                <span className="text-xs text-gray-400">n={u.n ?? 0}{disabled(u.n)?' • min '+(data?.nmin ?? filters.nmin): ''}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <StatRow label="Next‑run success" value={typeof u.success1 === 'number' ? `${Math.round((u.success1 || 0)*100)}%` : '—'} icon={<CheckCircle2 className="h-4 w-4 text-emerald-400"/>} />
                  {typeof u.success1 === 'number' ? renderBar(((u.success1 || 0) * 100) || 0, "bg-emerald-500") : null}
                </div>
                <StatRow label="Time to fix" value={typeof u.ttf_min === 'number' ? `${u.ttf_min.toFixed(1)} min` : '—'} icon={<Clock3 className="h-4 w-4 text-blue-400"/>} />
                <StatRow label="Error reduction" value={typeof u.delta_errors === 'number' ? u.delta_errors : '—'} icon={<Bug className="h-4 w-4 text-orange-400"/>} />
                <StatRow label="Rating" value={typeof u.rating === 'number' ? u.rating.toFixed(1) : '—'} icon={<Star className="h-4 w-4 text-yellow-400"/>} />
                <StatRow label="Fallback rate" value={typeof u.fallback_rate === 'number' ? `${Math.round(u.fallback_rate*100)}%` : '—'} icon={<ShieldAlert className="h-4 w-4 text-rose-400"/>} />
                <StatRow label="Latency" value={typeof u.latency_ms === 'number' ? `${u.latency_ms.toFixed(0)} ms` : '—'} icon={<Activity className="h-4 w-4 text-purple-400"/>} />
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
            const show = typeof s?.mean === 'number' && (!data?.nmin || (typeof s?.n === 'number' ? s.n >= data.nmin : true));
            const val = show ? s.mean : 0;
            return (
              <div key={row.k} className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">{row.label}</span><span className="text-white">{show ? row.fmt(val) : '—'}</span></div>
                {row.k === 'success1' && show ? renderBar((val*100)||0, 'bg-blue-500') : null}
              </div>
            );
          })}
        </div>
      </Card>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2].map((i) => (
            <Card key={i} className="border-white/10 bg-white/5 p-6">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="h-4 bg-white/10 rounded animate-pulse" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


