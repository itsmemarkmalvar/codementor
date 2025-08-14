"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ModuleCard from "@/components/lesson-plans/ModuleCard";
import { motion } from "framer-motion";
import { ArrowLeft, Book, BookOpen, ChevronRight, GraduationCap, Info, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLessonPlanDetails, getLessonModules } from "@/services/api";
import { useParams, useRouter } from "next/navigation";

interface LessonPlan {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  topic_name?: string;
  objectives: string;
  prerequisites: string;
  created_at: string;
  modules_count: number;
  exercises_count: number;
  estimated_hours: number;
}

interface Module {
  id: number;
  lesson_plan_id: number;
  title: string;
  description: string;
  content: string;
  order_index: number;
  is_completed: boolean;
  is_locked: boolean;
  exercises_count: number;
  estimated_minutes: number;
}

export default function LessonPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = parseInt(params.planId as string);
  
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'overview'>('modules');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [planData, modulesData] = await Promise.all([
          getLessonPlanDetails(planId),
          getLessonModules(planId)
        ]);
        
        setPlan(planData);
        setModules(modulesData);
      } catch (error) {
        console.error("Error fetching lesson plan data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (planId) {
      fetchData();
    }
  }, [planId]);

  const startLessonPlan = () => {
    if (modules.length > 0) {
      router.push(`/dashboard/lesson-plans/${planId}/${modules[0].id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <Link href="/dashboard/lesson-plans">
            <span className="flex items-center hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Lesson Plans
            </span>
          </Link>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <Link href="/dashboard/lesson-plans">
            <span className="flex items-center hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Lesson Plans
            </span>
          </Link>
        </div>
        <div className="text-center py-12">
          <Book className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Lesson Plan Not Found</h3>
          <p className="text-gray-400 mb-6">The lesson plan you're looking for doesn't exist or has been removed.</p>
          <Link href="/dashboard/lesson-plans">
            <Button className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
              Browse Lesson Plans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-gray-400">
        <Link href="/dashboard/lesson-plans">
          <span className="flex items-center hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Lesson Plans
          </span>
        </Link>
      </div>
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{plan.title}</h1>
            <p className="text-gray-400">{plan.description}</p>
          </div>
          
          <Button
            onClick={startLessonPlan}
            disabled={modules.length === 0}
            className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Start Learning
          </Button>
        </div>
        
        {plan.topic_name && (
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2E5BFF]/20 text-[#2E5BFF]">
              <GraduationCap className="h-3 w-3 mr-1" />
              {plan.topic_name}
            </span>
          </div>
        )}
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
          <div className="relative p-6">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <BookOpen className="h-4 w-4" />
              <span>Modules</span>
            </div>
            <p className="text-2xl font-bold text-white">{plan.modules_count}</p>
          </div>
        </Card>
        
        {/* Exercises card removed (deprecated in favor of Practice). Keep layout consistent with 3 cards by using an info card. */}
        <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
          <div className="relative p-6">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <Book className="h-4 w-4" />
              <span>Practice</span>
            </div>
            <p className="text-sm text-gray-300">Hands-on coding is available in the Practice section, with problems linked per module.</p>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
          <div className="relative p-6">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <Info className="h-4 w-4" />
              <span>Estimated Time</span>
            </div>
            <p className="text-2xl font-bold text-white">{plan.estimated_hours} hours</p>
          </div>
        </Card>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-white/10 flex space-x-8">
        <button
          className={`pb-2 transition-colors ${
            activeTab === 'modules'
              ? 'text-white border-b-2 border-[#2E5BFF]'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('modules')}
        >
          Modules
        </button>
        <button
          className={`pb-2 transition-colors ${
            activeTab === 'overview'
              ? 'text-white border-b-2 border-[#2E5BFF]'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'modules' ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Lesson Modules</h2>
          
          {modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  id={module.id}
                  plan_id={planId}
                  title={module.title}
                  description={module.description}
                  order_index={module.order_index}
                  is_completed={module.is_completed}
                  is_locked={module.is_locked}
                  estimated_minutes={module.estimated_minutes}
                  exercise_count={module.exercises_count}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No modules available</h3>
              <p className="text-gray-400">This lesson plan doesn't have any modules yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
            <div className="relative p-6 prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-white">Learning Objectives</h3>
              <div className="text-gray-300 whitespace-pre-line mt-4">
                {plan.objectives}
              </div>
              
              <h3 className="text-xl font-semibold text-white mt-8">Prerequisites</h3>
              <div className="text-gray-300 whitespace-pre-line mt-4">
                {plan.prerequisites}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 