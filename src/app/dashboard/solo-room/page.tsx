"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Terminal,
  Play,
  ThumbsUp,
  ThumbsDown,
  Code,
  AlignLeft,
  Loader,
  Send,
  User,
  Bot,
  BookOpen,
  Clock,
  Settings as SettingsIcon,
  ChevronRight,
  BarChart,
  CheckCircle,
  Star,
  Zap,
  ScrollText,
  Lightbulb,
  GraduationCap,
  FolderOpen,
  ArrowUp,
  Award,
  PieChart,
  ArrowLeft,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Sparkles,
  TerminalSquare,
  Trash2,
  X,
  Lock,
  ArrowRight,
  Check,
  LifeBuoy,
  Save,
  SendHorizonal,
  Coffee,
  ChevronLeft,
  Plus,
  Menu,
  FileCode,
  Layers,
  HelpCircle,
  Edit3,
  Eye,
  RotateCw,
  Activity,
  Bookmark,
  ChevronsRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers as LayersIcon,
  PenLine,
  Brackets,
  Bug,
  MoreHorizontal
} from 'lucide-react';
import { getTutorResponse, executeJavaCode, getTopics, getTopicHierarchy, updateProgress, getUserProgress, getTopicProgress, getLessonPlanDetails, getLessonModules, getLessonPlans, analyzeQuizResults } from '@/services/api';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Editor from "@monaco-editor/react";
import styles from './SoloRoom.module.css';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { DiJava as JavaIcon, DiPython as PythonIcon } from "react-icons/di";
import { FiMessageSquare } from 'react-icons/fi';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: Date;
  code?: string;  // Optional code snippet that might be included in the message
}

interface Topic {
  id: number;
  title: string;
  description?: string;
  difficulty_level?: string;
  icon?: string | React.ReactNode;
  progress?: number;
  is_locked?: boolean;
  prerequisites?: string | string[] | number[] | any;  // Update to allow different types
  exercises_count?: number;
}

interface Session {
  id: number;
  date: string;
  topic: string;
  duration: string;
}

// For API communication
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Define a type for the progress data
interface ProgressData {
  interaction: number;
  code_execution: number;
  time_spent: number;
  knowledge_check: number;
}

interface LessonPlan {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  topic_name?: string;
  topic_title?: string;
  modules_count: number;
  completed_modules: number;
  difficulty_level: number;
  progress?: number;
  estimated_minutes?: number;
  resources?: any;
  learning_objectives?: string;
  prerequisites?: string;
  icon?: React.ReactNode;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  questions: QuizQuestion[];
  totalPoints: number;
}

interface LessonQuiz {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  time_limit_minutes: number;
  passing_score_percent: number;
  questions: QuizQuestion[];
  points_per_question: number;
  is_published: boolean;
  passed: boolean;
}

// Replace the API_URL import with a direct definition
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Function to check if a topic is locked based on prerequisites and user progress
const checkTopicLockStatus = (topics: Topic[], userProgress: any) => {
  // First pass - apply regular prerequisite logic
  const topicsWithBasicLocking = topics.map(topic => {
    // If no prerequisites, topic is not locked
    if (!topic.prerequisites) {
      return { ...topic, is_locked: false };
    }

    let prerequisites: string[] = [];
    
    // Handle prerequisites in different formats
    if (typeof topic.prerequisites === 'string') {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(topic.prerequisites);
        // Make sure it's an array of strings
        if (Array.isArray(parsed)) {
          prerequisites = parsed;
        } else if (typeof parsed === 'object') {
          // If it's an object but not an array, use keys
          prerequisites = Object.keys(parsed);
        } else {
          // Fallback if it's something else
          prerequisites = [String(parsed)];
        }
      } catch (e) {
        // If not valid JSON, treat as comma-separated list
        prerequisites = topic.prerequisites.split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0); // Only keep non-empty strings
      }
    } else if (Array.isArray(topic.prerequisites)) {
      // If it's already an array, use it directly
      prerequisites = topic.prerequisites.map(p => String(p));
    } else if (topic.prerequisites) {
      // If it's something else, convert to string
      prerequisites = [String(topic.prerequisites)];
    }
    
    // Safety check: ensure prerequisites is an array before using array methods
    if (!Array.isArray(prerequisites)) {
      console.error("Prerequisites is not an array after processing:", topic.prerequisites);
      return { ...topic, is_locked: false }; // Default to unlocked if something went wrong
    }
    
    // If there are no prerequisites after processing, topic is unlocked
    if (prerequisites.length === 0) {
      return { ...topic, is_locked: false };
    }
    
    console.log(`Topic ${topic.title} has prerequisites:`, prerequisites);
    
    // Check if all prerequisites are met
    let allPrerequisitesMet = true; // Start with true
    
    for (const prereqId of prerequisites) {
      // Find the prerequisite topic by ID (not title)
      const prerequisiteTopic = topics.find(t => 
        String(t.id) === prereqId
      );
      
      if (!prerequisiteTopic) {
        console.warn(`Prerequisite topic ID "${prereqId}" not found`);
        continue; // Skip this one, doesn't change our result
      }
      
      // Check if user has completed this prerequisite topic
      const topicProgress = userProgress.find((p: any) => p.topic_id === prerequisiteTopic.id);
      if (!topicProgress || topicProgress.progress_percentage < 80) {
        allPrerequisitesMet = false;
        break; // No need to check others, we already know it's locked
      }
    }
    
    // Topic is locked if not all prerequisites are met
    return { ...topic, is_locked: !allPrerequisitesMet };
  });
  
  // Second pass - apply specific rules
  return topicsWithBasicLocking.map(topic => {
    // Special case for Java Advanced Concepts - ensure it's locked if Java Basics doesn't have enough progress
    if (topic.title === 'Java Advanced Concepts') {
      const javaBasics = topicsWithBasicLocking.find(t => t.title === 'Java Basics');
      
      if (javaBasics) {
        const javaBasicsProgress = userProgress.find((p: any) => p.topic_id === javaBasics.id);
        const hasEnoughProgress = javaBasicsProgress && javaBasicsProgress.progress_percentage >= 80;
        
        // Always lock Java Advanced if Java Basics isn't complete, regardless of prerequisites
        return { ...topic, is_locked: !hasEnoughProgress };
      }
    }
    
    // If topic name contains "Advanced", ensure basic topics are completed
    if (topic.title.toLowerCase().includes('advanced')) {
      // Find any basic topics
      const basicTopics = topicsWithBasicLocking.filter(t => 
        t.title.toLowerCase().includes('basic') || 
        t.title.toLowerCase().includes('fundamental')
      );
      
      for (const basicTopic of basicTopics) {
        const basicProgress = userProgress.find((p: any) => p.topic_id === basicTopic.id);
        if (!basicProgress || basicProgress.progress_percentage < 80) {
          // Lock this advanced topic if any basic topic isn't complete
          return { ...topic, is_locked: true };
        }
      }
    }
    
    // Return the topic with its original locking status if no special cases apply
    return topic;
  });
};

// Add the HierarchicalLessonPlans component
interface HierarchicalLessonPlansProps {
  plans: LessonPlan[];
  onSelectPlan: (plan: LessonPlan) => void;
}

