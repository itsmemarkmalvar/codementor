"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PlayCircle, Book, Clock, CheckCircle, ArrowLeft, ArrowRight, Timer, Star, Users, Brain, Lightbulb, Code, AlertCircle, RotateCcw, ExternalLink, ChevronRight, X, Info, Heart, Award, BookOpen } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { PracticeResourcesList } from "@/components/practice/PracticeResourcesList";

interface Problem {
  id: number;
  title: string;
  description: string;
  instructions: string;
  requirements: string[];
  difficulty_level: string;
  points: number;
  estimated_time_minutes: number;
  complexity_tags: string[];
  topic_tags: string[];
  starter_code: string;
  hints: string[];
  learning_concepts: string[];
  user_completed?: boolean;
  user_attempts?: number;
  user_best_score?: number;
  recommended_problems?: Problem[];
  next_level_problems?: Problem[];
  resources?: any[];
}

interface TestResult {
  test_case: number;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.challengeId as string;
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState("instructions");
  const [activeRightTab, setActiveRightTab] = useState("output");
  const [theme, setTheme] = useState("vs-dark");
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [currentHint, setCurrentHint] = useState<{content: string, number: number, total: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [suggestedResources, setSuggestedResources] = useState<any[]>([]);

  // Load problem details
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/practice/problems/${challengeId}`);
        
        if (response.data.status === 'success') {
          setProblem(response.data.data);
          setCode(response.data.data.starter_code || '');
          
          // Set initial timer based on estimated time
          if (response.data.data.estimated_time_minutes) {
            setTimeLeft(response.data.data.estimated_time_minutes * 60);
          }
        }
      } catch (error) {
        console.error("Error fetching problem:", error);
        toast.error("Failed to load problem details");
      } finally {
        setLoading(false);
      }
    };

    if (challengeId) {
      fetchProblem();
    }
  }, [challengeId]);
  
  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeLeft === 0) {
      toast.info("Time's up! You can still submit your solution.");
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);
  
  // Format time for display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get difficulty color based on level
  const getDifficultyColor = (level: string) => {
    const colors: Record<string, string> = {
      'beginner': 'bg-emerald-500/20 text-emerald-400',
      'easy': 'bg-green-500/20 text-green-400',
      'medium': 'bg-yellow-500/20 text-yellow-400',
      'hard': 'bg-orange-500/20 text-orange-400',
      'expert': 'bg-red-500/20 text-red-400'
    };
    
    return colors[level] || 'bg-gray-500/20 text-gray-400';
  };

  // Start the challenge timer
  const handleStartChallenge = () => {
    setIsRunning(true);
    setStartTime(Date.now());
    toast.success("Challenge started. Good luck!");
  };
  
  // Reset the code editor to starter code
  const handleResetCode = () => {
    if (problem?.starter_code) {
      setCode(problem.starter_code);
      toast.info("Code reset to starter code");
    }
  };

  // Execute the code
  const handleRunCode = async () => {
    if (!problem) return;
    
    try {
      setExecuting(true);
      setActiveRightTab("output");
      setOutput("Running your code...");
      setErrorMessages([]);
      setTestResults([]);
      
      // Send code to API for execution
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/practice/problems/${problem.id}/solution`, {
        code: code,
        time_spent_seconds: startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined
      });
      
