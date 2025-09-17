"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Award, Book, Calendar, CheckCircle, Clock, Code, Star, Target, Trophy, TrendingUp } from "lucide-react";
import { getLessonPlans, getLessonPlanProgress, getTopics, getTopicAggregateProgress, heartbeat, getUserProgress, getProgressSummary } from "@/services/api";

// dynamic stats
const achievements: any[] = [];

const recentProgressStatic: any[] = [];

// Removed static recent progress cards

export default function ProgressPage() {
  const [topics, setTopics] = useState<Array<any>>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [topicProgress, setTopicProgress] = useState<any | null>(null);
  const [lessonPlans, setLessonPlans] = useState<Array<any>>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<number, any>>({});
  const [weightedBreakdown, setWeightedBreakdown] = useState<any | null>(null);
  const [stats, setStats] = useState<Array<any>>([]);
  const [recent, setRecent] = useState<Array<any>>([]);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const data = await getTopics();
        setTopics(data || []);
        if ((data || []).length > 0) setSelectedTopicId(data[0].id);
        // Prefer server summary for canonical stats
        try {
          const s = await getProgressSummary();
          if (s && s.totals) {
            const totalMinutes = Number(s.totals.total_minutes || 0);
            const avgProgress = Number(s.totals.avg_progress || 0);
            const completed = Number(s.totals.topics_completed || 0);
            const streakMax = Number(s.totals.best_streak_days || 0);
            setStats([
              { title: 'Total Learning Hours', value: `${Math.floor(totalMinutes / 60) > 0 ? `${Math.floor(totalMinutes/60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}`, change: '', icon: Clock, color: 'from-[#2E5BFF]/20 to-purple-500/20' },
              { title: 'Completion Rate', value: `${avgProgress}%`, change: '', icon: Target, color: 'from-purple-500/20 to-[#2E5BFF]/20' },
              { title: 'Topics Completed', value: `${completed}`, change: '', icon: Trophy, color: 'from-[#2E5BFF]/20 to-purple-500/20' },
              { title: 'Best Streak', value: `${streakMax}d`, change: '', icon: Award, color: 'from-purple-500/20 to-[#2E5BFF]/20' },
            ]);
          }
        } catch {}

        // Fallback: derive stats and recent from all user progress if summary not available
        try {
          const up = await getUserProgress();
          const totalMinutes = (up || []).reduce((s: number, p: any) => s + (p.time_spent_minutes || 0), 0);
          const avgProgress = (up || []).length > 0 ? Math.round((up.reduce((s: number, p: any) => s + (p.progress_percentage || 0), 0)) / up.length) : 0;
          const completed = (up || []).filter((p: any) => (p.progress_percentage || 0) >= 80 || p.status === 'completed').length;
          const streakMax = Math.max(0, ...((up || []).map((p: any) => p.current_streak_days || 0)));
          setStats([
            { title: 'Total Learning Hours', value: `${Math.floor(totalMinutes / 60) > 0 ? `${Math.floor(totalMinutes/60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}`, change: '', icon: Clock, color: 'from-[#2E5BFF]/20 to-purple-500/20' },
            { title: 'Completion Rate', value: `${avgProgress}%`, change: '', icon: Target, color: 'from-purple-500/20 to-[#2E5BFF]/20' },
            { title: 'Topics Completed', value: `${completed}`, change: '', icon: Trophy, color: 'from-[#2E5BFF]/20 to-purple-500/20' },
            { title: 'Best Streak', value: `${streakMax}d`, change: '', icon: Award, color: 'from-purple-500/20 to-[#2E5BFF]/20' },
          ]);

          const recentItems = [...(up || [])]
            .sort((a: any, b: any) => new Date(b.last_interaction_at || 0).getTime() - new Date(a.last_interaction_at || 0).getTime())
            .slice(0, 5)
            .map((p: any) => ({
              title: p.topic_title || `Topic ${p.topic_id}`,
              type: 'Topic',
              milestone: `${p.progress_percentage}% • streak ${p.current_streak_days || 0}d` ,
              time: (p.last_interaction_at ? new Date(p.last_interaction_at).toLocaleString() : ''),
              icon: Book,
              color: 'bg-[#2E5BFF]/20'
            }));
          setRecent(recentItems);
        } catch (e) {
          console.warn('Failed to load user progress for stats', e);
        }
      } catch (e) {
        console.error("Failed to load topics", e);
      }
    };
    loadTopics();
  }, []);

  useEffect(() => {
    const loadTopicProgress = async () => {
      if (!selectedTopicId) return;
      try {
        const tp = await getTopicAggregateProgress(selectedTopicId);
        setTopicProgress(tp);
        // fetch weighted breakdown without incrementing time
        try {
          const hb = await heartbeat({ topic_id: selectedTopicId, minutes_increment: 0 });
          setWeightedBreakdown(hb?.weighted_breakdown || null);
        } catch (e) {
          console.warn("heartbeat (read) failed", e);
        }
        const plans = await getLessonPlans(selectedTopicId);
        setLessonPlans(plans || []);
        // fetch each lesson plan progress
        const entries: Record<number, any> = {};
        for (const lp of plans || []) {
          try {
            const lpProg = await getLessonPlanProgress(lp.id);
            entries[lp.id] = lpProg;
          } catch (e) {
            console.warn("lesson progress error", lp.id, e);
          }
        }
        setLessonProgressMap(entries);
      } catch (e) {
        console.error("Failed to load topic progress", e);
      }
    };
    loadTopicProgress();
  }, [selectedTopicId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Learning Progress</h1>
        <p className="text-gray-400">Track your achievements and growth</p>
      </div>

      {/* Topic selector and overall */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">Topic:</span>
          <select
            className="bg-white/5 text-white border border-white/10 rounded px-2 py-1 text-sm"
            value={selectedTopicId ?? ''}
            onChange={(e) => setSelectedTopicId(Number(e.target.value))}
          >
            {(topics || []).map((t: any) => (
              <option key={t.id} value={t.id} className="bg-gray-900">
                {t.title}
              </option>
            ))}
          </select>
        </div>
        {topicProgress && (
          <div className="text-sm text-gray-300">
            Overall Topic Progress: <span className="text-[#2E5BFF] font-semibold">{topicProgress.overall_percentage}%</span>
          </div>
        )}
      </div>

      {/* Stats Grid (dynamic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <stat.icon className="h-5 w-5 text-[#2E5BFF]" />
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                  <p className="mt-1 text-sm text-gray-400">{stat.change}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Weighted breakdown from server */}
      {weightedBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[{
            label: 'Interaction', val: weightedBreakdown.interaction_capped, cap: 30
          }, {
            label: 'Code', val: weightedBreakdown.code_capped, cap: 40
          }, {
            label: 'Time', val: weightedBreakdown.time_capped, cap: 5
          }, {
            label: 'Quiz', val: weightedBreakdown.quiz_capped, cap: 30
          }, {
            label: 'Overall', val: weightedBreakdown.overall_progress, cap: 100
          }].map((item, idx) => (
            <Card key={idx} className="border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>{item.label}</span>
                <span className="text-[#2E5BFF] font-semibold">{item.val}/{item.cap}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-2">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500" style={{ width: `${Math.min(100, (item.val/item.cap)*100)}%` }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lesson breakdown for selected topic */}
      {lessonPlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Lessons in Topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessonPlans.map((lp: any, index: number) => {
              const lpProg = lessonProgressMap[lp.id];
              const pct = lpProg?.overall_percentage ?? 0;
              return (
                <motion.div key={lp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm">
                    <div className="relative p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{lp.title}</h3>
                          <p className="text-sm text-gray-400">{lp.description}</p>
                        </div>
                        <Book className="h-5 w-5 text-[#2E5BFF]" />
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-[#2E5BFF]">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Progress (dynamic) */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Progress</h2>
        <div className="space-y-4">
          {recent.map((item, index) => (
            <motion.div key={`${item.title}-${index}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <item.icon className="h-5 w-5 text-[#2E5BFF]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <span className="text-xs text-gray-400">{item.time}</span>
                      </div>
                      <p className="text-xs text-gray-400">{item.type}</p>
                      <p className="text-sm text-gray-300">{item.milestone}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Static Recent Progress section removed */}
    </div>
  );
} 