const HierarchicalLessonPlans: React.FC<HierarchicalLessonPlansProps> = ({ plans, onSelectPlan }) => {
  // Extract step numbers for all plans
  const getStepNumber = (plan: LessonPlan) => {
    const match = plan.description?.match(/Step (\d+):/);
    return match ? parseInt(match[1], 10) : 999;
  };
  
  // Sort plans by step number
  const sortedPlans = [...plans].sort((a, b) => {
    return getStepNumber(a) - getStepNumber(b);
  });
  
  // Find the highest completed step based on progress
  const highestCompletedStep = sortedPlans.reduce((highest, plan) => {
    const stepNumber = getStepNumber(plan);
    // Consider a lesson completed if progress is at least 80%
    const isCompleted = (plan.progress || 0) >= 80;
    return isCompleted && stepNumber > highest ? stepNumber : highest;
  }, 0);
  
  // Function to get status label and color
  const getStatusInfo = (progress: number = 0) => {
    if (progress >= 100) {
      return { label: 'Completed', color: 'text-green-400 bg-green-900/30' };
    } else if (progress > 0) {
      return { label: 'In Progress', color: 'text-blue-400 bg-blue-900/30' };
    } else {
      return { label: 'Not Started', color: 'text-gray-400 bg-gray-800/30' };
    }
  };
  
  return (
    <div className="space-y-4 max-w-3xl ml-0">
      {sortedPlans.map((plan) => {
        const stepNumber = getStepNumber(plan);
        // A lesson is locked if its step number is more than 1 ahead of the highest completed step
        const isLocked = stepNumber > highestCompletedStep + 1;
        const progress = plan.progress || 0;
        const { label, color } = getStatusInfo(progress);
        const completedModules = plan.completed_modules || 0;
        const totalModules = plan.modules_count || 0;
        
        return (
          <motion.div
            key={plan.id}
            whileHover={isLocked ? {} : { x: 5 }}
            whileTap={isLocked ? {} : { scale: 0.98 }}
            onClick={() => !isLocked && onSelectPlan(plan)}
            className={`bg-white/5 rounded-lg p-4 relative ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'} transition`}
          >
            {/* Progress bar at the bottom of the card */}
            {progress > 0 && !isLocked && (
              <div 
                className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-lg" 
                style={{ width: `${progress}%` }}
              ></div>
            )}
            
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${isLocked ? 'text-gray-500' : 'text-[#2E5BFF]'}`}>
                {isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  plan.icon || <ScrollText className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className={`font-medium ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                    {plan.title}
                    {isLocked && <span className="ml-2 text-xs text-amber-400">(Locked)</span>}
                  </h3>
                  
                  {/* Status label */}
                  {!isLocked && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                      {label}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{plan.description}</p>
                
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3 text-xs">
                  {/* Module completion indicator */}
                  <div className="flex items-center gap-1 text-gray-300">
                    <LayersIcon className="h-3.5 w-3.5 text-[#2E5BFF]" />
                    <span>
                      {completedModules}/{totalModules} modules
                    </span>
                  </div>
                  
                  {/* Time indicator */}
                  <span className="flex items-center gap-1 text-gray-300">
                    <Clock className="h-3.5 w-3.5 text-[#2E5BFF]" />
                    <span>{plan.estimated_minutes || 30} min</span>
                  </span>
                  
                  {/* Progress indicator with percentage */}
                  {plan.progress !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-300">Progress:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-1.5 ${isLocked ? 'bg-gray-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} rounded-full`}
                            style={{ width: `${plan.progress}%` }}
                          ></div>
                        </div>
                        <span className={isLocked ? 'text-gray-500' : 'text-blue-400'}>
                          {plan.progress}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {isLocked && (
                  <div className="mt-2 text-xs text-amber-400 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Complete previous lessons to unlock
                  </div>
                )}
              </div>
              <ChevronRight className={`h-5 w-5 mt-1 ${isLocked ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Add this ProgressBreakdown component before the SoloRoomPage component
const ProgressBreakdown: React.FC<{ 
  progressData: ProgressData; 
  totalProgress: number;
  label?: string;
  className?: string;
}> = ({ progressData, totalProgress, label, className }) => {
  return (
    <div className={`bg-white/5 rounded-lg p-4 ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <BarChart className="h-5 w-5 mr-2 text-[#2E5BFF]" />
        {label || 'Learning Progress'}
      </h3>
      
      <div className="space-y-3">
        {/* Chat Interactions */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Chat Learning</span>
            <span className="text-gray-300 font-medium">{progressData.interaction}/30</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(progressData.interaction / 30) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Code Execution */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Coding Practice</span>
            <span className="text-gray-300 font-medium">{progressData.code_execution}/40</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(progressData.code_execution / 40) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Knowledge Check */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Quiz Mastery</span>
            <span className="text-gray-300 font-medium">{progressData.knowledge_check}/30</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(progressData.knowledge_check / 30) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Total Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white font-medium">Total Progress</span>
            <span className="text-white font-medium">{totalProgress}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 rounded-full"
              style={{ width: `${totalProgress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            ></motion.div>
          </div>
        </div>
      </div>
      
      {/* Progress-based recommendations */}
      {totalProgress >= 30 && progressData.knowledge_check < 10 && (
        <div className="mt-4 text-sm bg-blue-900/20 p-3 rounded-lg flex items-center">
          <Lightbulb className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
          <span>Take a quiz to boost your progress and test your knowledge!</span>
        </div>
      )}
      
      {totalProgress >= 50 && progressData.code_execution < 20 && (
        <div className="mt-4 text-sm bg-green-900/20 p-3 rounded-lg flex items-center">
          <Code className="h-4 w-4 mr-2 text-green-400 flex-shrink-0" />
          <span>Try writing some code to practice what you've learned.</span>
        </div>
      )}
      
      {totalProgress >= 80 && (
        <div className="mt-4 text-sm bg-purple-900/20 p-3 rounded-lg flex items-center">
          <Award className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />
          <span>Almost there! Complete all lessons to master this topic.</span>
        </div>
      )}
    </div>
  );
};

// Add this ModuleList component to display modules with progress
const ModuleList: React.FC<{
  modules: any[];
  activeLessonPlan: any;
  activeModuleId: number;
  onSelectModule: (module: any) => void;
}> = ({ modules, activeLessonPlan, activeModuleId, onSelectModule }) => {
  if (!modules || modules.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg p-4 text-center">
        <p className="text-gray-400">No modules available for this lesson plan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <BookOpen className="h-5 w-5 mr-2 text-[#2E5BFF]" />
        Modules in {activeLessonPlan?.title || 'This Lesson'}
      </h3>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {modules.map((module) => {
          // Calculate progress based on module data
          const progress = module.progress || 0;
          const isCompleted = progress >= 100;
          const isActive = module.id === activeModuleId;
          
          return (
            <div 
              key={module.id}
              onClick={() => onSelectModule(module)}
              className={`border border-white/10 rounded-lg p-3 cursor-pointer relative 
                ${isActive ? 'bg-white/10 border-l-4 border-l-[#2E5BFF]' : 'hover:bg-white/5'}
                ${isCompleted ? 'border-green-500/30' : ''}`}
            >
              {/* Progress bar */}
              {progress > 0 && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-lg" 
                  style={{ width: `${progress}%` }}
                ></div>
              )}
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span 
                      className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-medium mr-2
                        ${isActive ? 'bg-[#2E5BFF] text-white' : 'bg-[#2E5BFF]/20 text-[#2E5BFF]'}`}
                    >
                      {module.order_index + 1}
                    </span>
                    <h4 className="font-medium text-white">
                      {module.title}
                      {isActive && (
                        <span className="ml-2 text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{module.description || 'No description'}</p>
                </div>
                
                <div className="flex flex-col items-end">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-sm text-blue-400">{progress}%</span>
                  )}
                  {module.estimated_minutes && (
                    <span className="text-xs text-gray-500 mt-1">{module.estimated_minutes} mins</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SoloRoomPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'lesson-plans' | 'sessions' | 'settings' | 'quiz'>('chat');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codeInput, setCodeInput] = useState(`public class HelloWorld {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, Java!");
    }
}`);
  const [codeOutput, setCodeOutput] = useState<{stdout: string, stderr: string, executionTime: number} | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allLessonPlans, setAllLessonPlans] = useState<LessonPlan[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  
  // Code editor settings
  const [editorTheme, setEditorTheme] = useState<string>("vs-dark");
  const [editorLanguage, setEditorLanguage] = useState<string>("java");
  const [isFormatting, setIsFormatting] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [debugStep, setDebugStep] = useState<number>(0);
  const [editorOptions, setEditorOptions] = useState({
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 14,
    lineHeight: 1.5,
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true
  });
  
  // Progress tracking state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(0);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [exercisesTotal, setExercisesTotal] = useState(0);
  const [completedSubtopics, setCompletedSubtopics] = useState<string[]>([]);
  
  // Add new state for lesson plans
  const [activeLessonPlan, setActiveLessonPlan] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  
  // Inside the component, add a state for lesson plans
  const [topicLessonPlans, setTopicLessonPlans] = useState<{[key: number]: any[]}>({});
  
  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  
  // Add these state variables inside the component
  const [moduleQuizzes, setModuleQuizzes] = useState<LessonQuiz[]>([]);
  const [quizAttempt, setQuizAttempt] = useState<any>(null);
  const [showQuizAtThreshold, setShowQuizAtThreshold] = useState(false);
  
  // Add state variable for quiz analysis
  const [quizAnalysis, setQuizAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  // Sample topics data as fallback
  const defaultTopics: Topic[] = [
    { 
      id: 1, 
      title: 'Java Basics', 
      progress: 65,
      icon: <BookOpen className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 2, 
      title: 'Object-Oriented Programming', 
      progress: 40,
      icon: <Code className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 3, 
      title: 'Data Structures', 
      progress: 25,
      icon: <BarChart className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 4, 
      title: 'Algorithms', 
      progress: 10,
      icon: <Zap className="h-5 w-5 text-[#2E5BFF]" /> 
    },
  ];
  
  // Sample previous sessions
  const previousSessions: Session[] = [
    { id: 1, date: '2023-06-15', topic: 'Java Basics', duration: '45 min' },
    { id: 2, date: '2023-06-12', topic: 'Variables and Data Types', duration: '30 min' },
    { id: 3, date: '2023-06-10', topic: 'Control Flow', duration: '60 min' },
  ];
  
  // AI tutor preferences
  const [tutorPreferences, setTutorPreferences] = useState({
    responseLength: 'medium',
    codeExamples: true,
    explanationDetail: 'detailed',
    challengeDifficulty: 'medium',
  });

  // Inside the component, add these state variables
  const [progressData, setProgressData] = useState<ProgressData>({
    interaction: 0,
    code_execution: 0,
    time_spent: 0,
    knowledge_check: 0
  });
  const [knowledgeCheckRequested, setKnowledgeCheckRequested] = useState(false);
  let knowledgeCheckAnswersCount = 0;

  const searchParams = useSearchParams();
  
  // Load lesson plan from URL if specified
  useEffect(() => {
    const topicId = searchParams.get('topic');
    const planId = searchParams.get('plan');
    
    if (topicId && planId) {
      // Convert to numbers
      const numericTopicId = parseInt(topicId);
      const numericPlanId = parseInt(planId);
      
      // Find the topic
      const findTopic = async () => {
        try {
          // If topics aren't loaded yet, fetch them
          if (topics.length === 0) {
            setIsLoadingTopics(true);
            const fetchedTopics = await getTopics();
            if (fetchedTopics && Array.isArray(fetchedTopics)) {
              // Add icon based on topic title
              const topicsWithIcons = fetchedTopics.map(topic => {
                let icon;
                const title = topic.title.toLowerCase();
                
                if (title.includes('basic') || title.includes('introduction')) {
                  icon = <BookOpen className="h-5 w-5 text-[#2E5BFF]" />;
                } else if (title.includes('object') || title.includes('class') || title.includes('programming')) {
                  icon = <Code className="h-5 w-5 text-[#2E5BFF]" />;
                } else if (title.includes('data') || title.includes('structure')) {
                  icon = <BarChart className="h-5 w-5 text-[#2E5BFF]" />;
                } else if (title.includes('algorithm') || title.includes('sorting')) {
                  icon = <Zap className="h-5 w-5 text-[#2E5BFF]" />;
                } else {
                  icon = <BookOpen className="h-5 w-5 text-[#2E5BFF]" />;
                }
                
                return { ...topic, icon, progress: 0 };
              });
              
              setTopics(topicsWithIcons);
              
              // Find and select the topic
              const matchedTopic = topicsWithIcons.find(t => t.id === numericTopicId);
              if (matchedTopic) {
                await handleTopicSelect(matchedTopic);
              }
            }
            setIsLoadingTopics(false);
          } else {
            // Topics already loaded, find the topic
            const matchedTopic = topics.find(t => t.id === numericTopicId);
            if (matchedTopic) {
              await handleTopicSelect(matchedTopic);
            }
          }
          
          // Find and load the lesson plan
          const loadPlan = async () => {
            try {
              const planDetails = await getLessonPlanDetails(numericPlanId);
              if (planDetails) {
                // Load the plan details and open the lesson plans tab
                await handleLessonPlanSelect(planDetails);
                setActiveTab('lesson-plans');
              }
            } catch (error) {
              console.error("Error loading lesson plan details:", error);
              toast.error("Failed to load the lesson plan");
            }
          };
          
          await loadPlan();
        } catch (error) {
          console.error("Error handling URL parameters:", error);
          toast.error("Failed to load the specified topic and lesson plan");
        }
      };
      
      findTopic();
    }
  }, [searchParams, topics.length]);

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const response = await getTopics();
        
        // Check if response exists and is an array
        if (!response || !Array.isArray(response)) {
          console.error('Invalid response format from getTopics()', response);
          setTopics([]);
          setIsLoadingTopics(false);
          return;
        }
        
        const topicsData = response.map((topic: any) => ({
          ...topic,
          icon: getDifficultyIcon(topic.difficulty_level)
        }));
        
        // Get user progress
        const progressResponse = await getUserProgress();
        
        // Check if progressResponse exists and is an array
        if (!progressResponse || !Array.isArray(progressResponse)) {
          console.error('Invalid response format from getUserProgress()', progressResponse);
          // We can still continue with the topics but without progress data
          setTopics(topicsData.map((topic: any) => ({
            ...topic,
            progress: 0,
            is_locked: false
          })));
          setIsLoadingTopics(false);
          return;
        }
        
        const progressData = progressResponse;
        
        // Map topics with progress and lock status
        const topicsWithStatus = topicsData.map((topic: any) => {
          // Find progress for this topic
          const topicProgress = progressData.find((p: any) => p.topic_id === topic.id);
          
          // Add default locking logic based on title for fallback
          let is_locked = topic.is_locked || false;
          
          // Hard-code specific locking rules to ensure proper functioning
          if (topic.title === 'Java Advanced Concepts') {
            // Lock Java Advanced until Java Basics is completed
            const javaBasics = topicsData.find(t => t.title === 'Java Basics');
            if (javaBasics) {
              const basicProgress = progressData.find((p: any) => p.topic_id === javaBasics.id);
              is_locked = !(basicProgress && basicProgress.progress_percentage >= 80);
            }
          } 
          else if (topic.title === 'Java Enterprise Development') {
            // Lock Java Enterprise until both Java Basics and Java Advanced are completed
            const javaBasics = topicsData.find(t => t.title === 'Java Basics');
            const javaAdvanced = topicsData.find(t => t.title === 'Java Advanced Concepts');
            
            let hasBasicsProgress = false;
            let hasAdvancedProgress = false;
            
            if (javaBasics) {
              const basicProgress = progressData.find((p: any) => p.topic_id === javaBasics.id);
              hasBasicsProgress = basicProgress && basicProgress.progress_percentage >= 80;
            }
            
            if (javaAdvanced) {
              const advancedProgress = progressData.find((p: any) => p.topic_id === javaAdvanced.id);
              hasAdvancedProgress = advancedProgress && advancedProgress.progress_percentage >= 80;
            }
            
            // Lock enterprise if either prerequisite is not completed
            is_locked = !(hasBasicsProgress && hasAdvancedProgress);
          }
          
          return {
            ...topic,
            progress: topicProgress ? topicProgress.progress_percentage : 0,
            is_locked: is_locked
          };
        });
        
        // Apply topic locking based on prerequisites
        const topicsWithLocking = checkTopicLockStatus(topicsWithStatus, progressData);
        
        // Ensure Java Enterprise is locked by applying our explicit locking logic again
        const finalTopics = topicsWithLocking.map(topic => {
          if (topic.title === 'Java Enterprise Development') {
            const javaBasics = topicsWithLocking.find(t => t.title === 'Java Basics');
            const javaAdvanced = topicsWithLocking.find(t => t.title === 'Java Advanced Concepts');
            
            let hasBasicsProgress = false;
            let hasAdvancedProgress = false;
            
            if (javaBasics) {
              const basicProgress = progressData.find((p: any) => p.topic_id === javaBasics.id);
              hasBasicsProgress = basicProgress && basicProgress.progress_percentage >= 80;
            }
            
            if (javaAdvanced) {
              const advancedProgress = progressData.find((p: any) => p.topic_id === javaAdvanced.id);
              hasAdvancedProgress = advancedProgress && advancedProgress.progress_percentage >= 80;
            }
            
            // Force lock if either prerequisite is not completed
            return { ...topic, is_locked: !(hasBasicsProgress && hasAdvancedProgress) };
          }
          return topic;
        });
        
        console.log("Final topics with locking:", finalTopics.map(t => ({
          title: t.title,
          is_locked: t.is_locked
        })));
        
        setTopics(finalTopics);
        
        // Now fetch lesson plans for these topics
        fetchAllLessonPlans(finalTopics);
      } catch (error) {
        console.error('Error fetching topics:', error);
        // Fallback topics for demonstration or error case
        setTopics([]);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, []);
  
  // Create function to get appropriate icon based on difficulty level
  const getDifficultyIcon = (level: string | undefined) => {
    switch(level?.toLowerCase()) {
      case 'beginner':
        return <BookOpen className="h-4 w-4 text-green-500" />;
      case 'intermediate':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'advanced':
        return <Terminal className="h-4 w-4 text-purple-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-green-500" />;
    }
  };

  // Function to fetch all lesson plans
  const fetchAllLessonPlans = async (topicsData: Topic[]) => {
    try {
      console.log("Starting to fetch all lesson plans for topics:", 
        topicsData.map(t => ({id: t.id, title: t.title})));
      
      // Try to get all lesson plans at once
      const allPlans = await getLessonPlans();
      console.log("API response for all lesson plans:", allPlans);
      
      if (allPlans && Array.isArray(allPlans)) {
        console.log(`Found ${allPlans.length} lesson plans`);
        
        // Add icons based on the topic
        const plansWithIcons = allPlans.map(plan => {
          // Find the topic this plan belongs to
          const relatedTopic = topicsData.find(t => t.id === plan.topic_id);
          console.log(`Processing plan: ${plan.title}, topic_id: ${plan.topic_id}, found related topic:`, relatedTopic?.title);
          
          return {
            ...plan,
            icon: relatedTopic?.icon || <ScrollText className="h-5 w-5 text-[#2E5BFF]" />,
            topic_title: relatedTopic?.title || 'Unknown Topic',
            progress: 0, // Initial progress, will be updated later
            completed_modules: 0 // Initial completed modules
          };
        });
        
        console.log("Setting allLessonPlans state with:", plansWithIcons);
        setAllLessonPlans(plansWithIcons);
        
        // Also populate the topic lesson plans mapping
        const plansByTopic: {[key: number]: any[]} = {};
        plansWithIcons.forEach(plan => {
          if (!plansByTopic[plan.topic_id]) {
            plansByTopic[plan.topic_id] = [];
          }
          plansByTopic[plan.topic_id].push(plan);
        });
        
        console.log("Setting topicLessonPlans state with:", plansByTopic);
        setTopicLessonPlans(plansByTopic);
      } else {
        console.warn("API did not return an array of lesson plans:", allPlans);
        
        // Try to fetch lesson plans individually for each topic
        console.log("Attempting to fetch lesson plans for each topic individually");
        const plansByTopic: {[key: number]: any[]} = {};
        let allCollectedPlans: any[] = [];
        
        for (const topic of topicsData) {
          try {
            console.log(`Fetching lesson plans for topic ${topic.id} (${topic.title})`);
            const topicPlans = await getLessonPlans(topic.id);
            
            if (topicPlans && Array.isArray(topicPlans) && topicPlans.length > 0) {
              console.log(`Found ${topicPlans.length} plans for topic ${topic.id}`);
              
              const plansWithIcons = topicPlans.map(plan => ({
                ...plan,
                icon: topic.icon || <ScrollText className="h-5 w-5 text-[#2E5BFF]" />,
                topic_title: topic.title,
                progress: 0,
                completed_modules: 0
              }));
              
              plansByTopic[topic.id] = plansWithIcons;
              allCollectedPlans = [...allCollectedPlans, ...plansWithIcons];
            } else {
              console.log(`No plans found for topic ${topic.id}`);
              plansByTopic[topic.id] = [];
            }
          } catch (topicError) {
            console.error(`Error fetching plans for topic ${topic.id}:`, topicError);
            plansByTopic[topic.id] = [];
          }
        }
        
        if (allCollectedPlans.length > 0) {
          console.log(`Successfully collected ${allCollectedPlans.length} lesson plans from individual topic requests`);
          setAllLessonPlans(allCollectedPlans);
          setTopicLessonPlans(plansByTopic);
        } else {
          console.error("Failed to fetch any lesson plans through any method");
        }
      }
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
    }
  };

  // Fetch lesson plan for the selected topic
  useEffect(() => {
    const fetchLessonPlan = async () => {
      if (selectedTopic) {
        try {
          // Get lesson plans for this topic
          const lessonPlans = await getLessonPlanDetails(selectedTopic.id);
          if (lessonPlans) {
            setActiveLessonPlan(lessonPlans);
            
            // Get the modules for this lesson plan
            const modules = await getLessonModules(lessonPlans.id);
            if (modules && modules.length > 0) {
              setActiveModule(modules[0]);
            }
          }
        } catch (error) {
          console.error("Error fetching lesson plan:", error);
        }
      }
    };
    
    fetchLessonPlan();
  }, [selectedTopic]);

  // Modify the time tracking logic
  useEffect(() => {
    // Start tracking time when a topic is selected
    if (selectedTopic) {
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // Set up interval to update time spent every minute
      const trackingInterval = setInterval(() => {
        if (sessionStartTime) {
          const now = new Date();
          const diffMs = now.getTime() - sessionStartTime.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          
          // Only update if time has changed
          if (diffMinutes > timeSpentMinutes) {
            setTimeSpentMinutes(diffMinutes);
            
            // Update progress every 10 minutes, max 10% from time spent
            if (diffMinutes % 10 === 0 && diffMinutes > 0) {
              updateUserProgress(1, 'time_spent');
            }
          }
        }
      }, 60000); // Check every minute
      
      return () => clearInterval(trackingInterval);
    }
  }, [selectedTopic, sessionStartTime, timeSpentMinutes]);

  // Function to update user progress with improved logic to prevent gaming the system
  const updateUserProgress = async (progressIncrement = 0, progressType = 'interaction') => {
    if (!selectedTopic) return;
    
    try {
      // Create a copy of the current progress data
      const updatedProgressData: ProgressData = { ...progressData };
      
      // Update the specific progress type with limits to prevent abuse
      if (progressType === 'interaction') {
        // Interactive chat progress (limited to 30%)
        // Cap at 30 points total and limit increments to prevent abuse
        const maxInteractionPoints = 30;
        const limitedIncrement = Math.min(progressIncrement, 2); // Limit each increment to 2 points max
        updatedProgressData.interaction = Math.min(updatedProgressData.interaction + limitedIncrement, maxInteractionPoints);
      } else if (progressType === 'code_execution') {
        // Coding exercise progress (40% weight)
        // Coding gets higher weight for successful executions
        const maxCodePoints = 40;
        updatedProgressData.code_execution = Math.min(updatedProgressData.code_execution + progressIncrement, maxCodePoints);
      } else if (progressType === 'time_spent') {
        // We'll use time spent as a minor helper, not a primary progress factor
        // Cap at 5% total for time spent
        const maxTimePoints = 5;
        updatedProgressData.time_spent = Math.min(updatedProgressData.time_spent + progressIncrement, maxTimePoints);
      } else if (progressType === 'knowledge_check') {
        // Quiz/knowledge check progress (30% weight)
        // Quizzes are a significant factor for progress
        const maxKnowledgePoints = 30;
        updatedProgressData.knowledge_check = Math.min(updatedProgressData.knowledge_check + progressIncrement, maxKnowledgePoints);
      }
      
      // Calculate overall progress with appropriate weighting
      const newProgress = Math.min(
        updatedProgressData.interaction + // 30% from chats
        updatedProgressData.code_execution + // 40% from coding
        updatedProgressData.time_spent + // 5% bonus from time
        updatedProgressData.knowledge_check, // 30% from quizzes
        100 // Cap at 100%
      );
      
      // Ensure newProgress is always an integer
      const roundedProgress = Math.round(newProgress);
      
      // Determine status based on progress
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (roundedProgress >= 100) {
        status = 'completed';
      } else if (roundedProgress > 0) {
        status = 'in_progress';
      }
      
      console.log(`Progress update: ${progressType} +${progressIncrement} = Total ${roundedProgress}%`);
      console.log(`Progress breakdown: Chat ${updatedProgressData.interaction}%, Code ${updatedProgressData.code_execution}%, Quizzes ${updatedProgressData.knowledge_check}%, Time ${updatedProgressData.time_spent}%`);
      
      // Prepare progress data as a string to avoid serialization issues
      const progressDataString = JSON.stringify(updatedProgressData);
      
      // Ensure completed subtopics is a valid array
      const subtopicsArray = Array.isArray(completedSubtopics) ? completedSubtopics : [];
      
      // Update progress in database with progress type data
      const result = await updateProgress({
        topic_id: selectedTopic.id,
        progress_percentage: roundedProgress,
        status,
        time_spent_minutes: timeSpentMinutes,
        exercises_completed: exercisesCompleted,
        exercises_total: exercisesTotal,
        completed_subtopics: subtopicsArray,
        progress_data: progressDataString
      });
      
      console.log("Progress update successful:", result);
      
      // Update local state for progress data
      setProgressData(updatedProgressData);
      
      // Update active module and lesson plan progress if applicable
      if (activeLessonPlan && activeModule) {
        // Update module progress
        const updatedModule = {
          ...activeModule,
          progress: roundedProgress
        };
        setActiveModule(updatedModule);
        
        // Update lesson plan's module progress
        updateLessonPlanProgress(activeLessonPlan.id, activeModule.id, roundedProgress);
      }
      
      // Update local state for selected topic
      setSelectedTopic({
        ...selectedTopic,
        progress: roundedProgress
      });
      
      // Update overall topic progress based on lesson progress
      updateTopicProgressFromLessons(selectedTopic.id);
      
      // Check if user has reached a quiz threshold
      await checkForQuizThreshold(roundedProgress, activeModule?.id);
      
      // If we're at 70% progress but haven't done a knowledge check, prompt for one
      if (roundedProgress >= 70 && updatedProgressData.knowledge_check < 15 && !knowledgeCheckRequested) {
        setKnowledgeCheckRequested(true);
        const knowledgeCheckMsg: Message = {
          id: Date.now(),
          text: "You've made great progress! To continue advancing, let's verify your understanding with a quiz on this topic.",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, knowledgeCheckMsg]);
        // Request a quiz from the AI
        requestKnowledgeCheck();
      }
    } catch (error: any) {
      console.error("Error updating progress:", error);
      // Show detailed error message
      if (error.response && error.response.data) {
        console.error('Response error data:', error.response.data);
        toast.error(`Progress update failed: ${JSON.stringify(error.response.data.errors || {})}`);
      } else {
        toast.error("Failed to update progress. Please try again.");
      }
    }
  };
  
  // Add this new function to update lesson plan progress
  const updateLessonPlanProgress = (lessonPlanId: number, moduleId: number, moduleProgress: number) => {
    // Create a copy of the topic lesson plans
    const updatedTopicLessonPlans = { ...topicLessonPlans };
    
    // Find the topic that contains this lesson plan
    for (const topicId in updatedTopicLessonPlans) {
      const plans = updatedTopicLessonPlans[topicId];
      const planIndex = plans.findIndex(plan => plan.id === lessonPlanId);
      
      if (planIndex !== -1) {
        // Update the progress of the specific module
        if (!plans[planIndex].modules) {
          plans[planIndex].modules = [];
        }
        
        // Find or create the module entry
        const moduleIndex = plans[planIndex].modules.findIndex((m: any) => m.id === moduleId);
        if (moduleIndex !== -1) {
          plans[planIndex].modules[moduleIndex].progress = moduleProgress;
        } else {
          plans[planIndex].modules.push({ id: moduleId, progress: moduleProgress });
        }
        
        // Calculate overall lesson plan progress by averaging the progress of all modules
        if (plans[planIndex].modules.length > 0) {
          const totalModuleProgress = plans[planIndex].modules.reduce(
            (sum: number, module: any) => sum + (module.progress || 0), 
            0
          );
          plans[planIndex].progress = Math.round(totalModuleProgress / plans[planIndex].modules.length);
        }
        
        // Update state
        setTopicLessonPlans(updatedTopicLessonPlans);
        
        // If this is the active lesson plan, update its state too
        if (activeLessonPlan && activeLessonPlan.id === lessonPlanId) {
          setActiveLessonPlan({
            ...activeLessonPlan,
            progress: plans[planIndex].progress
          });
        }
        
        break;
      }
    }
  };
  
  // Add this new function to calculate topic progress from lesson progress
  const updateTopicProgressFromLessons = (topicId: number) => {
    if (!topicId || !topicLessonPlans[topicId]) return;
    
    const plans = topicLessonPlans[topicId];
    
    // Calculate the total progress across all lesson plans
    const totalLessonPlans = plans.length;
    if (totalLessonPlans === 0) return;
    
    // Sum up progress from all lesson plans
    let totalProgress = 0;
    for (const plan of plans) {
      totalProgress += plan.progress || 0;
    }
    
    // Calculate average progress (Topic Progress = Sum of lesson progress percentages ÷ number of lessons)
    const averageProgress = Math.round(totalProgress / totalLessonPlans);
    
    console.log(`Topic ${topicId} progress updated: ${averageProgress}% (${totalProgress}/${totalLessonPlans} lessons)`);
    
    // Update the topic's progress in the topics array
    const updatedTopics = topics.map(topic => 
      topic.id === topicId ? { ...topic, progress: averageProgress } : topic
    );
    
    // Update topics state
    setTopics(updatedTopics);
    
    // If this is the selected topic, update its state too
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic({
        ...selectedTopic,
        progress: averageProgress
      });
    }
    
    // Also persist this to the backend
    try {
      updateProgress({
        topic_id: topicId,
        progress_percentage: averageProgress,
        status: averageProgress >= 100 ? 'completed' : averageProgress > 0 ? 'in_progress' : 'not_started'
      });
    } catch (error) {
      console.error("Error updating topic progress in backend:", error);
    }
  };

  // Function to request a knowledge check from the AI
  const requestKnowledgeCheck = async () => {
    setIsLoading(true);
    try {
      const response = await getTutorResponse({
        question: `Generate a short quiz with 3 multiple-choice questions covering the key concepts of ${selectedTopic?.title}. Format it clearly with questions and answer choices.`,
        conversationHistory: [],
        preferences: {
          ...tutorPreferences,
          responseLength: 'medium',
        },
        topic: selectedTopic?.title,
        topic_id: selectedTopic?.id,
        session_id: currentSessionId !== null ? currentSessionId : undefined
      });

      // Add the quiz to the chat
      const quizMessage: Message = {
        id: Date.now(),
        text: response.response || "Here's a short quiz to test your knowledge.",
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, quizMessage]);
    } catch (error) {
      console.error("Error requesting knowledge check:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Modified handleSendMessage to include lesson plan context
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Create user message
    const newMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      timestamp: new Date(),
      sender: 'user',
    };

    // Add user's message to the chat
    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Format conversation history for the AI API - ensure proper format for Gemini
      // Only take the last 10 messages to avoid too large requests
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      // Create context from lesson plan if available
      let lessonContext = "";
      if (activeLessonPlan && activeModule) {
        lessonContext = `
Current Lesson Plan: ${activeLessonPlan.title}
Module: ${activeModule.title}
Module Content: ${activeModule.content ? activeModule.content.substring(0, 500) + '...' : 'No content available'}
Learning Objectives: ${activeLessonPlan.learning_objectives || 'Not specified'}
`;
      }

      // Get response from AI tutor with lesson context
      const response = await getTutorResponse({
        question: inputMessage,
        conversationHistory,
        preferences: tutorPreferences,
        topic: selectedTopic?.title,
        topic_id: selectedTopic?.id,
        session_id: currentSessionId !== null ? currentSessionId : undefined,
        lesson_context: lessonContext // Add lesson context
      });

      // Add AI's response to the chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: response.response || "I'm sorry, I don't have a response for that.",
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Check if this seems to be a knowledge check response
      if (knowledgeCheckRequested && 
          (inputMessage.toLowerCase().includes('answer') || 
           inputMessage.toLowerCase().includes('option') || 
           inputMessage.match(/[a-d]\s*:/i))) {
        // This might be an answer to a knowledge check question - award higher points for quizzes
        await updateUserProgress(5, 'knowledge_check');
        
        // After a few knowledge check answers, consider the check complete
        knowledgeCheckAnswersCount++;
        if (knowledgeCheckAnswersCount >= 3) {
          setKnowledgeCheckRequested(false);
          knowledgeCheckAnswersCount = 0;
        }
      } else {
        // Regular chat message progress - small increments to avoid abuse
        // Determine message quality based on length and content
        const messageLength = inputMessage.length;
        
        // Base the progress increment on the quality of the interaction
        let progressIncrement = 1; // Default minimal increment
        
        // More substantial questions get slightly more progress
        if (messageLength > 50) {
          // Check if this is a meaningful message with programming-related terms
          const hasProgrammingTerms = /\b(java|code|function|method|class|variable|loop|if|else|algorithm|data|structure)\b/i.test(inputMessage);
          if (hasProgrammingTerms) {
            progressIncrement = 2; // More substantial programming questions
          }
        }
        
        await updateUserProgress(progressIncrement, 'interaction');
      }
      
      // If the session has an ID now, update the current session ID
      if (response.session_id && currentSessionId === null) {
        setCurrentSessionId(response.session_id);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I'm having trouble connecting to my AI services. Please try again later.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Update handleTopicSelect to prevent selecting locked topics
  const handleTopicSelect = (topic: Topic) => {
    if (topic.is_locked) {
      toast.error("Topic Locked: You need to complete the prerequisites first.");
      return;
    }

    setSelectedTopic(topic);
    setMessages([]);
    // Use the existing topic selection flow
    const fetchTutorResponse = async () => {
      setIsLoading(true);
      try {
        const response = await getTutorResponse({
          question: `I'd like to learn about ${topic.title}. Please provide a brief introduction.`,
          conversationHistory: [],
          preferences: tutorPreferences,
          topic: topic.title,
          topic_id: topic.id
        });

        // Add welcome message
        const welcomeMessage: Message = {
          id: Date.now(),
          text: response.response || `Welcome to the ${topic.title} topic!`,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages([welcomeMessage]);
        
        // Save session ID if available
        if (response.session_id) {
          setCurrentSessionId(response.session_id);
        }
      } catch (error) {
        console.error("Error getting tutor response:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutorResponse();
  };
  
  const handleSessionSelect = async (session: Session) => {
    setActiveTab('chat');
    setIsLoading(true);
    
    try {
      // Get response from AI tutor about the selected session
      console.log('Requesting session resumption:', {
        question: `I want to continue our previous session on ${session.topic}`,
        conversationHistory: [],
        preferences: tutorPreferences,
        topic: session.topic,
        topic_id: topics.find(t => t.title === session.topic)?.id, // Look up topic ID
        session_id: session.id
      });

      const response = await getTutorResponse({
        question: `I want to continue our previous session on ${session.topic}`,
        conversationHistory: [], // Empty array for new session
        preferences: tutorPreferences,
        topic: session.topic,
        topic_id: topics.find(t => t.title === session.topic)?.id, // Look up topic ID
        session_id: session.id
      });
      
      console.log('Received session resumption response:', response);
      
      if (!response || !response.response) {
        throw new Error('Invalid response format received from API');
      }
      
      // Store session ID
      setCurrentSessionId(session.id);
      
      // Add bot's response to the chat
      const botResponse: Message = {
        id: Date.now(),
        text: response.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages([botResponse]);
    } catch (error) {
      console.error('Error getting AI response for session:', error);
      let errorMsg = 'Unknown error';
      
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      toast.error(`Failed to resume session: ${errorMsg}`);
      
      // Add fallback message
      const fallbackMessage: Message = {
        id: Date.now(),
        text: `Welcome back to your session on ${session.topic}. How can I help you today?`,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages([fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePreferenceChange = (key: string, value: any) => {
    setTutorPreferences({
      ...tutorPreferences,
      [key]: value,
    });
  };

  // Enhanced code execution with improved progress tracking
  const handleRunCode = async () => {
    if (!codeInput.trim()) {
      toast.error('Please write some code first');
      return;
    }
    
    setIsExecuting(true);
    setCodeOutput(null);
    
    try {
      // Format conversation history for the API
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
      
      const result = await executeJavaCode({
        code: codeInput,
        session_id: currentSessionId !== null ? currentSessionId : undefined,
        topic_id: selectedTopic?.id,
        conversation_history: conversationHistory
      });
      
      setCodeOutput({
        stdout: result.execution.stdout || '',
        stderr: result.execution.stderr || '',
        executionTime: result.execution.executionTime || 0
      });
      
      // Calculate code complexity to determine progress award
      const codeComplexity = calculateCodeComplexity(codeInput);
      
      if (result.execution.success) {
        // Successful code execution - award more substantial progress in coding category
        const progressPoints = Math.min(4 + codeComplexity, 8); // Higher rewards for coding exercise success
        setExercisesCompleted(prev => prev + 1);
        await updateUserProgress(Math.round(progressPoints), 'code_execution');
        
        // If execution was successful and we have AI feedback, show it
        if (result.feedback) {
          const botMessage: Message = {
            id: Date.now(),
            text: result.feedback,
            sender: 'bot',
            timestamp: new Date(),
            code: codeInput
          };
          
          if (activeTab === 'chat') {
            setMessages(prev => [...prev, botMessage]);
          }
        }
      } else {
        // Unsuccessful attempt still gets some points (for trying)
        // Award less for unsuccessful attempts but still recognize the effort
        await updateUserProgress(1, 'code_execution');
      }
    } catch (error) {
      console.error('Error executing code:', error);
      toast.error('Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  // Helper function to calculate code complexity
  const calculateCodeComplexity = (code: string) => {
    // Very simple complexity calculation - counts loops, conditionals, etc.
    const lines = code.split('\n').length;
    const loops = (code.match(/for\s*\(/g) || []).length + (code.match(/while\s*\(/g) || []).length;
    const conditionals = (code.match(/if\s*\(/g) || []).length;
    const methods = (code.match(/\s\w+\s*\([^)]*\)\s*{/g) || []).length;
    
    let complexity = 1; // Base complexity
    
    // Adjust complexity based on these factors
    if (lines > 50) complexity += 2;
    else if (lines > 20) complexity += 1;
    
    complexity += Math.min(loops, 3); // Max 3 points for loops
    complexity += Math.min(conditionals, 2); // Max 2 points for conditionals
    complexity += Math.min(methods, 2); // Max 2 points for methods
    
    return Math.min(complexity, 8); // Cap at 8
  };
  
  // Format code using the Monaco editor's built-in formatter
  const formatCode = () => {
    setIsFormatting(true);
    // Actual formatting happens through Monaco's formatDocument command
    // This is handled in the editorDidMount function
    setTimeout(() => setIsFormatting(false), 500);
    toast.success("Code formatted");
  };
  
  // Handle editor initialization
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Store references if needed for advanced features
    
    // Setup auto-completion
    monaco.languages.registerCompletionItemProvider('java', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'sout',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'System.out.println(${1:});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print to standard output'
          },
          {
            label: 'fori',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop with index'
          },
          {
            label: 'psvm',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'public static void main(String[] args) {\n\t${1:}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Public static void main method'
          },
          {
            label: 'trycatch',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'try {\n\t${1:}\n} catch (${2:Exception} e) {\n\t${3:e.printStackTrace();}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-catch block'
          }
        ];
        
        // Add common Java classes and methods
        ['String', 'Integer', 'Boolean', 'ArrayList', 'HashMap', 'List', 'Map', 'Math'].forEach(className => {
          suggestions.push({
            label: className,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: className,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `Java ${className} class`
          });
        });
        
        return { suggestions };
      }
    });
    
    // Setup command for formatting
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
    });
  };
  
  // Add or remove a breakpoint for debugging visualization
  const toggleBreakpoint = (lineNumber: number) => {
    setBreakpoints(prev => 
      prev.includes(lineNumber) 
        ? prev.filter(bp => bp !== lineNumber) 
        : [...prev, lineNumber]
    );
  };
  
  // Simulate a basic debugging session
  const startDebugging = () => {
    if (breakpoints.length === 0) {
      toast.warning("Add at least one breakpoint to start debugging");
      return;
    }
    
    setIsDebugging(true);
    setDebugStep(0);
    
    // This would be replaced with actual step-by-step execution
    // For now, we're just simulating the UI experience
    toast.success("Debug mode started. Use the debug controls to step through code.");
  };
  
  // Stop the debugging session
  const stopDebugging = () => {
    setIsDebugging(false);
    setDebugStep(0);
    
    toast.info("Debug session ended");
  };
  
  // Step forward in the debug session
  const stepDebug = () => {
    if (!isDebugging) return;
    
    // Simulate stepping through code
    setDebugStep(prev => {
      const next = prev + 1;
      
      // Check if we've reached the end of debugging
      if (next >= breakpoints.length) {
        stopDebugging();
        return 0;
      }
      
      return next;
    });
  };
  
  // Customize editor settings
  const updateEditorSettings = (setting: string, value: any) => {
    setEditorOptions(prev => ({
      ...prev,
      [setting]: value
    }));
    
    toast.success(`Editor setting updated: ${setting}`);
  };

  const handleLessonPlanSelect = async (lessonPlan: LessonPlan) => {
    // Extract step numbers and check if this lesson is locked
    const getStepNumber = (plan: LessonPlan) => {
      const match = plan.description?.match(/Step (\d+):/);
      return match ? parseInt(match[1], 10) : 999;
    };
    
    // Find the step number of the selected plan
    const selectedStepNumber = getStepNumber(lessonPlan);
    
    // Find the highest completed step in the current topic
    const topicPlans = topicLessonPlans[lessonPlan.topic_id] || [];
    const highestCompletedStep = topicPlans.reduce((highest, plan) => {
      const stepNumber = getStepNumber(plan);
      // Consider a lesson completed if progress is at least 80%
      const isCompleted = (plan.progress || 0) >= 80;
      return isCompleted && stepNumber > highest ? stepNumber : highest;
    }, 0);
    
    // Check if this lesson is locked (more than 1 step ahead)
    const isLocked = selectedStepNumber > highestCompletedStep + 1;
    
    if (isLocked) {
      toast.error('This lesson is locked. Complete previous lessons first.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Find the topic this lesson plan belongs to
      const relatedTopic = topics.find(t => t.id === lessonPlan.topic_id);
      
      if (relatedTopic) {
        // Set the selected topic based on the lesson plan's topic
        setSelectedTopic(relatedTopic);
        
        // Fetch topic progress
        const existingProgress = await getTopicProgress(relatedTopic.id);
        console.log("Existing progress for topic:", existingProgress);
        
        // Initialize progress state from the existing progress
        if (existingProgress && existingProgress.progress_percentage > 0) {
          setTimeSpentMinutes(existingProgress.time_spent_minutes || 0);
          setExercisesCompleted(existingProgress.exercises_completed || 0);
          setExercisesTotal(existingProgress.exercises_total || relatedTopic.exercises_count || 0);
          setCompletedSubtopics(existingProgress.completed_subtopics || []);
          
          // Initialize progress data from existing data
          if (existingProgress.progress_data) {
            let parsedProgressData = existingProgress.progress_data;
            if (typeof parsedProgressData === 'string') {
              try {
                parsedProgressData = JSON.parse(parsedProgressData);
              } catch (e) {
                console.error("Error parsing progress data:", e);
                parsedProgressData = {
                  interaction: 0,
                  code_execution: 0,
                  time_spent: 0,
                  knowledge_check: 0
                };
              }
            }
            setProgressData(parsedProgressData);
          }
        } else {
          // Initialize new progress
          setSessionStartTime(new Date());
          setTimeSpentMinutes(0);
          setExercisesCompleted(0);
          setExercisesTotal(relatedTopic.exercises_count || 0);
          setCompletedSubtopics([]);
          setProgressData({
            interaction: 0,
            code_execution: 0,
            time_spent: 0,
            knowledge_check: 0
          });
        }
      }
      
      // Reset session ID when selecting a new lesson plan
      setCurrentSessionId(null);
      
      // Switch to chat tab
      setActiveTab('chat');
      
      // Get details about the lesson plan
      const lessonPlanDetails = await getLessonPlanDetails(lessonPlan.id);
      console.log("Lesson plan details:", lessonPlanDetails);
      
      // Get response from AI tutor about the selected lesson plan
      const response = await getTutorResponse({
        question: `I'd like to learn about ${lessonPlan.title}. This is a lesson plan for ${lessonPlan.topic_title || 'a programming topic'}. Please provide a brief introduction to this lesson plan and what I'll be learning.`,
        conversationHistory: [], // Empty array for new conversation
        preferences: tutorPreferences,
        topic: lessonPlan.topic_title || '',
        topic_id: lessonPlan.topic_id
      });

      // Clear previous messages and add welcome message
      const welcomeMessage: Message = {
        id: Date.now(),
        text: response.response || `Welcome to the ${lessonPlan.title} lesson plan!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // If the response includes a session ID, set it
      if (response.session_id) {
        setCurrentSessionId(response.session_id);
      }
    } catch (error) {
      console.error("Error selecting lesson plan:", error);
      setMessages([
        {
          id: Date.now(),
          text: `I'm having trouble loading the ${lessonPlan.title} lesson plan. Please try again later.`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to generate a quiz for a topic at the beginning of the component
  const generateQuizForTopic = async (topicId: number, title: string) => {
    if (!selectedTopic) return;
    
    setIsLoadingQuiz(true);
    try {
      const response = await getTutorResponse({
        question: `Generate a quiz with 5 multiple-choice questions about ${title}. Each question should have 4 options (A, B, C, D) with only one correct answer. Format your response as a JSON array in this exact structure:
        [
          {
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOption": 0, // Index of correct option (0-3)
            "explanation": "Explanation of why this answer is correct"
          }
        ]
        Note: correctOption must be the index (0-3) of the correct answer, not a letter.`,
        conversationHistory: [],
        preferences: {
          ...tutorPreferences,
          responseLength: 'detailed',
        },
        topic: selectedTopic?.title,
        topic_id: topicId
      });

      if (response && response.response) {
        try {
          // Extract the JSON from the response
          const jsonMatch = response.response.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|\[\s*\{[\s\S]*\}\s*\]/);
          let jsonStr = '';
          
          if (jsonMatch) {
            jsonStr = jsonMatch[1] || jsonMatch[2] || jsonMatch[0];
          } else {
            // If no JSON code block found, try to extract array directly
            jsonStr = response.response.replace(/^[\s\S]*?(\[\s*\{)/m, '$1').replace(/(\}\s*\])[\s\S]*$/m, '$1');
          }

          // Clean up the string
          jsonStr = jsonStr.trim();
          
          // Parse the JSON
          const questions = JSON.parse(jsonStr);
          
          if (Array.isArray(questions) && questions.length > 0) {
            // Create the quiz object
            const quiz: Quiz = {
              id: Date.now(),
              title: `${title} Quiz`,
              description: `Test your knowledge of ${title} with these multiple-choice questions.`,
              topic_id: topicId,
              questions: questions.map((q, index) => ({
                id: index + 1,
                question: q.question,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation
              })),
              totalPoints: questions.length * 10
            };
            
            setActiveQuiz(quiz);
            setCurrentQuestionIndex(0);
            setSelectedOptions(new Array(questions.length).fill(-1));
            setQuizSubmitted(false);
            setQuizScore(0);
            
            // Switch to the quiz tab
            setActiveTab('quiz');
          } else {
            throw new Error('Invalid question format');
          }
        } catch (parseError) {
          console.error('Error parsing quiz questions:', parseError);
          toast.error('Failed to generate valid quiz questions');
        }
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate a quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Add a function to handle quiz submission
  const handleQuizSubmit = async () => {
    if (!activeQuiz || !selectedTopic) return;
    
    // Calculate score
    let correctAnswers = 0;
    activeQuiz.questions.forEach((question, index) => {
      if (selectedOptions[index] === question.correctOption) {
        correctAnswers++;
      }
    });
    
    const scorePercentage = Math.round((correctAnswers / activeQuiz.questions.length) * 100);
    setQuizScore(scorePercentage);
    setQuizSubmitted(true);
    
    // Update progress based on quiz performance
    const progressPoints = Math.round((scorePercentage / 100) * 15); // Award up to 15 points for quiz performance
    await updateUserProgress(progressPoints, 'knowledge_check');
    
    // Mark knowledge check as complete
    setKnowledgeCheckRequested(false);
  };

  /**
   * Check if user has reached a progress threshold and should take a quiz
   */
  const checkForQuizThreshold = async (progress: number, moduleId?: number) => {
    // If we already have a quiz attempt in progress, don't show another quiz
    if (quizAttempt && !quizAttempt.completed_at) return;
    
    // Determine the threshold levels (30%, 60%, 90%)
    const thresholds = [30, 60, 90];
    
    // Find the next threshold the user should hit
    const nextThreshold = thresholds.find(t => progress >= t && progress < t + 10);
    
    if (!nextThreshold) return;
    
    try {
      // If we have a specific module ID, load quizzes for that module
      if (moduleId) {
        const response = await axios.get(`${API_URL}/modules/${moduleId}/quizzes`);
        if (response.data.quizzes && response.data.quizzes.length > 0) {
          const availableQuizzes = response.data.quizzes.filter((q: any) => q.is_published && !q.passed);
          
          if (availableQuizzes.length > 0) {
            setModuleQuizzes(availableQuizzes);
            setShowQuizAtThreshold(true);
            
            // Add a message about the quiz to the chat
            const quizPromptMessage: Message = {
              id: Date.now(),
              text: `You've reached ${nextThreshold}% progress! It's a good time to test your knowledge with a quiz. Click on the Quiz tab to get started.`,
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, quizPromptMessage]);
            
            // Switch to the quiz tab
            setActiveTab('quiz');
          }
        }
      } else if (activeModule) {
        // If we don't have a module ID but have an active module, use that
        const response = await axios.get(`${API_URL}/modules/${activeModule.id}/quizzes`);
        if (response.data.quizzes && response.data.quizzes.length > 0) {
          const availableQuizzes = response.data.quizzes.filter((q: any) => q.is_published && !q.passed);
          
          if (availableQuizzes.length > 0) {
            setModuleQuizzes(availableQuizzes);
            setShowQuizAtThreshold(true);
            
            // Add a message about the quiz to the chat
            const quizPromptMessage: Message = {
              id: Date.now(),
              text: `You've reached ${nextThreshold}% progress! It's a good time to test your knowledge with a quiz. Click on the Quiz tab to get started.`,
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, quizPromptMessage]);
            
            // Switch to the quiz tab
            setActiveTab('quiz');
          }
        }
      }
    } catch (error) {
      console.error("Error loading quizzes for threshold check:", error);
    }
  };

  /**
   * Start an attempt at the module quiz
   */
  const startModuleQuiz = async (quizId: number) => {
    try {
      setIsLoadingQuiz(true);
      
      // Start a quiz attempt
      const response = await axios.post(`${API_URL}/quizzes/${quizId}/attempt`);
      
      if (response.data.attempt) {
        setQuizAttempt(response.data.attempt);
        
        // Load the quiz details
        const quizResponse = await axios.get(`${API_URL}/quizzes/${quizId}`);
        if (quizResponse.data.quiz) {
          const quiz = quizResponse.data.quiz;
          setActiveQuiz({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description || `Test your knowledge of ${activeModule?.title || selectedTopic?.title}`,
            topic_id: selectedTopic?.id || 0,
            questions: quiz.questions.map((q: any) => ({
              id: q.id,
              question: q.question_text,
              options: q.options || [],
              correctOption: -1, // We don't show correct answers until submission
              explanation: q.explanation || ""
            })),
            totalPoints: quiz.questions.length * quiz.points_per_question
          });
          
          setCurrentQuestionIndex(0);
          setSelectedOptions(new Array(quiz.questions.length).fill(-1));
          setQuizSubmitted(false);
          setQuizScore(0);
        }
      }
    } catch (error) {
      console.error("Error starting module quiz:", error);
      toast.error("Failed to start the quiz. Please try again.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  /**
   * Submit responses to the module quiz
   */
  const submitModuleQuiz = async () => {
    if (!activeQuiz || !quizAttempt) return;
    
    try {
      setIsLoadingQuiz(true);
      
      // Convert the responses format for the API
      const responsesObj: Record<string, any> = {};
      activeQuiz.questions.forEach((question, index) => {
        responsesObj[question.id] = selectedOptions[index];
      });
      
      // Submit the quiz attempt
      const response = await axios.post(`${API_URL}/quiz-attempts/${quizAttempt.id}/submit`, {
        responses: responsesObj,
        time_spent_seconds: Math.floor((Date.now() - new Date(quizAttempt.created_at).getTime()) / 1000)
      });
      
      if (response.data) {
        setQuizAttempt(response.data.attempt);
        setQuizScore(response.data.percentage);
        setQuizSubmitted(true);
        
        // Update progress based on quiz performance
        const progressPoints = Math.round((response.data.percentage / 100) * 15); // Award up to 15 points for quiz performance
        await updateUserProgress(progressPoints, 'knowledge_check');
        
        // Get the correct answers from the AI tutor perspective
        const tutorResponse = await getTutorResponse({
          question: `The user just completed a quiz on ${activeModule?.title || selectedTopic?.title} and scored ${response.data.percentage}%. 
          Based on this performance, what areas should they focus on improving? 
          Which concepts were they strong in and which need more attention?`,
          conversationHistory: [],
          preferences: {
            ...tutorPreferences,
            responseLength: 'medium',
          },
          topic: selectedTopic?.title,
          topic_id: selectedTopic?.id,
          session_id: currentSessionId !== null ? currentSessionId : undefined
        });
        
        if (tutorResponse && tutorResponse.response) {
          const quizFeedbackMessage: Message = {
            id: Date.now(),
            text: tutorResponse.response,
            sender: 'ai',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, quizFeedbackMessage]);
        }
      }
    } catch (error) {
      console.error("Error submitting module quiz:", error);
      toast.error("Failed to submit quiz answers. Please try again.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Add a function to get quiz analysis
  const getQuizAnalysis = async () => {
    if (!selectedTopic) return;
    
    try {
      setIsLoadingAnalysis(true);
      const analysisData = await analyzeQuizResults({
        topic_id: selectedTopic.id
      });
      
      setQuizAnalysis(analysisData);
      
      // Add the analysis message to chat if there's feedback
      if (analysisData.feedback) {
        const analysisMessage: Message = {
          id: Date.now(),
          text: `📊 **Quiz Performance Analysis**\n\n${analysisData.feedback}`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error("Error getting quiz analysis:", error);
      toast.error("Failed to analyze quiz performance");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Add a function to get color based on difficulty level
  const getDifficultyColor = (level: string | undefined) => {
    switch(level?.toLowerCase()) {
      case 'beginner':
        return 'text-green-500 border-green-200';
      case 'intermediate':
        return 'text-blue-500 border-blue-200';
      case 'advanced':
        return 'text-purple-500 border-purple-200';
      default:
        return 'text-green-500 border-green-200';
    }
  };

  // Add this function to handle module selection
  const handleModuleSelect = (module: any) => {
    setActiveModule(module);
    
    // If we're not in the chat tab, switch to it
    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with improved title that emphasizes AI tutoring */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Code className="h-6 w-6 text-[#2E5BFF]" />
          AI-Driven Learning Environment
        </h1>
        <p className="text-gray-400">Learn programming with your personal AI tutor and structured lesson plans</p>
          </div>
          
      {/* Main content area - now full width */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
        {/* Tab navigation with enhanced design for lesson plans tab */}
        <div className="border-b border-white/10">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5 bg-transparent w-full relative overflow-visible">
              {/* Animated Background Indicator */}
              <motion.div 
                className="absolute h-full bg-white/5 rounded-md top-0 z-0"
                style={{ 
                  width: '20%',
                  left: activeTab === 'chat' ? '0%' : 
                       activeTab === 'lesson-plans' ? '20%' : 
                       activeTab === 'quiz' ? '40%' : 
                       activeTab === 'sessions' ? '60%' : '80%'
                }}
                layout
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              
              <TabsTrigger
                value="chat"
                className={`px-3 py-2 text-sm z-10 relative overflow-visible transition-all hover:text-white
                  ${activeTab === 'chat' ? 'text-white font-semibold' : 'text-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>AI Tutor Chat</span>
                </div>
                {activeTab === 'chat' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-600 rounded-t-full"
                    layoutId="activeTabIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </TabsTrigger>
              
              <TabsTrigger
                value="lesson-plans"
                className={`px-3 py-2 text-sm z-10 relative overflow-visible transition-all hover:text-white
                  ${activeTab === 'lesson-plans' ? 'text-white font-semibold' : 'text-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Lesson Plans</span>
                  {selectedTopic && topicLessonPlans[selectedTopic.id]?.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2E5BFF] rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold">{topicLessonPlans[selectedTopic.id]?.length}</span>
                    </div>
                  )}
                </div>
                {activeTab === 'lesson-plans' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-600 rounded-t-full"
                    layoutId="activeTabIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </TabsTrigger>
              
              <TabsTrigger
                value="quiz"
                className={`px-3 py-2 text-sm z-10 relative overflow-visible transition-all hover:text-white
                  ${activeTab === 'quiz' ? 'text-white font-semibold' : 'text-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>Quizzes</span>
                </div>
                {activeTab === 'quiz' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-600 rounded-t-full"
                    layoutId="activeTabIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </TabsTrigger>
              
              <TabsTrigger
                value="sessions"
                className={`px-3 py-2 text-sm z-10 relative overflow-visible transition-all hover:text-white
                  ${activeTab === 'sessions' ? 'text-white font-semibold' : 'text-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Sessions</span>
                </div>
                {activeTab === 'sessions' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-600 rounded-t-full"
                    layoutId="activeTabIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </TabsTrigger>
              
              <TabsTrigger
                value="settings"
                className={`px-3 py-2 text-sm z-10 relative overflow-visible transition-all hover:text-white
                  ${activeTab === 'settings' ? 'text-white font-semibold' : 'text-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  <span>Settings</span>
                </div>
                {activeTab === 'settings' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-600 rounded-t-full"
                    layoutId="activeTabIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex flex-col">
          {/* Content area - Changes based on active tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col">
              {/* Chat Section */}
              <section className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    {selectedTopic ? selectedTopic.title : 'Chat with AI Tutor'}
                  </h2>
                  
                  {selectedTopic && (
                    <div className="flex items-center bg-white/5 rounded-lg p-2 min-w-[180px]">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">Progress</span>
                          <span className="text-xs font-medium">{selectedTopic.progress}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div 
                            className="bg-[#2E5BFF] h-1.5 rounded-full" 
                            style={{ width: `${selectedTopic.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Add Progress Breakdown right after the title */}
                {selectedTopic && (
                  <ProgressBreakdown 
                    progressData={progressData}
                    totalProgress={selectedTopic.progress || 0}
                    className="mb-4"
                  />
                )}
                
                {/* Add the ModuleList component here */}
                {activeLessonPlan && activeModule && (
                  <ModuleList 
                    modules={activeLessonPlan.modules || []}
                    activeLessonPlan={activeLessonPlan}
                    activeModuleId={activeModule.id}
                    onSelectModule={handleModuleSelect}
                  />
                )}
                
                <div className="bg-white/5 rounded-lg p-4 overflow-y-auto mb-4" style={{ height: '55vh' }}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-[#2E5BFF]" />
                        <p>Start chatting with your AI-powered tutor to learn Java programming</p>
                        <p className="text-xs mt-2">Powered by Together AI</p>
                      </div>
                    )}
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start space-x-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.sender !== 'user' && (
                          <div className="w-8 h-8 rounded-full bg-[#2E5BFF] flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender === 'user'
                              ? 'bg-[#2E5BFF] text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          
                          {message.code && (
                            <div className="mt-2 bg-[#1a1a1a] rounded-lg p-3 font-mono text-xs overflow-x-auto">
                              <pre>{message.code}</pre>
                            </div>
                          )}
                          
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {message.sender === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {/* Loading indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start space-x-3 justify-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#2E5BFF] flex items-center justify-center">
                          <Loader className="w-5 h-5 animate-spin" />
                        </div>
                        <div className="bg-white/10 text-white max-w-[80%] rounded-lg p-3">
                          <div className="flex space-x-2 items-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-400"></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 min-h-[42px]">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] border border-white/10"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    className={`text-white px-4 py-2 rounded-lg transition flex items-center space-x-2 whitespace-nowrap flex-shrink-0 w-[100px] ${
                      isLoading 
                        ? 'bg-[#2E5BFF]/50 cursor-not-allowed' 
                        : 'bg-[#2E5BFF] hover:bg-[#1E4BEF] cursor-pointer'
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Sending</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </section>
              
              {/* Code Editor Section - Now below the chat */}
              <section className="p-4">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  Code Editor
                </h2>
                <div className="bg-white/5 rounded-lg p-4 overflow-hidden flex flex-col space-y-4">
                  {/* Editor controls */}
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-3">
                      <select
                        value={editorTheme}
                        onChange={(e) => setEditorTheme(e.target.value)}
                        className="bg-white/10 border-0 rounded text-sm text-gray-300 focus:ring-[#2E5BFF] p-1"
                      >
                        <option value="vs-dark">Dark Theme</option>
                        <option value="vs-light">Light Theme</option>
                        <option value="hc-black">High Contrast</option>
                      </select>
                      
                      <button
                        onClick={formatCode}
                        disabled={isFormatting}
                        className="bg-white/10 text-gray-300 px-2 py-1 rounded text-sm flex items-center space-x-1 hover:bg-white/20 transition"
                        title="Format Code (Alt+Shift+F)"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        <span>Format</span>
                      </button>
                    </div>
                    
                    {/* Debug controls */}
                    <div className="flex space-x-3">
                      {isDebugging ? (
                        <>
                          <button
                            onClick={stepDebug}
                            className="bg-blue-600/50 text-white px-2 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600/80 transition"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>Step</span>
                          </button>
                          <button
                            onClick={stopDebugging}
                            className="bg-red-600/50 text-white px-2 py-1 rounded text-sm flex items-center space-x-1 hover:bg-red-600/80 transition"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Stop</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={startDebugging}
                          className="bg-white/10 text-gray-300 px-2 py-1 rounded text-sm flex items-center space-x-1 hover:bg-white/20 transition"
                          title="Debug Mode"
                        >
                          <Bug className="h-3.5 w-3.5" />
                          <span>Debug</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Monaco Editor */}
                  <div className="h-[30vh]">
                    <Editor
                      height="100%"
                      width="100%"
                      language={editorLanguage}
                      theme={editorTheme}
                      value={codeInput}
                      onChange={(value) => setCodeInput(value || '')}
                      options={editorOptions}
                      onMount={handleEditorDidMount}
                      beforeMount={(monaco) => {
                        // Optional: Configure Monaco before mounting
                        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: false
                        });
                      }}
                      loading={<div className="h-full w-full flex items-center justify-center bg-[#1A2E42]/80">
                        <Loader className="h-5 w-5 animate-spin text-[#2E5BFF]" />
                      </div>}
                    />
                  </div>
                  
                  {/* Debug info panel - Show when debugging */}
                  {isDebugging && (
                    <div className="bg-[#1A2E42]/80 rounded p-2 text-xs text-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Debug Info</span>
                        <span className="text-blue-400">Breakpoints: {breakpoints.join(', ')}</span>
                      </div>
                      <div className="mt-1">
                        <span>Current Step: {debugStep + 1}/{breakpoints.length}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Code output */}
                  {codeOutput && (
                    <div className="bg-[#1a1a1a] rounded-lg p-4 text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Output (executed in {codeOutput.executionTime}ms)</span>
                      </div>
                      {codeOutput.stdout && (
                        <div className="mb-2">
                          <p className="text-green-400 mb-1">Standard Output:</p>
                          <pre className="text-white whitespace-pre-wrap">{codeOutput.stdout}</pre>
                        </div>
                      )}
                      {codeOutput.stderr && (
                        <div>
                          <p className="text-red-400 mb-1">Standard Error:</p>
                          <pre className="text-white whitespace-pre-wrap">{codeOutput.stderr}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRunCode}
                      className="bg-[#2E5BFF] text-white px-4 py-2 rounded-lg hover:bg-[#1E4BEF] transition flex items-center space-x-2"
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Code className="h-5 w-5" />
                          <span>Run Code</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (!codeInput.trim()) {
                          toast.error('Please write some code first');
                          return;
                        }
                        
                        setIsLoading(true);
                        
                        try {
                          const response = await getTutorResponse({
                            question: `Please evaluate this Java code and provide feedback: \n\n${codeInput}`,
                            conversationHistory: [],
                            preferences: tutorPreferences,
                            topic: selectedTopic?.title,
                            topic_id: selectedTopic?.id,
                            session_id: currentSessionId !== null ? currentSessionId : undefined
                          });
                          
                          const botMessage: Message = {
                            id: Date.now(),
                            text: response.response,
                            sender: 'bot',
                            timestamp: new Date(),
                            code: codeInput
                          };
                          
                          setMessages(prev => [...prev, botMessage]);
                        } catch (error) {
                          console.error('Error evaluating code:', error);
                          toast.error('Failed to evaluate code');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition flex items-center space-x-2"
                      disabled={isLoading}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Get AI Feedback</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
          
          {activeTab === 'lesson-plans' && (
            <section className="p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <ScrollText className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                Lesson Plans
              </h2>
              {/* Debug logging */}
              {(() => { console.log("Rendering lesson plans, topics:", topics.length, "loading:", isLoadingTopics); return null; })()}
              
              {isLoadingTopics ? (
                // Loading state
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 animate-pulse h-32"></div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Topic Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-gray-300">Select a Topic</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topics.map((topic) => (
                        <motion.div
                          key={topic.id}
                          whileHover={topic.is_locked ? {} : { y: -5, scale: 1.02 }}
                          whileTap={topic.is_locked ? {} : { scale: 0.98 }}
                          onClick={() => !topic.is_locked && setSelectedTopic(topic)}
                          className={`p-5 rounded-lg transition-all duration-300 shadow-lg ${
                            selectedTopic?.id === topic.id
                              ? 'bg-gradient-to-br from-[#2E5BFF] to-[#4466ff] text-white ring-2 ring-blue-400 ring-opacity-50'
                              : topic.is_locked 
                                ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500 cursor-not-allowed opacity-70'
                                : 'bg-gradient-to-br from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-gray-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                topic.is_locked ? 'bg-gray-800' : 'bg-blue-600 bg-opacity-20'
                              }`}>
                                <div className={topic.is_locked ? 'text-gray-500' : 'text-[#4da3ff]'}>
                                  {topic.is_locked ? <Lock className="h-5 w-5" /> : topic.icon}
                                </div>
                              </div>
                              <div className={`rounded-full ${
                                topic.is_locked ? 'bg-gray-800' : selectedTopic?.id === topic.id ? 'bg-blue-500' : 'bg-gray-700'
                              } h-7 w-7 flex items-center justify-center text-xs font-bold`}>
                                {topicLessonPlans[topic.id]?.length || 0}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center mb-1">
                                <h4 className={`font-bold text-lg ${topic.is_locked ? 'text-gray-400' : ''}`}>
                                  {topic.title}
                                </h4>
                                {topic.is_locked && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-700 bg-opacity-30 text-amber-400">(Locked)</span>}
                              </div>
                              
                              <p className="text-xs text-gray-400 mb-3 line-clamp-2 h-8">
                                {topic.description || `Learn about ${topic.title} and related concepts.`}
                              </p>
                              
                              <div className="mt-auto">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-400">Progress</span>
                                  <span className={`font-medium ${topic.is_locked ? 'text-gray-500' : 'text-blue-300'}`}>{topic.progress || 0}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-black bg-opacity-30 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      topic.is_locked 
                                        ? 'bg-gray-700' 
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                    }`}
                                    style={{ width: `${topic.progress || 0}%` }}
                                  ></div>
                                </div>
                                
                                {topic.is_locked && (
                                  <div className="mt-3 text-xs px-3 py-2 rounded-md bg-amber-900 bg-opacity-20 text-amber-400 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span>Complete prerequisite topics to unlock</span>
                                  </div>
                                )}
                                
                                {!topic.is_locked && selectedTopic?.id !== topic.id && (
                                  <div className="mt-3 text-xs text-center invisible group-hover:visible">
                                    <span className="inline-flex items-center text-blue-400">
                                      Select to start learning <ChevronRight className="h-3 w-3 ml-1" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Lesson Plans for Selected Topic */}
                  {selectedTopic && (
                    <div>
                      <h3 className="text-lg font-medium mb-3 text-gray-300 flex items-center">
                        <span>Lessons for {selectedTopic.title}</span>
                        <span className="ml-2 text-sm text-gray-400">({topicLessonPlans[selectedTopic.id]?.length || 0} plans)</span>
                      </h3>
                      
                      {topicLessonPlans[selectedTopic.id]?.length > 0 ? (
                        <div className="max-h-[60vh] overflow-y-auto space-y-6 w-full pl-2">
                          <HierarchicalLessonPlans 
                            plans={topicLessonPlans[selectedTopic.id] || []}
                            onSelectPlan={handleLessonPlanSelect}
                          />
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-white/5 rounded-lg">
                          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                          <p className="text-gray-400">No lesson plans available for this topic yet.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!selectedTopic && (
                    <div className="text-center p-6 bg-white/5 rounded-lg">
                      <ArrowUp className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400">Please select a topic to view its lesson plans.</p>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
          
          {activeTab === 'quiz' && (
            <section className="p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                Knowledge Check Quizzes
              </h2>
              
              {isLoadingQuiz ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Loader className="h-10 w-10 text-[#2E5BFF] animate-spin mb-4" />
                  <p className="text-white">Loading quiz questions...</p>
                </div>
              ) : !selectedTopic ? (
                <div className="bg-white/5 rounded-lg p-8 text-center">
                  <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Select a Topic First</h3>
                  <p className="text-gray-400">Please select a learning topic to generate a quiz.</p>
                  <button
                    onClick={() => setActiveTab('lesson-plans')}
                    className="mt-4 bg-[#2E5BFF] text-white px-4 py-2 rounded-lg hover:bg-[#1E4BEF] transition"
                  >
                    Browse Topics
                  </button>
                </div>
              ) : showQuizAtThreshold && moduleQuizzes.length > 0 ? (
                // Show module quizzes when available at thresholds
                <div className="bg-white/5 rounded-lg p-8">
                  <div className="text-center mb-8">
                    <Award className="h-12 w-12 text-[#2E5BFF] mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Progress Milestone Reached!</h3>
                    <p className="text-gray-400">
                      You've reached a progress milestone. Take this quiz to solidify your knowledge and continue your learning journey.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {moduleQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="bg-white/5 border-white/10 text-white">
                        <CardHeader>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription className="text-gray-400">
                            {quiz.description || `A quiz about ${activeModule?.title || selectedTopic.title}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Difficulty:</span>
                              <span className="text-white">{quiz.difficulty}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Time Limit:</span>
                              <span className="text-white">{quiz.time_limit_minutes} minutes</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Passing Score:</span>
                              <span className="text-white">{quiz.passing_score_percent}%</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                            onClick={() => startModuleQuiz(quiz.id)}
                          >
                            Start Quiz
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : activeQuiz && !quizSubmitted && currentQuestionIndex !== null ? (
                // Showing the active quiz questions (existing code)
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-medium text-white mb-2">{activeQuiz.title}</h3>
                    <p className="text-gray-400">{activeQuiz.description}</p>
                    
                    <div className="flex items-center space-x-4 mt-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-[#2E5BFF] rounded-full"></div>
                        <span className="text-sm text-white">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                      </div>
                      
                      <div className="flex-1 h-1 bg-white/10 rounded-full">
                        <div 
                          className="bg-[#2E5BFF] h-1 rounded-full"
                          style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white/10 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-white mb-4">
                        {activeQuiz.questions[currentQuestionIndex].question}
                      </h4>
                      
                      {activeQuiz.questions[currentQuestionIndex].options.map((option, optionIndex) => (
                        <div 
                          key={optionIndex}
                          className={`p-3 rounded-lg border mb-3 cursor-pointer transition-colors ${
                            selectedOptions[currentQuestionIndex] === optionIndex 
                              ? 'bg-[#2E5BFF]/20 border-[#2E5BFF]' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                          onClick={() => {
                            const newSelectedOptions = [...selectedOptions];
                            newSelectedOptions[currentQuestionIndex] = optionIndex;
                            setSelectedOptions(newSelectedOptions);
                          }}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                              selectedOptions[currentQuestionIndex] === optionIndex 
                                ? 'border-[#2E5BFF] bg-[#2E5BFF]/20' 
                                : 'border-white/30'
                            }`}>
                              {selectedOptions[currentQuestionIndex] === optionIndex && (
                                <div className="w-3 h-3 rounded-full bg-[#2E5BFF]"></div>
                              )}
                            </div>
                            <span className="text-white">{option}</span>
                          </div>
                        </div>
                ))}
              </div>
                    
                    <div className="flex justify-between">
                      <Button
                        className="bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => {
                          if (currentQuestionIndex > 0) {
                            setCurrentQuestionIndex(currentQuestionIndex - 1);
                          }
                        }}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      
                      {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                        <Button
                          className="bg-[#2E5BFF] hover:bg-[#1E4BEF] text-white"
                          onClick={() => {
                            if (currentQuestionIndex < activeQuiz.questions.length - 1) {
                              setCurrentQuestionIndex(currentQuestionIndex + 1);
                            }
                          }}
                          disabled={selectedOptions[currentQuestionIndex] === -1}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => quizAttempt ? submitModuleQuiz() : handleQuizSubmit()}
                          disabled={selectedOptions[currentQuestionIndex] === -1}
                        >
                          Submit Quiz
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeQuiz && quizSubmitted ? (
                // Quiz results (existing code with slight modification)
                <div className="space-y-6">
                  <div className="bg-white/10 rounded-lg p-6 text-center">
                    <div className="mb-4">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                        quizScore >= 80 ? 'bg-green-500' : quizScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <span className="text-2xl font-bold text-white">{quizScore}%</span>
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-medium text-white mb-2">
                      {quizScore >= 80 ? 'Excellent!' : quizScore >= 60 ? 'Good job!' : 'Keep practicing!'}
                    </h4>
                    
                    <p className="text-gray-400 mb-4">
                      {quizAttempt ? (
                        `You answered ${quizAttempt.correct_questions?.length || 0} out of ${activeQuiz.questions.length} questions correctly.`
                      ) : (
                        `You answered ${activeQuiz.questions.filter((_, i) => selectedOptions[i] === activeQuiz.questions[i].correctOption).length} 
                        out of ${activeQuiz.questions.length} questions correctly.`
                      )}
                    </p>
                    
                    <div className="flex justify-center space-x-4">
                      <Button
                        className="bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => {
                          setActiveTab('chat');
                          setShowQuizAtThreshold(false);
                        }}
                      >
                        Return to Chat
                      </Button>
                      
                      <Button
                        className="bg-[#2E5BFF] hover:bg-[#1E4BEF] text-white"
                        onClick={() => {
                          // Reset for a new quiz
                          setActiveQuiz(null);
                          setCurrentQuestionIndex(0); // Replace null with 0
                          setSelectedOptions([]);
                          setQuizSubmitted(false);
                          setQuizScore(0);
                          setQuizAttempt(null);
                          setShowQuizAtThreshold(false);
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show quiz answers and explanations after submission */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-white mb-4">Quiz Review</h4>
                    
                    <div className="space-y-6">
                      {activeQuiz.questions.map((question, qIndex) => (
                        <div key={qIndex} className="bg-white/10 rounded-lg p-4">
                          <h5 className="text-white font-medium mb-2">Question {qIndex + 1}: {question.question}</h5>
                          
                          <div className="space-y-2 mb-3">
                            {question.options.map((option, oIndex) => (
                              <div 
                                key={oIndex}
                                className={`p-2 rounded-lg border ${
                                  // For AI-generated quizzes
                                  (quizAttempt === null && oIndex === question.correctOption) ? 'bg-green-500/20 border-green-500' :
                                  (quizAttempt === null && selectedOptions[qIndex] === oIndex && oIndex !== question.correctOption) ? 'bg-red-500/20 border-red-500' :
                                  
                                  // For module quizzes
                                  (quizAttempt && quizAttempt.correct_questions?.includes(question.id) && selectedOptions[qIndex] === oIndex) ? 'bg-green-500/20 border-green-500' :
                                  (quizAttempt && !quizAttempt.correct_questions?.includes(question.id) && selectedOptions[qIndex] === oIndex) ? 'bg-red-500/20 border-red-500' :
                                  
                                  'bg-white/5 border-white/10'
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="text-white">{option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {question.explanation && (
                            <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-3">
                              <h6 className="text-blue-400 font-medium text-sm mb-1">Explanation:</h6>
                              <p className="text-white text-sm">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Default quiz generator UI
                <div className="bg-white/5 rounded-lg p-8">
                  <div className="text-center mb-8">
                    <Lightbulb className="h-12 w-12 text-[#2E5BFF] mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Test Your Knowledge</h3>
                    <p className="text-gray-400">Generate a quiz to test your understanding of {selectedTopic.title}.</p>
                  </div>
                  
                  {/* Add this analysis button */}
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={getQuizAnalysis}
                      className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-2"
                      disabled={isLoadingAnalysis}
                    >
                      {isLoadingAnalysis ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <PieChart className="h-4 w-4" />
                      )}
                      Analyze Quiz Performance
                    </Button>
                  </div>
                  
                  {/* Show analysis results if available */}
                  {quizAnalysis && quizAnalysis.status === 'success' && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                      <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                        <PieChart className="h-5 w-5 text-[#2E5BFF]" />
                        Quiz Performance Analysis
                      </h4>
                      
                      <div className="text-sm text-gray-300 space-y-3">
                        <p className="bg-white/5 p-3 rounded">
                          {quizAnalysis.feedback}
                        </p>
                        
                        {quizAnalysis.analysis.strengths.length > 0 && (
                          <div>
                            <h5 className="text-green-400 font-medium mb-1">Strengths:</h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {quizAnalysis.analysis.strengths.map((strength: any, i: number) => (
                                <li key={i}>
                                  {strength.type === 'topic' 
                                    ? `${strength.topic}: ${strength.percentage}%` 
                                    : `${strength.module} in ${strength.topic}: ${strength.percentage}%`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {quizAnalysis.analysis.weaknesses.length > 0 && (
                          <div>
                            <h5 className="text-amber-400 font-medium mb-1">Areas to Improve:</h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {quizAnalysis.analysis.weaknesses.map((weakness: any, i: number) => (
                                <li key={i}>
                                  {weakness.type === 'topic' 
                                    ? `${weakness.topic}: ${weakness.percentage}%` 
                                    : `${weakness.module} in ${weakness.topic}: ${weakness.percentage}%`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/10 text-white">
                      <CardHeader>
                        <CardTitle className="text-lg">{selectedTopic.title} Quiz</CardTitle>
                        <CardDescription className="text-gray-400">
                          Multiple choice questions to test your understanding
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-300 mb-4">
                          This quiz will help you assess your knowledge and contribute to your learning progress. 
                          Quiz performance accounts for 30% of your total progress.
                        </p>
                        <ul className="text-sm space-y-2 text-gray-300">
                          <li className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            5 multiple choice questions
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Detailed explanations for each answer
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Instant results and feedback
                          </li>
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                          onClick={() => generateQuizForTopic(selectedTopic.id, selectedTopic.title)}
                        >
                          Start Quiz
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {activeModule && (
                      <Card className="bg-white/5 border-white/10 text-white">
                        <CardHeader>
                          <CardTitle className="text-lg">Module Quizzes</CardTitle>
                          <CardDescription className="text-gray-400">
                            Complete structured quizzes for the current module
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-300 mb-4">
                            Module quizzes are designed by instructors to test specific learning objectives.
                            These quizzes help assess your understanding of key concepts.
                          </p>
                          <Button 
                            className="w-full bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                            onClick={async () => {
                              try {
                                setIsLoadingQuiz(true);
                                const response = await axios.get(`${API_URL}/modules/${activeModule.id}/quizzes`);
                                if (response.data.quizzes && response.data.quizzes.length > 0) {
                                  setModuleQuizzes(response.data.quizzes);
                                  setShowQuizAtThreshold(true);
                                } else {
                                  toast.info("No quizzes available for this module yet.");
                                }
                              } catch (error) {
                                console.error("Error loading module quizzes:", error);
                                toast.error("Failed to load module quizzes.");
                              } finally {
                                setIsLoadingQuiz(false);
                              }
                            }}
                          >
                            Browse Module Quizzes
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
          
          {activeTab === 'sessions' && (
            <section className="p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                Previous Sessions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
                {previousSessions.map((session) => (
                  <motion.div
                    key={session.id}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSessionSelect(session)}
                    className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{session.topic}</p>
                        <p className="text-sm text-gray-400">{session.date} • {session.duration}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
          
          {activeTab === 'settings' && (
            <section className="p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                AI Tutor Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2">Response Length</label>
                  <select 
                    value={tutorPreferences.responseLength}
                    onChange={(e) => handlePreferenceChange('responseLength', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                    style={{ color: 'white', backgroundColor: '#1a2e42' }}
                  >
                    <option value="brief" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Brief</option>
                    <option value="medium" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Medium</option>
                    <option value="detailed" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Detailed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Include Code Examples</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreferenceChange('codeExamples', true)}
                      className={`px-3 py-1 rounded-lg ${
                        tutorPreferences.codeExamples 
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handlePreferenceChange('codeExamples', false)}
                      className={`px-3 py-1 rounded-lg ${
                        !tutorPreferences.codeExamples 
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Explanation Detail</label>
                  <select 
                    value={tutorPreferences.explanationDetail}
                    onChange={(e) => handlePreferenceChange('explanationDetail', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                    style={{ color: 'white', backgroundColor: '#1a2e42' }}
                  >
                    <option value="basic" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Basic</option>
                    <option value="moderate" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Moderate</option>
                    <option value="detailed" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Detailed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Challenge Difficulty</label>
                  <select 
                    value={tutorPreferences.challengeDifficulty}
                    onChange={(e) => handlePreferenceChange('challengeDifficulty', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                    style={{ color: 'white', backgroundColor: '#1a2e42' }}
                  >
                    <option value="easy" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Easy</option>
                    <option value="medium" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Medium</option>
                    <option value="hard" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Hard</option>
                  </select>
                </div>
              </div>
              
              {/* Code Editor Settings */}
              <h2 className="text-xl font-semibold mt-6 mb-4 flex items-center">
                <Code className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                Code Editor Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Editor Theme</label>
                  <select 
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                    style={{ color: 'white', backgroundColor: '#1a2e42' }}
                  >
                    <option value="vs-dark" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Dark Theme</option>
                    <option value="vs-light" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Light Theme</option>
                    <option value="hc-black" style={{ color: 'white', backgroundColor: '#1a2e42' }}>High Contrast</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <div className="flex items-center">
                    <input 
                      type="range" 
                      min="12" 
                      max="24" 
                      value={editorOptions.fontSize}
                      onChange={(e) => updateEditorSettings('fontSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="ml-2 w-8 text-center">{editorOptions.fontSize}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Show Minimap</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateEditorSettings('minimap', { enabled: true })}
                      className={`px-3 py-1 rounded-lg ${
                        editorOptions.minimap.enabled 
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => updateEditorSettings('minimap', { enabled: false })}
                      className={`px-3 py-1 rounded-lg ${
                        !editorOptions.minimap.enabled 
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Auto Format</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        updateEditorSettings('formatOnPaste', true);
                        updateEditorSettings('formatOnType', true);
                      }}
                      className={`px-3 py-1 rounded-lg ${
                        editorOptions.formatOnPaste && editorOptions.formatOnType
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      On
                    </button>
                    <button
                      onClick={() => {
                        updateEditorSettings('formatOnPaste', false);
                        updateEditorSettings('formatOnType', false);
                      }}
                      className={`px-3 py-1 rounded-lg ${
                        !editorOptions.formatOnPaste && !editorOptions.formatOnType
                          ? 'bg-[#2E5BFF] text-white' 
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <div className="bg-[#1a2e42]/50 p-4 rounded-lg">
                    <h4 className="text-md font-medium mb-2 flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2 text-[#2E5BFF]" />
                      Editor Keyboard Shortcuts
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-300">
                      <li><span className="text-white font-mono">Alt+Shift+F</span> - Format document</li>
                      <li><span className="text-white font-mono">Ctrl+Space</span> - Trigger suggestions</li>
                      <li><span className="text-white font-mono">F11</span> - Toggle fullscreen</li>
                      <li><span className="text-white font-mono">Ctrl+/</span> - Toggle line comment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoloRoomPage; 