      if (response.data.status === 'success') {
        const data = response.data.data;
        
        // Handle test results
        if (data.test_results && data.test_results.length > 0) {
          setTestResults(data.test_results);
        }
        
        // Handle compiler or runtime errors
        const errors = [
          ...(data.compiler_errors || []),
          ...(data.runtime_errors || [])
        ];
        
        if (errors.length > 0) {
          setErrorMessages(errors);
          setOutput(`Execution failed with ${errors.length} error(s). See the "Problems" tab for details.`);
        } else if (data.is_correct) {
          setOutput("All tests passed successfully! Great job!");
          setPointsEarned(data.points_earned);
          setFeedback(data.feedback);
          setShowCompletionDialog(true);
        } else {
          setOutput("Some tests failed. Check the 'Test Results' tab for details.");
          setFeedback(data.feedback);
        }
      }
    } catch (error) {
      console.error("Error executing code:", error);
      setOutput("Error executing code. Please try again.");
      toast.error("Failed to execute code");
    } finally {
      setExecuting(false);
    }
  };

  // Request a hint
  const handleRequestHint = async () => {
    if (!problem) return;
    
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/practice/problems/${problem.id}/hint`);
      
      if (response.data.status === 'success') {
        const hintData = response.data.data;
        
        setCurrentHint({
          content: hintData.hint,
          number: hintData.hint_number,
          total: hintData.total_hints
        });
        
        setHintsUsed(prev => [...prev, hintData.hint]);
        setShowHint(true);
        
        // Show points penalty warning
        if (hintData.points_penalty > 0) {
          toast.info(`Using hints reduces your score by ${hintData.points_penalty} points.`);
        }
      }
    } catch (error: any) {
      console.error("Error getting hint:", error);
      if (error.response?.status === 404) {
        toast.info("No more hints available for this problem");
      } else {
        toast.error("Failed to get hint");
      }
    }
  };
  
  // Get suggested resources based on struggle points
  const fetchSuggestedResources = async () => {
    if (!problem?.id) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/practice/problems/${problem.id}/resources`);
      
      if (response.data.status === 'success') {
        setSuggestedResources(response.data.data.resources || []);
      }
    } catch (error) {
      console.error("Error fetching suggested resources:", error);
      toast.error("Failed to load suggested resources");
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate points with deductions
  const calculateFinalPoints = () => {
    if (!pointsEarned || !problem) return 0;
    
    // Deduct 10% per hint used (max 50%)
    const hintPenalty = Math.min(hintsUsed.length * 0.1, 0.5);
    
    // Calculate time factor (bonus for fast solutions, penalty for slow ones)
    let timeFactor = 1.0;
    if (startTime && problem.estimated_time_minutes > 0) {
      const timeSpentMinutes = (Date.now() - startTime) / 60000;
      const timeRatio = timeSpentMinutes / problem.estimated_time_minutes;
      
      if (timeRatio < 0.8) {
        // Time bonus for fast completion
        timeFactor = 1.2;
      } else if (timeRatio > 1.5) {
        // Time penalty for slow completion
        timeFactor = 0.9;
      }
    }
    
    return Math.round(pointsEarned * (1 - hintPenalty) * timeFactor);
  };

  return (
    <div className="space-y-6">
      {loading ? (
        // Loading skeleton
        <div className="space-y-6">
          <Card className="bg-white/5 backdrop-blur-sm animate-pulse h-[120px]"></Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 backdrop-blur-sm animate-pulse h-[calc(100vh-14rem)]"></Card>
            <Card className="bg-white/5 backdrop-blur-sm animate-pulse h-[calc(100vh-14rem)]"></Card>
          </div>
        </div>
      ) : problem ? (
        <>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/practice">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </Link>
                <span className={`px-2 py-1 text-xs rounded ${getDifficultyColor(problem.difficulty_level)}`}>
                  {problem.difficulty_level.charAt(0).toUpperCase() + problem.difficulty_level.slice(1)}
                </span>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Timer className="h-4 w-4" />
                  <span>{problem.estimated_time_minutes} min</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Star className="h-4 w-4 text-[#2E5BFF]" />
                  <span>{problem.points} pts</span>
                </div>
                {problem.user_attempts && problem.user_attempts > 0 && (
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                    {problem.user_attempts} Previous {problem.user_attempts === 1 ? 'Attempt' : 'Attempts'}
                  </Badge>
                )}
                {problem.user_completed && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
              <p className="text-gray-400">{problem.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {problem.topic_tags && problem.topic_tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="bg-[#2E5BFF]/10 text-[#2E5BFF] border-[#2E5BFF]/30">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {isRunning ? (
                <>
                  <div className="px-3 py-2 bg-white/5 rounded-md border border-white/10">
                    <span className="text-sm font-mono text-white">{formatTime(timeLeft)}</span>
                  </div>
                  <Button 
                    className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                    onClick={handleRunCode}
                    disabled={executing}
                  >
                    {executing ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </motion.div>
                        Running...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Run Code
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button 
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                  onClick={handleStartChallenge}
                >
                  Start Challenge
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="practice-grid grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-16rem)]">
            {/* Left Panel - Instructions and Test Cases */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full"
            >
              <Card className="practice-panel relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
                <div className="relative p-6 space-y-4 h-full flex flex-col">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="bg-white/5 border-white/10 shrink-0">
                      <TabsTrigger value="instructions">Instructions</TabsTrigger>
                      <TabsTrigger value="testCases">Test Cases</TabsTrigger>
                      {testResults.length > 0 && (
                        <TabsTrigger value="testResults">
                          Results
                          {testResults.some(r => !r.passed) && <AlertCircle className="h-3 w-3 ml-1 text-red-400" />}
                        </TabsTrigger>
                      )}
                      {errorMessages.length > 0 && (
                        <TabsTrigger value="errors">
                          Problems
                          <AlertCircle className="h-3 w-3 ml-1 text-red-400" />
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <div className="mt-4 flex-1 overflow-y-auto min-h-0 practice-scroll">
                      <TabsContent value="instructions" className="space-y-6 mt-0 h-full">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white">Requirements:</h3>
                          <ul className="space-y-2">
                            {problem.requirements.map((req, index) => (
                              <li key={index} className="flex items-start space-x-2 text-gray-300">
                                <CheckCircle className="h-5 w-5 text-[#2E5BFF] mt-0.5 shrink-0" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {problem.learning_concepts && problem.learning_concepts.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Key Concepts:</h3>
                            <div className="flex flex-wrap gap-2">
                              {problem.learning_concepts.map((concept, index) => (
                                <Badge key={index} className="bg-[#2E5BFF]/20 text-[#2E5BFF] border-none">
                                  <Book className="h-3 w-3 mr-1" />
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="testCases" className="space-y-4 mt-0 h-full">
                        {problem.starter_code && (
                          <div className="bg-black/30 rounded p-4">
                            <h3 className="text-sm font-semibold text-white mb-2">Starting Code:</h3>
                            <pre className="text-xs text-gray-300 overflow-x-auto max-h-60 custom-scrollbar">
                              {problem.starter_code}
                            </pre>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="testResults" className="space-y-4 mt-0 h-full">
                        <div className="space-y-4 max-h-full overflow-y-auto practice-scroll">
                          {testResults.map((result, index) => (
                            <div 
                              key={index} 
                              className={`p-4 rounded-md ${
                                result.passed 
                                  ? 'bg-green-500/10 border border-green-500/30' 
                                  : 'bg-red-500/10 border border-red-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-white">Test Case {result.test_case + 1}</h4>
                                {result.passed ? (
                                  <Badge className="bg-green-500/20 text-green-400">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Passed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/20 text-red-400">
                                    <X className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </div>
                              
                              {!result.passed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Expected:</p>
                                    <pre className="text-xs text-white bg-black/20 p-2 rounded max-h-32 overflow-y-auto practice-scroll practice-code-block">
                                      {result.expected}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Actual:</p>
                                    <pre className="text-xs text-white bg-black/20 p-2 rounded max-h-32 overflow-y-auto practice-scroll practice-code-block">
                                      {result.actual || 'No output'}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              
                              {result.error && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-400 mb-1">Error:</p>
                                  <pre className="text-xs text-red-400 bg-black/20 p-2 rounded max-h-32 overflow-y-auto practice-scroll practice-code-block">
                                    {result.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="errors" className="space-y-4 mt-0 h-full">
                        <div className="space-y-4 max-h-full overflow-y-auto practice-scroll">
                          {errorMessages.map((error, index) => (
                            <div key={index} className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
                              <pre className="text-xs text-red-400 whitespace-pre-wrap max-h-40 overflow-y-auto practice-scroll practice-code-block">
                                {error}
                              </pre>
                            </div>
                          ))}
                          
                          {errorMessages.length > 0 && suggestedResources.length === 0 && (
                            <div className="mt-4">
                              <Button 
                                variant="outline"
                                className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                                onClick={fetchSuggestedResources}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                Get Learning Resources
                              </Button>
                            </div>
                          )}

                          {suggestedResources.length > 0 && (
                            <div className="mt-4 space-y-3">
                              <h3 className="font-medium text-white">Suggested Resources</h3>
                              {suggestedResources.map((resource, index) => (
                                <Link href={resource.url} key={index}>
                                  <Card className="p-3 bg-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-start space-x-3">
                                      <div className={`p-2 rounded-md ${
                                        resource.type === 'course' 
                                          ? 'bg-blue-500/20 text-blue-400' 
                                          : 'bg-purple-500/20 text-purple-400'
                                      }`}>
                                        {resource.type === 'course' 
                                          ? <Book className="h-4 w-4" /> 
                                          : <ExternalLink className="h-4 w-4" />}
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="text-sm font-medium text-white">{resource.title}</h4>
                                        <p className="text-xs text-gray-400">{resource.description}</p>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </div>

                    {isRunning && (
                      <div className="pt-4 flex justify-between items-center space-x-4 shrink-0 border-t border-white/10">
                        <Button
                          variant="outline"
                          className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                          onClick={handleRequestHint}
                          disabled={!isRunning}
                        >
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Get Hint {hintsUsed.length > 0 ? `(${hintsUsed.length} used)` : ''}
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={handleResetCode}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset Code
                        </Button>
                      </div>
                    )}
                    
                    {showHint && currentHint && (
                      <div className="mt-4 p-4 bg-[#2E5BFF]/10 rounded-lg shrink-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-[#2E5BFF]">
                            Hint {currentHint.number} of {currentHint.total}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowHint(false)}
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                        <p className="text-gray-300">
                          <Lightbulb className="h-5 w-5 text-[#2E5BFF] inline mr-2" />
                          {currentHint.content}
                        </p>
                      </div>
                    )}
                  </Tabs>
                </div>
              </Card>
            </motion.div>

            {/* Right Panel - Code Editor and Output */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full"
            >
              <Card className="practice-panel relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm h-full">
                <div className="relative h-full flex flex-col">
                  {/* Code Editor Section */}
                  <div className="flex-1 min-h-0 h-3/5 monaco-editor-container">
                    <Editor
                      height="100%"
                      width="100%"
                      language="java"
                      theme={theme}
                      value={code}
                      onChange={(value) => setCode(value || '')}
                      loading={<div className="flex items-center justify-center h-full bg-black/20 text-white">Loading editor...</div>}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                        fontSize: 14,
                        lineHeight: 1.5,
                        automaticLayout: true,
                        wordWrap: 'on',
                        renderLineHighlight: 'line',
                        cursorBlinking: 'blink',
                        tabSize: 2,
                        suggest: {
                          showKeywords: true,
                          showSnippets: true,
                        },
                        bracketPairColorization: {
                          enabled: true
                        }
                      }}
                    />
                  </div>

                  {/* Output Section */}
                  <div className="h-2/5 border-t border-white/10 flex flex-col">
                    <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="h-full flex flex-col">
                      <div className="flex justify-between px-4 pt-2 shrink-0">
                        <TabsList>
                          <TabsTrigger value="output">Output</TabsTrigger>
                          <TabsTrigger value="tests">Test Results</TabsTrigger>
                          <TabsTrigger value="problems">Problems</TabsTrigger>
                          <TabsTrigger value="resources">
                            <BookOpen className="h-4 w-4 mr-1.5" />
                            Resources
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <div className="flex-1 overflow-hidden p-4">
                        <TabsContent value="output" className="mt-0 h-full">
                          <pre className="text-sm text-white overflow-auto h-full practice-scroll p-4 bg-black/30 rounded-md practice-code-block">
                            {output || 'Run your code to see output here'}
                          </pre>
                        </TabsContent>
                        
                        <TabsContent value="tests" className="mt-0 h-full overflow-y-auto space-y-4 practice-scroll">
                          {testResults.map((result, index) => (
                            <div 
                              key={index} 
                              className={`p-4 rounded-md ${
                                result.passed 
                                  ? 'bg-green-500/10 border border-green-500/30' 
                                  : 'bg-red-500/10 border border-red-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-white">Test Case {result.test_case + 1}</h4>
                                {result.passed ? (
                                  <Badge className="bg-green-500/20 text-green-400">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Passed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/20 text-red-400">
                                    <X className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </div>
                              
                              {!result.passed && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Expected:</p>
                                    <pre className="text-xs text-white bg-black/20 p-2 rounded max-h-24 overflow-y-auto practice-scroll practice-code-block">
                                      {result.expected}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Actual:</p>
                                    <pre className="text-xs text-white bg-black/20 p-2 rounded max-h-24 overflow-y-auto practice-scroll practice-code-block">
                                      {result.actual || 'No output'}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              
                              {result.error && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-400 mb-1">Error:</p>
                                  <pre className="text-xs text-red-400 bg-black/20 p-2 rounded max-h-24 overflow-y-auto practice-scroll practice-code-block">
                                    {result.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </TabsContent>
                        
                        <TabsContent value="problems" className="mt-0 h-full overflow-y-auto space-y-4 practice-scroll">
                          {errorMessages.map((error, index) => (
                            <div key={index} className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
                              <pre className="text-xs text-red-400 whitespace-pre-wrap max-h-32 overflow-y-auto practice-scroll practice-code-block">
                                {error}
                              </pre>
                            </div>
                          ))}
                          
                          {errorMessages.length > 0 && suggestedResources.length === 0 && (
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                                onClick={fetchSuggestedResources}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                Get Learning Resources
                              </Button>
                            </div>
                          )}
                          
                          {suggestedResources.length > 0 && (
                            <div className="mt-4 space-y-3">
                              <h3 className="font-medium text-white">Suggested Resources</h3>
                              {suggestedResources.map((resource, index) => (
                                <Link href={resource.url} key={index}>
                                  <Card className="p-3 bg-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-start space-x-3">
                                      <div className={`p-2 rounded-md ${
                                        resource.type === 'course' 
                                          ? 'bg-blue-500/20 text-blue-400' 
                                          : 'bg-purple-500/20 text-purple-400'
                                      }`}>
                                        {resource.type === 'course' 
                                          ? <Book className="h-4 w-4" /> 
                                          : <ExternalLink className="h-4 w-4" />}
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="text-sm font-medium text-white">{resource.title}</h4>
                                        <p className="text-xs text-gray-400">{resource.description}</p>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="resources" className="h-full overflow-y-auto practice-scroll">
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Learning Resources</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                              The following resources are recommended to help you solve this problem
                              and understand the underlying concepts.
                            </p>
                            
                            {/* Display resources from problem */}
                            <PracticeResourcesList resources={problem?.resources || []} isLoading={loading} />
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
          
          {/* Completion Dialog */}
          <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
            <DialogContent className="bg-[#1E293B] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center">
                  <Award className="h-6 w-6 text-[#2E5BFF] mr-2" />
                  Congratulations!
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  You've successfully solved this problem.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Final Score:</span>
                  <span className="text-2xl font-bold text-white">{calculateFinalPoints()} pts</span>
                </div>
                
                <Separator className="bg-white/10" />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">Next Challenges</h4>
                  
                  {problem.next_level_problems && problem.next_level_problems.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm text-gray-400">Ready for a challenge? Try these harder problems:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {problem.next_level_problems.slice(0, 2).map((nextProblem) => (
                          <Link href={`/dashboard/practice/problems/${nextProblem.id}`} key={nextProblem.id}>
                            <Card className="p-3 bg-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(nextProblem.difficulty_level)}`}>
                                  {nextProblem.difficulty_level.charAt(0).toUpperCase() + nextProblem.difficulty_level.slice(1)}
                                </span>
                                <h4 className="text-sm font-medium text-white">{nextProblem.title}</h4>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {problem.recommended_problems && problem.recommended_problems.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h5 className="text-sm text-gray-400">Related problems you might enjoy:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {problem.recommended_problems.slice(0, 2).map((recProblem) => (
                          <Link href={`/dashboard/practice/problems/${recProblem.id}`} key={recProblem.id}>
                            <Card className="p-3 bg-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(recProblem.difficulty_level)}`}>
                                  {recProblem.difficulty_level.charAt(0).toUpperCase() + recProblem.difficulty_level.slice(1)}
                                </span>
                                <h4 className="text-sm font-medium text-white">{recProblem.title}</h4>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Link href="/dashboard/practice">
                  <Button variant="outline" className="border-white/10 text-gray-400 hover:text-white">
                    Back to Practice
                  </Button>
                </Link>
                <Button 
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                  onClick={() => setShowCompletionDialog(false)}
                >
                  Continue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Problem not found</h3>
          <p className="text-gray-400 mb-6">The practice problem you're looking for doesn't exist or may have been removed.</p>
          <Link href="/dashboard/practice">
            <Button className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
              Back to Practice
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}


