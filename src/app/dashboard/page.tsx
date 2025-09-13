"use client";import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Book, Code, GraduationCap, LineChart, Star, Trophy, Users, Brain } from "lucide-react";
import { getUserProgress, getProgressSummary, getModelComparison } from "@/services/api";
import { Badge } from "@/components/ui/badge";

interface ProgressEntry {
  id?: number;
  topic_id: number;
  topic_title?: string | null;
  progress_percentage: number;
  status: string;
  time_spent_minutes: number;
  current_streak_days?: number;
  last_interaction_at?: string | null;
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelCompare, setModelCompare] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Try consolidated summary first
        const s = await getProgressSummary();
        if (!mounted) return;
        if (s) setSummary(s);
        // Fetch per-model comparison (user-scoped)
        try { setModelCompare(await getModelComparison({ window: '30d', k_runs: 3, lookahead_min: 30 })); } catch {}
        // Fallback to per-topic list for compatibility
        const data = await getUserProgress();
        if (!mounted) return;
        setProgress(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setProgress([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const count = summary?.totals?.topics_tracked ?? progress.length;
    const totalMinutes = summary?.totals?.total_minutes ?? progress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
    const avgCompletion = summary?.totals?.avg_progress ?? (count > 0
      ? Math.round(progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / count)
      : 0);
    const maxStreak = summary?.totals?.best_streak_days ?? progress.reduce((max, p) => Math.max(max, p.current_streak_days || 0), 0);
    const activeStreak = summary?.totals?.active_streak_days ?? maxStreak;
    const completedCount = summary?.totals?.topics_completed ?? progress.filter(p => (p.progress_percentage || 0) >= 80).length;

    return [
      {
        title: "Total Study Time",
        value: formatHoursMinutes(totalMinutes),
        change: `${totalMinutes} min total`,
        icon: ClockIcon,
        color: "from-blue-500/20 to-purple-500/20"
      },
      {
        title: "Avg Completion",
        value: `${avgCompletion}%`,
        change: `${count} topics tracked`,
        icon: LineChart,
        color: "from-emerald-500/20 to-teal-500/20"
      },
      {
        title: "Active Streak",
        value: `${activeStreak} days`,
        change: completedCount > 0 ? `${completedCount} topics ≥ 80%` : "",
        icon: Trophy,
        color: "from-orange-500/20 to-yellow-500/20"
      },
      {
        title: "Topics",
        value: String(count),
        change: "tracked", 
        icon: Book,
        color: "from-pink-500/20 to-rose-500/20"
      }
    ];
  }, [progress]);

  const recent = useMemo(() => {
    const items = Array.isArray(summary?.recent_progress) && summary.recent_progress.length > 0
      ? summary.recent_progress
      : [...progress].sort((a, b) => {
          const ta = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
          const tb = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
          return tb - ta;
        }).slice(0, 6);
    return items.map((p: any) => ({
      title: p.topic_title || `Topic #${p.topic_id}`,
      type: p.status === 'completed' ? 'Completed' : 'Progress',
      description: `Progress ${p.progress_percentage}% • ${formatHoursMinutes(p.time_spent_minutes || 0)} studied`,
      time: p.last_interaction_at ? new Date(p.last_interaction_at).toLocaleString() : '—',
      icon: Code,
      color: 'bg-blue-500/20'
    }));
  }, [summary, progress]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
        <p className="text-gray-400">Track your progress and continue learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <stat.icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white">{loading ? '—' : stat.value}</h3>
                  <p className="mt-1 text-sm text-gray-400">{loading ? '' : stat.change}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="space-y-4">
          {(loading ? Array.from({ length: 3 }) : recent).map((activity: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${activity?.color || 'bg-white/10'}`}>
                      {(() => {
                        const Icon = (activity && activity.icon) ? activity.icon : Code;
                        return <Icon className="h-5 w-5 text-white" />;
                      })()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{loading ? '—' : activity.title}</p>
                        <span className="text-xs text-gray-400">{loading ? '' : activity.time}</span>
                      </div>
                      <p className="text-xs text-gray-400">{loading ? '' : activity.type}</p>
                      <p className="text-sm text-gray-300">{loading ? '' : activity.description}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compare AI Models (concise preview) */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <a href="/dashboard/analytics/models" className="text-lg font-semibold text-white hover:underline">TICA-E Analysis (30d)</a>
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-400 mb-2">Tutor Impact Comparative Algorithm - Extended</p>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="border-blue-500/30 text-blue-300">Hybrid Analysis</Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300">Poll-Driven</Badge>
              </div>
            </div>
            {modelCompare ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {['gemini','together'].map((m) => {
                  const u = (modelCompare.user_model || []).find((x: any) => x.model === m);
                  const pr = modelCompare?.enhanced_tica?.preference_rates;
                  const prefPct = typeof pr === 'object'
                    ? (m === 'gemini' ? pr?.gemini_preference_rate : pr?.together_preference_rate)
                    : undefined;
                  return (
                    <div key={m} className="space-y-1">
                      <p className="text-gray-400 capitalize">{m}</p>
                      <p className="text-white">Next‑run success: {u?.success1 !== undefined ? Math.round((u.success1 || 0)*100) : 0}%</p>
                      <p className="text-gray-400">TTF: {u?.ttf_min !== undefined && u?.ttf_min !== null ? `${u.ttf_min.toFixed(1)} min` : '—'}</p>
                      <p className="text-gray-400">Rating: {typeof prefPct === 'number' ? `${prefPct}%` : '—'}</p>
                    </div>
                  );
                })}
                <div className="col-span-2 pt-2 border-t border-white/10">
                  {(() => {
                    const pr = modelCompare?.enhanced_tica?.preference_rates;
                    if (pr && typeof pr.gemini_preference_rate === 'number' && typeof pr.together_preference_rate === 'number') {
                      const g = pr.gemini_preference_rate;
                      const t = pr.together_preference_rate;
                      let leader = 'Tie';
                      let pct = '';
                      if (g > t) { leader = 'Gemini'; pct = `${g}%`; }
                      else if (t > g) { leader = 'Together'; pct = `${t}%`; }
                      return (
                        <p className="text-xs text-gray-300">
                          Poll Leader: <span className="text-white font-medium">{leader}</span>
                          {leader !== 'Tie' ? ` • ${pct}` : ''}
                          {typeof pr.total_choices === 'number' ? ` • n=${pr.total_choices}` : ''}
                        </p>
                      );
                    }
                    return (
                      <p className="text-xs text-gray-500">Poll Leader: —</p>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Loading TICA-E metrics...</p>
            )}
          </div>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Learning Progress</h3>
              <GraduationCap className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {(summary?.by_topic || progress).slice(0, 5).map((p: any) => (
                <div key={p.topic_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{p.topic_title || `Topic #${p.topic_id}`}</span>
                    <span className="text-white">{p.progress_percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${Math.min(100, Math.max(0, p.progress_percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
              {progress.length === 0 && !loading && (
                <p className="text-sm text-gray-400">No progress yet. Start a topic to see your learning stats here.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Community Stats</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{summary?.totals?.topics_tracked ?? progress.length}</p>
                <p className="text-sm text-gray-400">Topics Tracked</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{summary?.totals?.lessons_completed ?? summary?.totals?.topics_completed ?? progress.filter(p => p.status === 'completed').length}</p>
                <p className="text-sm text-gray-400">Lessons Completed</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{summary?.totals?.total_minutes ?? progress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0)}</p>
                <p className="text-sm text-gray-400">Minutes Studied</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">{summary?.totals?.best_streak_days ?? progress.reduce((m, p) => Math.max(m, p.current_streak_days || 0), 0)}</p>
                <p className="text-sm text-gray-400">Best Streak</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Weighted Breakdown (server-computed) */}
      {summary?.weighted_breakdown && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Weighted Breakdown</h3>
              <LineChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {(() => {
                const b = summary.weighted_breakdown;
                const rows = [
                  { label: 'Interaction (max 30)', value: b.interaction_capped ?? 0, max: 30 },
                  { label: 'Code (max 40)', value: b.code_capped ?? 0, max: 40 },
                  { label: 'Time (max 5)', value: b.time_capped ?? 0, max: 5 },
                  { label: 'Quiz (max 30)', value: b.quiz_capped ?? 0, max: 30 },
                ];
                return (
                  <>
                    {rows.map((r) => (
                      <div key={r.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{r.label}</span>
                          <span className="text-white">{r.value}/{r.max}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${Math.min(100, Math.max(0, (r.value / r.max) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-white/10 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Overall Progress</span>
                        <span className="text-white">{b.overall_progress ?? 0}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${Math.min(100, Math.max(0, b.overall_progress ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* Adaptive Difficulty (RL) preview */}
      {summary?.rl && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Adaptive Difficulty (Preview)</h3>
              <LineChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Performance Score</span>
                  <span className="text-white font-medium">{summary.rl.performance_score}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Next Difficulty</span>
                  <span className="text-white capitalize">{summary.rl.difficulty_next}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Rule: Increase if &gt; {summary.rl.thresholds?.high}, Decrease if &lt; {summary.rl.thresholds?.low}
                </p>
              </div>

              <div className="space-y-3">
                {(() => {
                  const rows = [
                    { label: 'Quiz Avg %', value: summary.rl.quiz_avg_percent ?? 0 },
                    { label: 'Code Success %', value: summary.rl.code_success_rate ?? 0 },
                    { label: 'Error Rate %', value: summary.rl.error_rate ?? 0 },
                  ];
                  return (
                    <>
                      {rows.map((r) => (
                        <div key={r.label}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{r.label}</span>
                            <span className="text-white">{r.value}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{ width: `${Math.min(100, Math.max(0, r.value))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Minimal icon wrapper to show a clock icon in stats
function ClockIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}