"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getModelComparison, getTopics, getAIPreferenceAnalytics } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock3, Bug, Star, ShieldAlert, Activity, Calendar, Hash, Timer, SlidersHorizontal, BookOpen, Users, BarChart3, Trophy, TrendingUp, GraduationCap, Code, Brain } from "lucide-react";

export default function ModelsComparisonPage() {
  const [data, setData] = useState<any | null>(null);
  const [preferenceData, setPreferenceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Array<{id:number; title:string}>>([]);
  const [filters, setFilters] = useState<{window:string; k_runs:number; lookahead_min:number; topic_id?: number; difficulty?: string; nmin:number; use_attribution_first?: boolean; quiz_pass_percent?: number}>({ window: "30d", k_runs: 3, lookahead_min: 30, nmin: 1, use_attribution_first: true, quiz_pass_percent: 70 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [resp, ts, prefResp] = await Promise.all([
          getModelComparison(filters),
          getTopics().catch(() => []),
          getAIPreferenceAnalytics({
            window: filters.window,
            topic_id: filters.topic_id,
            difficulty: filters.difficulty
          }).catch(() => null),
        ]);
        if (!mounted) return;
        setData(resp);
        setTopics(Array.isArray(ts) ? ts : []);
        setPreferenceData(prefResp?.data || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const renderBar = (pct: number, colorClass: string) =>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${colorClass}`} style={{width: `${Math.min(pct, 100)}%`}}></div>
    </div>;

  const UM = (model: string) => (data?.user_model || []).find((x: any) => x.model === model);
  const disabled = (n: number | undefined): boolean => (n ?? 0) < (data?.nmin ?? filters.nmin);

  const StatRow = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-gray-300">{label}</span>
      </div>
      <span className="text-white font-medium">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* TICA-E Algorithm Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">TICA-E Algorithm Analysis</h1>
            <p className="text-blue-200">Tutor Impact Comparative Algorithm - Extended</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/5 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-white font-medium">Hybrid Analysis</span>
            </div>
            <p className="text-gray-300">Combines causal analysis with preference correlation</p>
          </div>
          <div className="bg-white/5 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-white font-medium">Poll-Driven</span>
            </div>
            <p className="text-gray-300">User preference data from practice, quiz, and code execution</p>
          </div>
          <div className="bg-white/5 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span className="text-white font-medium">Multi-Source</span>
            </div>
            <p className="text-gray-300">Enhanced confidence with multiple data points</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">TICA-E Parameters</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Time Window</label>
            <Select value={filters.window} onValueChange={(v) => setFilters(prev => ({...prev, window: v}))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Min Sample Size</label>
            <Select value={String(filters.nmin)} onValueChange={(v) => setFilters(prev => ({...prev, nmin: parseInt(v)}))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Topic</label>
            <Select value={filters.topic_id ? String(filters.topic_id) : "all"} onValueChange={(v) => setFilters(prev => ({...prev, topic_id: v === "all" ? undefined : parseInt(v)}))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Difficulty</label>
            <Select value={filters.difficulty || "all"} onValueChange={(v) => setFilters(prev => ({...prev, difficulty: v === "all" ? undefined : v}))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>



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
                
                                 {/* Quiz Performance Metrics */}
                 {preferenceData && (
                   <>
                     <div className="border-t border-white/10 pt-3 mt-3">
                       <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Quiz Performance</div>
                      <StatRow 
                        label="Quiz Pass Rate" 
                        value={(() => {
                          const quizPref = preferenceData.quiz_analysis?.preference_model_performance?.[m];
                          const src = quizPref;
                          return src ? `${src.pass_rate}%` : '—';
                        })()} 
                        icon={<BookOpen className="h-4 w-4 text-indigo-400"/>} 
                      />
                      <StatRow 
                        label="Avg Quiz Score" 
                        value={(() => {
                          const quizPref = preferenceData.quiz_analysis?.preference_model_performance?.[m];
                          const src = quizPref;
                          return src ? `${src.avg_score}%` : '—';
                        })()} 
                        icon={<BarChart3 className="h-4 w-4 text-cyan-400"/>} 
                      />
                      <StatRow 
                        label="Quiz Attempts" 
                        value={(() => {
                          const quizPref = preferenceData.quiz_analysis?.preference_model_performance?.[m];
                          const src = quizPref;
                          return src ? src.total_attempts : '—';
                        })()} 
                        icon={<Users className="h-4 w-4 text-pink-400"/>} 
                      />
                     </div>
                     
                     {/* Practice Performance Metrics */}
                     <div className="border-t border-white/10 pt-3">
                       <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Practice Performance</div>
                       <StatRow 
                         label="Practice Success" 
                         value={(() => {
                           // Use the new practice-based data from user_model
                           const modelData = data?.user_model?.find((x: any) => x.model === m);
                           return modelData?.practice_success !== undefined ? `${Math.round((modelData.practice_success || 0) * 100)}%` : '—';
                         })()} 
                         icon={<GraduationCap className="h-4 w-4 text-green-400"/>} 
                       />
                       <StatRow 
                         label="Practice Attempts" 
                         value={(() => {
                           // Use the new practice-based data from user_model
                           const modelData = data?.user_model?.find((x: any) => x.model === m);
                           return modelData?.practice_attempts !== undefined ? modelData.practice_attempts : '—';
                         })()} 
                         icon={<Code className="h-4 w-4 text-orange-400"/>} 
                       />
                     </div>
                   </>
                 )}
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
            { k: "rating", label: "Δ Rating", fmt: (v:number)=> `${v.toFixed(2)}` },
            { k: "practice_success", label: "Δ Practice Success", fmt: (v:number)=> `${Math.round(v*100)}%` },
            { k: "practice_attempts", label: "Δ Practice Attempts", fmt: (v:number)=> `${v.toFixed(1)}` },
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


