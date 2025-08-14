"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Exercises deprecated in favor of related practice
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Book, CheckCircle, Clock, Code } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLessonModules, getLessonPlanDetails, updateModuleProgress, executeJavaCode, getRelatedPracticeForModule } from "@/services/api";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

interface Module {
  id: number;
  lesson_plan_id: number;
  title: string;
  description: string;
  content: string;
  order_index: number;
  is_completed: boolean;
  next_module_id: number | null;
  prev_module_id: number | null;
  estimated_minutes: number;
}

interface Exercise {
  id: number;
  module_id: number;
  title: string;
  description: string;
  instructions: string;
  starter_code: string;
  solution_code: string;
  test_cases: string;
  type: string;
  points: number;
  difficulty: number; // 1-5 scale from database
  is_completed: boolean;
}

interface LessonPlan {
  id: number;
  title: string;
  topic_name?: string;
}

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const planId = parseInt(params.planId as string);
  const moduleId = parseInt(params.moduleId as string);
  
  const [module, setModule] = useState<Module | null>(null);
  const [relatedPractice, setRelatedPractice] = useState<any[]>([]);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'exercises'>('content');
  const [showExercise, setShowExercise] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [code, setCode] = useState("");
  const [exerciseOutput, setExerciseOutput] = useState("");
  
  const trackProgress = async () => {
    if (!module) return;
    
    try {
      await updateModuleProgress(moduleId, {
        status: 'in_progress',
        time_spent_minutes: 1
      });
    } catch (error) {
      console.error("Error tracking module progress:", error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get all modules to determine navigation
        const [modulesData, practiceData, planData] = await Promise.all([
          getLessonModules(planId),
          getRelatedPracticeForModule(moduleId),
          getLessonPlanDetails(planId)
        ]);
        
        // Find current module
        const currentModule = modulesData.find((m: any) => m.id === moduleId);
        if (!currentModule) {
          throw new Error("Module not found");
        }
        
        // Add next/prev module IDs
        const currentIndex = modulesData.findIndex((m: any) => m.id === moduleId);
        const nextModule = currentIndex < modulesData.length - 1 ? modulesData[currentIndex + 1] : null;
        const prevModule = currentIndex > 0 ? modulesData[currentIndex - 1] : null;
        
        const moduleWithNav = {
          ...currentModule,
          next_module_id: nextModule?.id || null,
          prev_module_id: prevModule?.id || null
        };
        
        setModule(moduleWithNav);
        setRelatedPractice(practiceData || []);
        setPlan(planData);
        
        // Track progress
        trackProgress();
      } catch (error) {
        console.error("Error fetching module data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (planId && moduleId) {
      fetchData();
    }
  }, [planId, moduleId]);
  
  const handleExerciseStart = (exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setActiveExercise(exercise);
      setCode(exercise.starter_code || "");
      setShowExercise(true);
    }
  };
  
  const handleCodeChange = (value: string | undefined) => {
    setCode(value || "");
  };
  
  const handleRunCode = async () => {
    try {
      setExerciseOutput("Running code...\n");
      const resp = await executeJavaCode({ code });
      const out = resp?.execution?.stdout || "";
      const err = resp?.execution?.stderr || "";
      setExerciseOutput([out, err].filter(Boolean).join("\n"));
    } catch (e: any) {
      setExerciseOutput(e?.message || 'Failed to execute code.');
    }
  };
  
  const handleSubmitExercise = () => {
    setExerciseOutput("Evaluating submission...\n");
    
    // Mock submission for now - will integrate with backend
    setTimeout(() => {
      setExerciseOutput("✅ Exercise completed successfully!\n\nYour solution passes all test cases.");
      toast.success("Exercise completed!");
      
      // Update local state
      if (activeExercise) {
        setExercises(prev => 
          prev.map(ex => 
            ex.id === activeExercise.id 
              ? { ...ex, is_completed: true } 
              : ex
          )
        );
      }
      
      // Close exercise view after 2 seconds
      setTimeout(() => {
        setShowExercise(false);
        setActiveExercise(null);
      }, 2000);
    }, 1500);
  };
  
  const handleCompleteModule = async () => {
    try {
      await updateModuleProgress(moduleId, {
        status: 'completed',
        time_spent_minutes: 15
      });
      
      toast.success("Module completed!");
      
      // Navigate to next module if available
      if (module?.next_module_id) {
        router.push(`/dashboard/lesson-plans/${planId}/${module.next_module_id}`);
      } else {
        router.push(`/dashboard/lesson-plans/${planId}`);
      }
    } catch (error) {
      console.error("Error completing module:", error);
      toast.error("Failed to complete module");
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <Link href={`/dashboard/lesson-plans/${planId}`}>
            <span className="flex items-center hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Lesson Plan
            </span>
          </Link>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="h-64 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!module || !plan) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <Link href={`/dashboard/lesson-plans/${planId}`}>
            <span className="flex items-center hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Lesson Plan
            </span>
          </Link>
        </div>
        <div className="text-center py-12">
          <Book className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Module Not Found</h3>
          <p className="text-gray-400 mb-6">The module you're looking for doesn't exist or has been removed.</p>
          <Link href={`/dashboard/lesson-plans/${planId}`}>
            <Button className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
              Return to Lesson Plan
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Render exercise view
  if (showExercise && activeExercise) {
    return (
      <div className="space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-gray-400">
          <button onClick={() => setShowExercise(false)}>
            <span className="flex items-center hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Module
            </span>
          </button>
        </div>
        
        {/* Exercise Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{activeExercise.title}</h1>
          <p className="text-gray-400">{activeExercise.description}</p>
        </div>
        
        {/* Exercise Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instructions Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-[calc(100vh-12rem)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
              <div className="relative p-6 space-y-6 overflow-y-auto h-full">
                <div className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-semibold text-white">Instructions</h3>
                  <div className="text-gray-300 whitespace-pre-line mt-4">
                    {activeExercise.instructions}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Code Editor Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-[calc(100vh-12rem)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
              <div className="relative p-6 space-y-4 h-full flex flex-col">
                {/* Editor Controls */}
                <div className="flex items-center justify-between">
                  <select
                    className="bg-white/10 border-0 rounded text-sm text-gray-300 focus:ring-[#2E5BFF]"
                    value="java"
                    disabled
                  >
                    <option value="java">Java</option>
                  </select>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleRunCode}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Code className="h-4 w-4 mr-2" />
                      Run Code
                    </Button>
                    <Button
                      onClick={handleSubmitExercise}
                      className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  </div>
                </div>
                
                {/* Code Editor */}
                <div className="flex-1 overflow-hidden rounded border border-white/10">
                  <Editor
                    height="100%"
                    defaultLanguage="java"
                    theme="vs-dark"
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
                
                {/* Output Section */}
                <div className="h-32">
                  <div className="bg-black/30 rounded p-4 h-full overflow-y-auto">
                    <pre className="text-sm text-gray-300">{exerciseOutput}</pre>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-gray-400">
        <Link href={`/dashboard/lesson-plans/${planId}`}>
          <span className="flex items-center hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {plan.title}
          </span>
        </Link>
      </div>
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{module.title}</h1>
          <div className="flex items-center space-x-2 text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{module.estimated_minutes} mins</span>
          </div>
        </div>
        <p className="text-gray-400">{module.description}</p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-white/10 flex space-x-8">
        <button
          className={`pb-2 transition-colors ${
            activeTab === 'content'
              ? 'text-white border-b-2 border-[#2E5BFF]'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={`pb-2 transition-colors ${
            activeTab === 'exercises'
              ? 'text-white border-b-2 border-[#2E5BFF]'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('exercises')}
        >
          Related practice {relatedPractice.length > 0 ? `(${relatedPractice.length})` : ''}
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'content' ? (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
            <div className="relative p-6 prose prose-invert max-w-none">
              <div className="text-gray-300 whitespace-pre-line">
                {module.content}
              </div>
            </div>
          </Card>
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            {module.prev_module_id ? (
              <Link href={`/dashboard/lesson-plans/${planId}/${module.prev_module_id}`}>
                <Button
                  variant="outline"
                  className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous Module
                </Button>
              </Link>
            ) : (
              <div>{/* Empty div for spacing */}</div>
            )}
            
            <Button
              onClick={handleCompleteModule}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {module.is_completed ? "Completed" : "Mark as Complete"}
            </Button>
            
            {module.next_module_id ? (
              <Link href={`/dashboard/lesson-plans/${planId}/${module.next_module_id}`}>
                <Button
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                >
                  Next Module
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/lesson-plans/${planId}`}>
                <Button
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                >
                  Finish Lesson
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Related practice</h2>
          {relatedPractice.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPractice.map((p) => (
                <Card key={p.id} className="border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium line-clamp-2">{p.title}</h4>
                    <span className="text-xs text-gray-400">{p.difficulty_level}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{p.points ?? 0} pts</span>
                    <span>{p.success_rate ?? 0}% solved</span>
                  </div>
                  <div className="mt-3">
                    <Link href={`/dashboard/practice/problems/${p.id}`} className="text-[#2E5BFF] text-sm hover:underline">Open practice</Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Code className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No related practice found</h3>
              <p className="text-gray-400">We couldn't find practice problems matching this module yet.</p>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {module.prev_module_id ? (
              <Link href={`/dashboard/lesson-plans/${planId}/${module.prev_module_id}`}>
                <Button
                  variant="outline"
                  className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous Module
                </Button>
              </Link>
            ) : (
              <div>{/* Empty div for spacing */}</div>
            )}
            
            {module.next_module_id ? (
              <Link href={`/dashboard/lesson-plans/${planId}/${module.next_module_id}`}>
                <Button
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                >
                  Next Module
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/lesson-plans/${planId}`}>
                <Button
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                >
                  Finish Lesson
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}