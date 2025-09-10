"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Book, Filter, Search, Code, ArrowRight, BookOpen, Info } from "lucide-react";
import { useEffect, useState } from "react";
import LessonPlanCard from "@/components/lesson-plans/LessonPlanCard";
import { getLessonPlans, getTopics, getLessonPlanProgress } from "@/services/api";
import { progressSync } from "@/utils/crossTabSync";
import Link from "next/link";

interface LessonPlan {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  topic_name?: string;
  modules_count: number;
  completed_modules: number;
  prerequisites?: string;
}

interface Topic {
  id: number;
  title: string;
  parent_id: number | null;
}

export default function LessonPlansPage() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hierarchicalPlans, setHierarchicalPlans] = useState<Record<string, LessonPlan[]>>({});
  const [planOrder, setPlanOrder] = useState<string[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [lessonPlansData, topicsData] = await Promise.all([
        getLessonPlans(selectedTopic || undefined),
        getTopics()
      ]);

      // Map topic names to lesson plans
      const plansWithTopicNames = lessonPlansData.map((plan: any) => {
        const topic = topicsData.find((t: any) => t.id === plan.topic_id);
        return {
          ...plan,
          topic_name: topic?.title || "Unknown"
        };
      });

      // Attach effective progress (engagement preferred, fallback to module average)
      const withProgress = await Promise.all(plansWithTopicNames.map(async (plan: any) => {
        try {
          const prog = await getLessonPlanProgress(plan.id);
          const effective = Math.max(0, Math.min(100, Number(
            (prog?.engagement_overall_percentage ?? prog?.overall_percentage ?? 0)
          )));
          return { ...plan, progress_effective: effective };
        } catch {
          return { ...plan, progress_effective: 0 };
        }
      }));

      setLessonPlans(withProgress);
      setTopics(topicsData);
      
      // Canonical order for Java Basics
      const JAVA_BASICS_ORDER = [
        'Java Fundamentals',
        'Java Control Flow',
        'Java Methods in Depth',
        'Java Object-Oriented Programming',
        'Java Exception Handling',
        'Java File I/O',
        'Java Data Structures',
      ];

      // Build groups: For Java Basics topic, show a single ordered list; otherwise use prerequisites hierarchy
      const plansForGrouping = withProgress;
      const javaBasicsPlans = plansForGrouping.filter(p => p.topic_name === 'Java Basics');
      const otherPlans = plansForGrouping.filter(p => p.topic_name !== 'Java Basics');

      const hierarchy: Record<string, LessonPlan[]> = {};
      const order: string[] = [];

      if (javaBasicsPlans.length > 0) {
        const sortedBasics = [...javaBasicsPlans].sort((a, b) => {
          const ia = JAVA_BASICS_ORDER.indexOf(a.title);
          const ib = JAVA_BASICS_ORDER.indexOf(b.title);
          const sa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
          const sb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
          if (sa !== sb) return sa - sb;
          return a.id - b.id;
        });
        hierarchy['Java Basics'] = sortedBasics;
        order.push('Java Basics');
      }

      if (otherPlans.length > 0) {
        // Keep the old prerequisite-based grouping for other topics
        const foundation = otherPlans.filter(plan => !plan.prerequisites);
        if (foundation.length > 0) {
          hierarchy['Foundation'] = foundation;
          order.push('Foundation');
        }
        otherPlans.forEach(plan => {
          if (plan.prerequisites) {
            if (!hierarchy[plan.prerequisites]) {
              hierarchy[plan.prerequisites] = [];
              order.push(plan.prerequisites);
            }
            hierarchy[plan.prerequisites].push(plan);
          }
        });
      }
      
      setHierarchicalPlans(hierarchy);
      setPlanOrder(order);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Live refresh when progress events broadcast from split-screen
    const unsub = progressSync.onProgressUpdate(() => {
      fetchData();
    });
    return () => { unsub(); };
  }, [selectedTopic]);

  // Filter plans while maintaining hierarchy
  const getFilteredPlans = () => {
    if (!searchQuery) {
      return { hierarchy: hierarchicalPlans, order: planOrder };
    }
    
    // When searching, flatten the structure
    const filteredPlans = lessonPlans.filter(plan => 
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.topic_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return { 
      hierarchy: { "Search Results": filteredPlans },
      order: ["Search Results"]
    };
  };

  // Get the filtered plans based on search query
  const { hierarchy, order } = getFilteredPlans();

  return (
    <div className="space-y-8">
      {/* Updated Header with AI Tutor Room link */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#2E5BFF]" />
            Lesson Library
          </h1>
          <Link href="/dashboard/solo-room">
            <Button className="bg-[#2E5BFF] hover:bg-[#2343C3] text-white flex items-center gap-2">
              <Code className="h-4 w-4" />
              Go to AI Tutor Room
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-gray-400">Browse all available structured learning paths to enhance your programming skills</p>
      </div>
      
      {/* Information Card */}
      <Card className="bg-white/5 border-[#2E5BFF]/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#2E5BFF] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-white mb-1">Enhanced Learning Experience</h3>
          <p className="text-gray-400 text-sm">
            For the best learning experience, use these lesson plans in the AI Tutor Room where you can get personalized help and guidance from our AI tutor as you work through the content.
          </p>
        </div>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search the lesson library..."
            className="pl-10 w-full h-10 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            className="h-10 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] text-white px-3"
            value={selectedTopic || ""}
            onChange={(e) => setSelectedTopic(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lesson Plans Grid */}
      {isLoading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, index) => (
            <Card key={index} className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm h-[220px] animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/10 to-purple-500/10 opacity-10" />
            </Card>
          ))}
        </div>
      ) : order.length > 0 ? (
        // Display hierarchical groups of lesson plans
        <div className="space-y-8">
          {order.map((groupKey) => (
            <div key={groupKey} className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                {groupKey === "Foundation" ? (
                  <>
                    <BookOpen className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    Foundation (Step 1)
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    After "{groupKey}"
                  </>
                )}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hierarchy[groupKey]?.map((plan, index) => (
                  <div key={plan.id} className="relative group">
                    <Link href={`/dashboard/lesson-plans/${plan.id}`}>
                      <LessonPlanCard
                        id={plan.id}
                        title={plan.title}
                        description={plan.description}
                        topic_id={plan.topic_id}
                        topic_name={plan.topic_name}
                        modules_count={plan.modules_count}
                        completed_modules={plan.completed_modules}
                        index={index}
                        // @ts-ignore extra prop used by card for display
                        progress={Math.max(0, Math.min(100, (plan as any).progress_effective ?? 0))}
                      />
                    </Link>
                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/lesson-plans/${plan.id}`}>
                        <Button size="sm" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                          <Info className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </Link>
                      <Link href={`/dashboard/solo-room?topic=${plan.topic_id}&plan=${plan.id}`}>
                        <Button size="sm" className="bg-[#2E5BFF] hover:bg-[#2343C3] text-white">
                          <Code className="h-3 w-3 mr-1" />
                          Learn with AI
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="col-span-3 py-12 text-center">
          <Book className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No lesson plans found</h3>
          <p className="text-gray-400">
            {searchQuery
              ? "Try adjusting your search or filter criteria."
              : selectedTopic
              ? "No lesson plans available for this topic yet."
              : "No lesson plans have been created yet."}
          </p>
        </div>
      )}
    </div>
  );
} 