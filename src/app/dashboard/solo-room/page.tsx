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
import { getTutorResponse, executeJavaCode, getTopics, getTopicHierarchy, updateProgress, getUserProgress, getTopicProgress, getLessonPlanDetails, getLessonModules, getLessonPlans, analyzeQuizResults, executeJavaProject } from '@/services/api';
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
import ProjectIntegration from '@/components/ProjectIntegration';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: Date;
  code?: string;  // Optional code snippet that might be included in the message
}

interface ProjectFile {
  id: string;
  name: string;
  content: string;
  path: string;
  language: string;
  isDirectory?: boolean;
  children?: ProjectFile[];
}

interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  rootDirectory: ProjectFile;
  mainFile: string; // ID of the main file to run
  isNewUnsavedProject?: boolean;
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

// Add this function after the interface definitions and before the SoloRoomPage component
const parseMessageWithCodeBlocks = (text: string) => {
  if (!text) return { text: '', code: undefined };
  
  // Check if the message contains code blocks
  const codeBlockRegex = /```(java|javascript|python|html|css|json)?\s*\n([\s\S]*?)\n```/g;
  let match;
  let result = text;
  let codeBlocks: Array<{language: string, code: string}> = [];
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'java';
    const code = match[2];
    codeBlocks.push({ language, code });
    // Replace the code block with a placeholder
    result = result.replace(match[0], `[CODE_BLOCK_${codeBlocks.length - 1}]`);
  }
  
  // If we found code blocks, return both text and the first code block
  if (codeBlocks.length > 0) {
    // Replace placeholders with cleaner text
    codeBlocks.forEach((block, index) => {
      result = result.replace(`[CODE_BLOCK_${index}]`, `[Code snippet: ${block.language}]`);
    });
    
    return {
      text: result,
      code: codeBlocks[0].code // Return the first code block
    };
  }
  
  // No code blocks found
  return { text: result, code: undefined };
};

const SoloRoomPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'lesson-plans' | 'sessions' | 'quiz'>('chat');
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
  
  // Project-based learning state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileParentPath, setNewFileParentPath] = useState('');
  const [isCreatingDirectory, setIsCreatingDirectory] = useState(false);
  
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
    
    // Initialize a default project for project-based learning
    const defaultProject = createNewProject("Java Project", "Main");
    setCurrentProject(defaultProject);
    setProjectFiles(defaultProject.files);
    setActiveFileId(defaultProject.mainFile);
    setOpenFileTabs([defaultProject.mainFile]);
    
    // Initialize the code input with the content from the main file
    const mainFile = defaultProject.files.find(file => file.id === defaultProject.mainFile);
    if (mainFile) {
      setCodeInput(mainFile.content);
    }
  }, []);
  
  // Update the active file content when the code editor value changes
  useEffect(() => {
    if (activeFileId && currentProject) {
      setCurrentProject(prevProject => {
        if (!prevProject) return null;
        return updateFileInProject(prevProject, activeFileId, codeInput);
      });
    }
  }, [codeInput, activeFileId]);
  
  // Set code input when switching files
  useEffect(() => {
    if (activeFileId && currentProject) {
      const activeFile = findFileById(activeFileId, currentProject.files);
      if (activeFile) {
        setCodeInput(activeFile.content);
        // Update editor language based on file type
        if (activeFile.language) {
          setEditorLanguage(activeFile.language);
        }
      }
    }
  }, [activeFileId, currentProject]);
  
  // Functions for project management
  const handleFileSelect = (fileId: string) => {
    if (currentProject) {
      const file = findFileById(fileId, currentProject.files);
      if (file && !file.isDirectory) {
        setActiveFileId(fileId);
        if (!openFileTabs.includes(fileId)) {
          setOpenFileTabs([...openFileTabs, fileId]);
        }
      }
    }
  };
  
  const handleTabClose = (fileId: string) => {
    const newTabs = openFileTabs.filter(id => id !== fileId);
    setOpenFileTabs(newTabs);
    
    // If we closed the active file, activate another open file
    if (activeFileId === fileId && newTabs.length > 0) {
      setActiveFileId(newTabs[newTabs.length - 1]);
    } else if (newTabs.length === 0 && currentProject) {
      // If no tabs left, activate the main file
      setActiveFileId(currentProject.mainFile);
      setOpenFileTabs([currentProject.mainFile]);
    }
  };
  
  const handleCreateNewFile = () => {
    if (!currentProject) return;
    
    const newFile = createFile(newFileParentPath, newFileName, isCreatingDirectory);
    const updatedProject = addFileToProject(currentProject, newFile, newFileParentPath);
    
    setCurrentProject(updatedProject);
    setProjectFiles(updatedProject.files);
    
    // Select the new file if it's not a directory
    if (!isCreatingDirectory) {
      handleFileSelect(newFile.id);
    }
    
    // Reset the dialog
    setShowNewFileDialog(false);
    setNewFileName('');
    setNewFileParentPath('/');
    setIsCreatingDirectory(false);
  };
  
  const handleDeleteFile = (fileId: string) => {
    if (!currentProject) return;
    
    // Prevent deleting the main file
    if (fileId === currentProject.mainFile) {
      toast.error("Cannot delete the main file of the project");
      return;
    }
    
    const updatedProject = deleteFileFromProject(currentProject, fileId);
    setCurrentProject(updatedProject);
    setProjectFiles(updatedProject.files);
    
    // Remove from open tabs if needed
    if (openFileTabs.includes(fileId)) {
      handleTabClose(fileId);
    }
  };
  
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
      // Ensure preferences is a valid object
      const safePreferences = {
        responseLength: tutorPreferences?.responseLength || 'medium',
        codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
        explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
        challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
      };
      
      const response = await getTutorResponse({
        question: `Generate a short quiz with 3 multiple-choice questions covering the key concepts of ${selectedTopic?.title}. Format it clearly with questions and answer choices.`,
        conversationHistory: [],
        preferences: safePreferences,
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
      // Format conversation history for the AI API
      // Only take the last 10 messages to avoid too large requests
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant', // Consistent mapping
          content: msg.text || '' // Ensure content is never null or undefined
        }))
        .filter(msg => msg.content.trim() !== ''); // Filter out empty messages

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

      // Ensure preferences is a valid object
      const safePreferences = {
        responseLength: tutorPreferences?.responseLength || 'medium',
        codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
        explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
        challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
      };

      // Get response from AI tutor with lesson context
      const response = await getTutorResponse({
        question: inputMessage,
        conversationHistory,
        preferences: safePreferences,
        topic: selectedTopic?.title,
        topic_id: selectedTopic?.id,
        session_id: currentSessionId !== null ? currentSessionId : undefined,
        lesson_context: lessonContext // Add lesson context
      });

      // Check if we got an error or fallback response
      const isError = response.error === true;
      const isFallback = response.is_fallback === true || response.fallback === true;
      
      // Parse the response to extract any code blocks
      const responseText = isError || isFallback
        ? response.response || "Sorry, I'm having trouble connecting to the AI service. Please try again later."
        : response.response || "I'm sorry, I don't have a response for that.";
      
      const parsedResponse = parseMessageWithCodeBlocks(responseText);
      
      // Add AI's response to the chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: parsedResponse.text,
        code: parsedResponse.code,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Only attempt to update progress or session if it wasn't an error or fallback response
      if (!isError && !isFallback) {
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
    
    // Only load messages and fetch tutor response if we're in the chat tab
    if (activeTab === 'chat') {
      setMessages([]);
      // Use the existing topic selection flow
      const fetchTutorResponse = async () => {
        setIsLoading(true);
        try {
          // Ensure preferences is a valid object
          const safePreferences = {
            responseLength: tutorPreferences?.responseLength || 'medium',
            codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
            explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
            challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
          };
          
          const response = await getTutorResponse({
            question: `I'd like to learn about ${topic.title}. Please provide a brief introduction.`,
            conversationHistory: [],
            preferences: safePreferences,
            topic: topic.title,
            topic_id: topic.id
          });

          // Check if we got an error or fallback response
          const isError = response.error === true;
          const isFallback = response.is_fallback === true || response.fallback === true;

          // Add welcome message
          const welcomeMessage: Message = {
            id: Date.now(),
            text: isError || isFallback
              ? response.response || `Welcome to the ${topic.title} topic! (Note: AI services are currently experiencing issues.)`
              : response.response || `Welcome to the ${topic.title} topic!`,
            sender: 'ai',
            timestamp: new Date(),
          };
          
          setMessages([welcomeMessage]);
          
          // Only update session if it wasn't an error or fallback
          if (!isError && !isFallback && response.session_id) {
            setCurrentSessionId(response.session_id);
          }
        } catch (error) {
          console.error("Error getting tutor response:", error);
          // Add a fallback welcome message
          const fallbackMessage: Message = {
            id: Date.now(),
            text: `Welcome to the ${topic.title} topic! I'm experiencing some technical difficulties right now, but feel free to ask questions.`,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages([fallbackMessage]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTutorResponse();
    }
  };
  
  const handleSessionSelect = async (session: Session) => {
    setActiveTab('chat');
    setIsLoading(true);
    
    try {
      // Ensure preferences is a valid object
      const safePreferences = {
        responseLength: tutorPreferences?.responseLength || 'medium',
        codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
        explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
        challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
      };
      
      // Get response from AI tutor about the selected session
      console.log('Requesting session resumption:', {
        question: `I want to continue our previous session on ${session.topic}`,
        conversationHistory: [],
        preferences: safePreferences,
        topic: session.topic,
        topic_id: topics.find(t => t.title === session.topic)?.id, // Look up topic ID
        session_id: session.id
      });

      const response = await getTutorResponse({
        question: `I want to continue our previous session on ${session.topic}`,
        conversationHistory: [], // Empty array for new session
        preferences: safePreferences,
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
    if (!currentProject) {
      toast.error('No active project');
      return;
    }
    
    // For running we need to gather all files that need to be compiled
    const filesToCompile = currentProject.files
      .filter(file => file.language === 'java' && !file.isDirectory)
      .map(file => ({
        path: file.path,
        content: file.content
      }));
    
    // If no Java files found, display error
    if (filesToCompile.length === 0) {
      toast.error('No Java files found in the project');
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
      
      // Get the main file to run
      const mainFile = findFileById(currentProject.mainFile, currentProject.files);
      if (!mainFile) {
        throw new Error('Main file not found');
      }
      
      // Extract the class name from the main file path for execution
      const mainClass = mainFile.path.split('/').pop()?.replace('.java', '') || 'Main';
      
      // Use the new multi-file project execution API
      const result = await executeJavaProject({
        files: filesToCompile,
        main_class: mainClass,
        input: '',
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
      const codeComplexity = calculateCodeComplexity(mainFile.content);
      
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
            code: mainFile.content
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
  
  // Project management utility functions
  const generateUniqueId = () => {
    return 'temp_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  };
  
  const createNewProject = (projectName: string, mainClassName: string = "Main") => {
    // Create a basic Java project structure
    const mainFileId = generateUniqueId();
    const srcDirId = generateUniqueId();
    
    // Create main Java file with default content
    const mainFile: ProjectFile = {
      id: mainFileId,
      name: `${mainClassName}.java`,
      content: `public class ${mainClassName} {\n    public static void main(String[] args) {\n        // Your code here\n        System.out.println("Hello, Java!");\n    }\n}`,
      path: `/src/${mainClassName}.java`,
      language: 'java'
    };
    
    // Create src directory
    const srcDir: ProjectFile = {
      id: srcDirId,
      name: 'src',
      content: '',
      path: '/src',
      isDirectory: true,
      language: '',
      children: [mainFile]
    };
    
    // Create root directory
    const rootDir: ProjectFile = {
      id: generateUniqueId(),
      name: projectName,
      content: '',
      path: '/',
      isDirectory: true,
      language: '',
      children: [srcDir]
    };
    
    // Flatten the file structure for easier access
    const flattenedFiles = flattenFileStructure(rootDir);
    
    // Create the project object
    const newProject: Project = {
      id: generateUniqueId(),
      name: projectName,
      files: flattenedFiles,
      rootDirectory: rootDir,
      mainFile: mainFileId,
      isNewUnsavedProject: true
    };
    
    return newProject;
  };
  
  const flattenFileStructure = (rootDir: ProjectFile): ProjectFile[] => {
    const result: ProjectFile[] = [rootDir];
    
    const traverse = (file: ProjectFile) => {
      if (file.isDirectory && file.children) {
        file.children.forEach(child => {
          result.push(child);
          if (child.isDirectory) {
            traverse(child);
          }
        });
      }
    };
    
    traverse(rootDir);
    return result;
  };
  
  const findFileById = (fileId: string, files: ProjectFile[]): ProjectFile | null => {
    return files.find(file => file.id === fileId) || null;
  };
  
  const findFileByPath = (path: string, files: ProjectFile[]): ProjectFile | null => {
    return files.find(file => file.path === path) || null;
  };
  
  const createFile = (parentPath: string, fileName: string, isDirectory: boolean = false): ProjectFile => {
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    let language = '';
    
    // Determine language based on file extension
    if (fileExtension === 'java') language = 'java';
    else if (fileExtension === 'txt') language = 'plaintext';
    else if (fileExtension === 'md') language = 'markdown';
    else if (fileExtension === 'json') language = 'json';
    else if (fileExtension === 'xml') language = 'xml';
    else if (fileExtension === 'properties') language = 'properties';
    
    const newPath = parentPath === '/' 
      ? `/${fileName}` 
      : `${parentPath}/${fileName}`;
    
    return {
      id: generateUniqueId(),
      name: fileName,
      content: isDirectory ? '' : getTemplateForFile(fileName),
      path: newPath,
      isDirectory,
      language,
      children: isDirectory ? [] : undefined
    };
  };
  
  const getTemplateForFile = (fileName: string): string => {
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    const className = fileName.includes('.') ? fileName.split('.')[0] : fileName;
    
    switch (fileExtension) {
      case 'java':
        return `public class ${className} {\n    // TODO: Add your code here\n}`;
      case 'txt':
        return '';
      case 'md':
        return `# ${className}\n\n## Description\n\nAdd your description here.\n`;
      case 'json':
        return '{\n    \n}';
      case 'xml':
        return '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n    \n</root>';
      default:
        return '';
    }
  };
  
  const addFileToProject = (project: Project, newFile: ProjectFile, parentPath: string): Project => {
    const updatedFiles = [...project.files];
    
    // Find the parent directory
    const parentDir = findFileByPath(parentPath, updatedFiles);
    
    if (parentDir && parentDir.isDirectory) {
      // Add to parent's children
      parentDir.children = [...(parentDir.children || []), newFile];
      
      // Add to flattened files
      updatedFiles.push(newFile);
      
      return {
        ...project,
        files: updatedFiles
      };
    }
    
    return project;
  };
  
  const updateFileInProject = (project: Project, fileId: string, content: string): Project => {
    const updatedFiles = project.files.map(file => 
      file.id === fileId ? { ...file, content } : file
    );
    
    return {
      ...project,
      files: updatedFiles
    };
  };
  
  const deleteFileFromProject = (project: Project, fileId: string): Project => {
    const fileToDelete = findFileById(fileId, project.files);
    
    if (!fileToDelete) return project;
    
    // Find the parent directory
    const parentPath = fileToDelete.path.substring(0, fileToDelete.path.lastIndexOf('/'));
    const parentDir = findFileByPath(parentPath, project.files);
    
    const updatedFiles = project.files.filter(file => {
      // Remove this file and all children if it's a directory
      if (fileToDelete.isDirectory) {
        return !file.path.startsWith(fileToDelete.path);
      }
      // Just remove this file
      return file.id !== fileId;
    });
    
    // Update the parent's children
    if (parentDir && parentDir.children) {
      parentDir.children = parentDir.children.filter(child => child.id !== fileId);
    }
    
    return {
      ...project,
      files: updatedFiles
    };
  };
  
  const renameFileInProject = (project: Project, fileId: string, newName: string): Project => {
    const fileToRename = findFileById(fileId, project.files);
    
    if (!fileToRename) return project;
    
    const oldPath = fileToRename.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${parentPath}/${newName}`;
    
    // Update the file's path and name
    const updatedFiles = project.files.map(file => {
      if (file.id === fileId) {
        return {
          ...file,
          name: newName,
          path: newPath
        };
      }
      
      // Update paths of all children if this is a directory
      if (fileToRename.isDirectory && file.path.startsWith(oldPath + '/')) {
        const relativePath = file.path.substring(oldPath.length);
        return {
          ...file,
          path: newPath + relativePath
        };
      }
      
      return file;
    });
    
    return {
      ...project,
      files: updatedFiles
    };
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
    
    // Ensure we switch to the chat tab when selecting a lesson plan
    setActiveTab('chat');
    
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
      
      // Get details about the lesson plan
      const lessonPlanDetails = await getLessonPlanDetails(lessonPlan.id);
      console.log("Lesson plan details:", lessonPlanDetails);
      
      // Get response from AI tutor about the selected lesson plan
      const response = await getTutorResponse({
        question: `I'd like to learn about ${lessonPlan.title}. This is a lesson plan for ${lessonPlan.topic_title || 'a programming topic'}. Please provide a brief introduction to this lesson plan and what I'll be learning.`,
        conversationHistory: [], // Empty array for new conversation
        preferences: {
          responseLength: tutorPreferences?.responseLength || 'medium',
          codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
          explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
          challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
        },
        topic: lessonPlan.topic_title || '',
        topic_id: lessonPlan.topic_id
      });

      // Check if we got an error or fallback response
      const isError = response.error === true;
      const isFallback = response.is_fallback === true || response.fallback === true;

      // Clear previous messages and add welcome message
      const welcomeMessage: Message = {
        id: Date.now(),
        text: isError || isFallback
          ? response.response || `Welcome to the ${lessonPlan.title} lesson plan! (Note: AI services are currently experiencing issues.)`
          : response.response || `Welcome to the ${lessonPlan.title} lesson plan!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // If the response includes a session ID and it's not an error or fallback, set it
      if (!isError && !isFallback && response.session_id) {
        setCurrentSessionId(response.session_id);
      }
    } catch (error) {
      console.error("Error selecting lesson plan:", error);
      setMessages([
        {
          id: Date.now(),
          text: `Welcome to the ${lessonPlan.title} lesson plan! I'm experiencing some technical difficulties right now, but feel free to explore the content.`,
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
          responseLength: 'detailed',
          codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
          explanationDetail: 'detailed',
          challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
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
            responseLength: 'medium',
            codeExamples: tutorPreferences?.codeExamples !== undefined ? tutorPreferences.codeExamples : true,
            explanationDetail: tutorPreferences?.explanationDetail || 'detailed',
            challengeDifficulty: tutorPreferences?.challengeDifficulty || 'medium'
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

  // Add the FileExplorer component
  interface FileExplorerProps {
    project: Project | null;
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    onCreateNewFile: () => void;
    onDeleteFile: (fileId: string) => void;
    setNewFileName: (name: string) => void;
    setNewFileParentPath: (path: string) => void;
    setShowNewFileDialog: (show: boolean) => void;
    setIsCreatingDirectory: (isDir: boolean) => void;
  }

  const FileExplorer: React.FC<FileExplorerProps> = ({
    project,
    activeFileId,
    onFileSelect,
    onCreateNewFile,
    onDeleteFile,
    setNewFileName,
    setNewFileParentPath,
    setShowNewFileDialog,
    setIsCreatingDirectory
  }) => {
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));
    
    if (!project) return null;
    
    const handleToggleDirectory = (dirId: string) => {
      const newExpandedDirs = new Set(expandedDirs);
      if (newExpandedDirs.has(dirId)) {
        newExpandedDirs.delete(dirId);
      } else {
        newExpandedDirs.add(dirId);
      }
      setExpandedDirs(newExpandedDirs);
    };
    
    const getFileIcon = (file: ProjectFile) => {
      if (file.isDirectory) {
        return <FolderOpen className="h-4 w-4 text-yellow-500" />;
      }
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'java':
          return <FileCode className="h-4 w-4 text-orange-500" />;
        case 'txt':
          return <AlignLeft className="h-4 w-4 text-gray-400" />;
        case 'md':
          return <ScrollText className="h-4 w-4 text-blue-400" />;
        case 'json':
          return <Brackets className="h-4 w-4 text-green-400" />;
        case 'xml':
          return <Code className="h-4 w-4 text-purple-400" />;
        default:
          return <FileCode className="h-4 w-4 text-gray-400" />;
      }
    };
    
    const renderFileTree = (file: ProjectFile, level = 0) => {
      const isExpanded = expandedDirs.has(file.id);
      const isActive = activeFileId === file.id;
      const isMainFile = project.mainFile === file.id;
      
      return (
        <div key={file.id} className="select-none">
          <div 
            className={`flex items-center py-1 px-2 rounded-md cursor-pointer text-sm ${
              isActive ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => file.isDirectory ? handleToggleDirectory(file.id) : onFileSelect(file.id)}
          >
            <div className="flex items-center flex-1 overflow-hidden">
              {file.isDirectory && (
                <div className="mr-1">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </div>
              )}
              <span className="mr-2">{getFileIcon(file)}</span>
              <span className="truncate">
                {file.name}
                {isMainFile && <span className="ml-1 text-xs text-blue-400">(main)</span>}
              </span>
            </div>
            
            {!file.isDirectory && !isMainFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-500"
                title="Delete file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {file.isDirectory && isExpanded && file.children && (
            <div>
              {file.children.map(child => renderFileTree(child, level + 1))}
            </div>
          )}
        </div>
      );
    };
    
    const handleNewFile = (isDirectory: boolean, parentPath: string = '/') => {
      setIsCreatingDirectory(isDirectory);
      setNewFileParentPath(parentPath);
      setNewFileName('');
      setShowNewFileDialog(true);
    };
    
    return (
      <div className="bg-white/5 rounded-lg p-3 h-full">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
          <h3 className="text-sm font-medium flex items-center">
            <Layers className="h-4 w-4 mr-1.5 text-[#2E5BFF]" />
            Project Files
          </h3>
          <div className="flex">
            <button
              onClick={() => handleNewFile(false, '/')}
              className="p-1 rounded hover:bg-white/10 text-blue-400 mr-1"
              title="New File"
            >
              <FileCode className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleNewFile(true, '/')}
              className="p-1 rounded hover:bg-white/10 text-yellow-400"
              title="New Folder"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {renderFileTree(project.rootDirectory)}
        </div>
      </div>
    );
  };

  // Add the FileTabs component
  interface FileTabsProps {
    project: Project | null;
    openFileTabs: string[];
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    onTabClose: (fileId: string) => void;
  }

  const FileTabs: React.FC<FileTabsProps> = ({
    project,
    openFileTabs,
    activeFileId,
    onFileSelect,
    onTabClose
  }) => {
    if (!project) return null;
    
    return (
      <div className="flex space-x-1 overflow-x-auto bg-[#1a1a1a] text-sm no-scrollbar border-b border-white/10">
        {openFileTabs.map(fileId => {
          const file = project.files.find(f => f.id === fileId);
          if (!file) return null;
          
          const isActive = activeFileId === fileId;
          
          return (
            <div 
              key={fileId}
              className={`flex items-center py-1.5 px-3 cursor-pointer group ${
                isActive 
                  ? 'bg-[#2a2a2a] text-white' 
                  : 'text-gray-400 hover:bg-[#252525]'
              }`}
              onClick={() => onFileSelect(fileId)}
            >
              <div className="flex items-center">
                {file.name === 'Main.java' ? (
                  <FileCode className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                ) : file.name.endsWith('.java') ? (
                  <FileCode className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                ) : (
                  <FileCode className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                )}
                <span>{file.name}</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(fileId);
                }}
                className="ml-2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Add the NewFileDialog component
  interface NewFileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: () => void;
    fileName: string;
    setFileName: (name: string) => void;
    isDirectory: boolean;
  }

  const NewFileDialog: React.FC<NewFileDialogProps> = ({
    isOpen,
    onClose,
    onCreate,
    fileName,
    setFileName,
    isDirectory
  }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a2e42] rounded-lg p-4 w-80">
          <h3 className="text-lg font-medium mb-4">
            Create New {isDirectory ? 'Folder' : 'File'}
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              {isDirectory ? 'Folder Name' : 'File Name'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
              placeholder={isDirectory ? 'New Folder' : 'NewFile.java'}
              autoFocus
            />
            
            {!isDirectory && !fileName.includes('.') && (
              <p className="text-xs text-amber-400 mt-1">
                Tip: Include a file extension (e.g. .java)
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-gray-300 hover:bg-white/10 rounded"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={!fileName.trim()}
              className={`px-3 py-1 rounded ${
                fileName.trim() 
                  ? 'bg-[#2E5BFF] text-white' 
                  : 'bg-[#2E5BFF]/50 text-white/70 cursor-not-allowed'
              }`}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Debug functions for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add the test function to the window object for debugging
      (window as any).testCreateProject = async () => {
        try {
          const { createTestProject } = await import('@/services/api');
          const result = await createTestProject();
          console.log('Test project creation result:', result);
          return result;
        } catch (error) {
          console.error('Error in test project creation:', error);
        }
      };
    }
  }, []);

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
            <TabsList className="grid grid-cols-4 bg-transparent w-full relative overflow-visible">
              {/* Animated Background Indicator */}
              <motion.div 
                className="absolute h-full bg-white/5 rounded-md top-0 z-0"
                style={{ 
                  width: '25%',
                  left: activeTab === 'chat' ? '0%' : 
                       activeTab === 'lesson-plans' ? '25%' : 
                       activeTab === 'quiz' ? '50%' : 
                       activeTab === 'sessions' ? '75%' : '0%'
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
                          <p className="text-sm whitespace-pre-wrap break-words" 
                             style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            {message.text.split('\n').map((line, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <br />}
                                {line}
                              </React.Fragment>
                            ))}
                          </p>
                          
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
              
              {/* Code Editor Section - Updated with multi-file project support */}
              <section className="p-4">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  Project-Based Code Editor
                </h2>
                
                {/* Add the ProjectIntegration component here */}
                <div className="mb-4">
                  <ProjectIntegration
                    currentProject={currentProject}
                    setCurrentProject={setCurrentProject}
                    setProjectFiles={setProjectFiles}
                    setActiveFileId={setActiveFileId}
                    setOpenFileTabs={setOpenFileTabs}
                  />
                        </div>
                
                <div className="flex gap-4">
                  {/* File explorer */}
                  {isFileExplorerOpen && currentProject && (
                    <div className="w-64 bg-white/5 rounded-lg p-3 h-[calc(70vh)]">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                        <h3 className="text-sm font-medium flex items-center">
                          <Layers className="h-4 w-4 mr-1.5 text-[#2E5BFF]" />
                          Project Files
                        </h3>
                        <div className="flex space-x-1">
                    <button
                            onClick={() => {
                              setNewFileParentPath("/");
                              setNewFileName("");
                              setIsCreatingDirectory(false);
                              setShowNewFileDialog(true);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-blue-400"
                            title="New File"
                          >
                            <FileCode className="h-3.5 w-3.5" />
                    </button>
                    <button
                            onClick={() => {
                              setNewFileParentPath("/");
                              setNewFileName("");
                              setIsCreatingDirectory(true);
                              setShowNewFileDialog(true);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-yellow-400"
                            title="New Folder"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                      
                      <div className="space-y-1 max-h-[calc(70vh-60px)] overflow-y-auto">
                        {currentProject.files.map(file => {
                          if (file.path === "/") return null; // Skip root

                          // Only show top-level files and directories
                          if (file.path.split("/").filter(p => p).length === 1) {
                            return (
                              <div 
                                key={file.id}
                                className={`flex items-center py-1 px-2 rounded-md cursor-pointer text-sm ${
                                  activeFileId === file.id ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'
                                }`}
                                onClick={() => {
                                  if (file.isDirectory) {
                                    // Toggle directory expansion logic would go here
                                  } else {
                                    handleFileSelect(file.id);
                                  }
                                }}
                              >
                                <div className="flex items-center flex-1 overflow-hidden">
                                  <span className="mr-2">
                                    {file.isDirectory ? (
                                      <FolderOpen className="h-4 w-4 text-yellow-500" />
                                    ) : file.name.endsWith('.java') ? (
                                      <FileCode className="h-4 w-4 text-orange-500" />
                                    ) : (
                                      <FileCode className="h-4 w-4 text-gray-400" />
                                    )}
                                    </span>
                                  <span className="truncate">
                                    {file.name}
                                    {currentProject.mainFile === file.id && (
                                      <span className="ml-1 text-xs text-blue-400">(main)</span>
                                    )}
                                  </span>
                  </div>
                  
                                {!file.isDirectory && currentProject.mainFile !== file.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(file.id);
                                    }}
                                    className="opacity-0 hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-500"
                                    title="Delete file"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                        </div>
                            );
                          }
                          return null;
                        })}
                        </div>
                    </div>
                  )}
                  
                  {/* Editor area */}
                  <div className={`flex-1 bg-white/5 rounded-lg p-4 overflow-hidden flex flex-col`}>
                    {/* Editor controls */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
                          className="bg-white/10 text-gray-300 px-2 py-1 rounded text-sm flex items-center space-x-1 hover:bg-white/20 transition"
                          title={isFileExplorerOpen ? "Hide file explorer" : "Show file explorer"}
                        >
                          {isFileExplorerOpen ? (
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 mr-1" />
                          )}
                          <span>Files</span>
                        </button>
                      
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
                    
                    {/* File tabs */}
                    {openFileTabs.length > 0 && (
                      <div className="flex overflow-x-auto bg-[#1a1a1a] text-sm mb-2 rounded">
                        {openFileTabs.map(fileId => {
                          const file = currentProject?.files.find(f => f.id === fileId);
                          if (!file) return null;
                          
                          return (
                            <div 
                              key={file.id}
                              className={`flex items-center py-1.5 px-3 cursor-pointer group ${
                                activeFileId === file.id 
                                  ? 'bg-[#2a2a2a] text-white border-b-2 border-[#2E5BFF]' 
                                  : 'text-gray-400 hover:bg-[#252525]'
                              }`}
                              onClick={() => handleFileSelect(file.id)}
                        >
                          <div className="flex items-center">
                                {file.name.endsWith('.java') ? (
                                  <FileCode className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                                ) : (
                                  <FileCode className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                )}
                                <span>{file.name}</span>
              </div>
                    
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTabClose(file.id);
                                }}
                                className="ml-2 text-gray-500 hover:text-gray-300"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                    </div>
                          );
                        })}
                  </div>
                    )}
                    
                    {/* Monaco Editor */}
                    <div className="h-[45vh]">
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
                      <div className="bg-[#1A2E42]/80 rounded p-2 mt-3 text-xs text-gray-300">
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
                      <div className="bg-[#1a1a1a] rounded-lg p-3 mt-3 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400">Output (executed in {codeOutput.executionTime}ms)</span>
                  </div>
                        {codeOutput.stdout && (
                          <div className="mb-2">
                            <p className="text-green-400 mb-1">Standard Output:</p>
                            <pre className="text-white whitespace-pre-wrap max-h-[150px] overflow-y-auto bg-black/30 p-2 rounded">{codeOutput.stdout}</pre>
                          </div>
                        )}
                        {codeOutput.stderr && (
                          <div>
                            <p className="text-red-400 mb-1">Standard Error:</p>
                            <pre className="text-white whitespace-pre-wrap max-h-[150px] overflow-y-auto bg-black/30 p-2 rounded">{codeOutput.stderr}</pre>
                          </div>
                        )}
                    </div>
                  )}
                  
                    {/* Action buttons */}
                    <div className="flex space-x-3 mt-3">
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
                            <span>Run Project</span>
                          </>
                        )}
                      </button>
                      
                      <button
                            onClick={async () => {
                          if (!currentProject) {
                            toast.error('No active project');
                            return;
                          }
                          
                          const activeFile = findFileById(activeFileId || '', currentProject.files);
                          if (!activeFile) {
                            toast.error('No active file to evaluate');
                            return;
                          }
                          
                          setIsLoading(true);
                          
                          try {
                            const response = await getTutorResponse({
                              question: `Please evaluate this Java code and provide feedback: \n\n${activeFile.content}`,
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
                              code: activeFile.content
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
                        disabled={isLoading || !activeFileId}
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>Get AI Feedback</span>
                      </button>
                  </div>
                </div>
              </div>
            </section>
              
              {/* New File Dialog */}
              {showNewFileDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#1a2e42] rounded-lg p-4 w-80">
                    <h3 className="text-lg font-medium mb-4">
                      Create New {isCreatingDirectory ? 'Folder' : 'File'}
                    </h3>
                    
                    <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-1">
                        {isCreatingDirectory ? 'Folder Name' : 'File Name'}
                      </label>
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                        placeholder={isCreatingDirectory ? 'NewFolder' : 'NewFile.java'}
                        autoFocus
                      />
                      
                      {!isCreatingDirectory && !newFileName.includes('.') && (
                        <p className="text-xs text-amber-400 mt-1">
                          Tip: Include a file extension (e.g. .java)
                        </p>
                      )}
                </div>
                
                    <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => setShowNewFileDialog(false)}
                        className="px-3 py-1 text-gray-300 hover:bg-white/10 rounded"
                      >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateNewFile}
                        disabled={!newFileName.trim()}
                        className={`px-3 py-1 rounded ${
                          newFileName.trim() 
                          ? 'bg-[#2E5BFF] text-white' 
                            : 'bg-[#2E5BFF]/50 text-white/70 cursor-not-allowed'
                      }`}
                    >
                        Create
                    </button>
                  </div>
                </div>
                </div>
              )}
                </div>
          )}
          
          {/* Lesson Plans Tab Content */}
          {activeTab === 'lesson-plans' && (
            <div className="flex flex-col">
              <section className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    Lesson Plans
                  </h2>
                  
                  {selectedTopic && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-white/5 text-white">
                        {selectedTopic.title}
                      </Badge>
                      <Badge
                        className="bg-white/10"
                        style={{ color: getDifficultyColor(selectedTopic.difficulty_level) }}
                      >
                        {selectedTopic.difficulty_level}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Choose a topic section - always visible */}
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Learning Topics</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                    {isLoadingTopics ? (
                      <div className="col-span-3 flex justify-center py-10">
                        <Loader className="h-8 w-8 animate-spin text-[#2E5BFF]" />
                      </div>
                    ) : (
                      topics.map((topic) => (
                        <div 
                          key={topic.id}
                          className={`bg-slate-700/70 backdrop-blur-sm rounded-lg p-4 ${
                            topic.is_locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/90'
                          } ${selectedTopic?.id === topic.id ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => !topic.is_locked && handleTopicSelect(topic)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {topic.title === 'Java Basics' ? (
                                <div className="text-green-500">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                              ) : topic.title === 'Java Advanced Concepts' ? (
                                <div className="text-blue-500">
                                  <Code className="h-5 w-5" />
                                </div>
                              ) : (
                                <div className="text-purple-500">
                                  <Layers className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-white truncate">{topic.title}</h4>
                              <div className="flex items-center text-xs mt-1">
                                <span className="text-gray-400">{topic.progress || 0}% complete</span>
                              </div>
                            </div>
                            {topic.is_locked && (
                              <Lock className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Display lesson plans for selected topic */}
                {selectedTopic && topicLessonPlans[selectedTopic.id] && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                        Lesson Plans for {selectedTopic.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className="bg-white/10"
                          style={{ color: getDifficultyColor(selectedTopic.difficulty_level) }}
                        >
                          {selectedTopic.difficulty_level}
                        </Badge>
                      </div>
                    </div>
                    
                    {topicLessonPlans[selectedTopic.id].length === 0 ? (
                      <div className="bg-white/5 rounded-lg p-8 text-center">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 text-yellow-500/80" />
                        <h3 className="text-lg font-medium mb-2">No Lesson Plans Yet</h3>
                        <p className="text-gray-400">There are no lesson plans available for this topic yet.</p>
                      </div>
                    ) : (
                      <HierarchicalLessonPlans 
                        plans={topicLessonPlans[selectedTopic.id]} 
                        onSelectPlan={handleLessonPlanSelect}
                      />
                    )}
                  </div>
                )}
                
                {/* Active Lesson Plan Details */}
                {activeLessonPlan && (
                  <div className="bg-white/5 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{activeLessonPlan.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{activeLessonPlan.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-[#2E5BFF]/20 text-blue-400 border-blue-500/20">
                        {activeLessonPlan.modules_count} modules
                      </Badge>
                    </div>
                    
                    {activeLessonPlan.modules && activeLessonPlan.modules.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-medium mb-2 flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-[#2E5BFF]" />
                          Modules
                        </h4>
                        <ModuleList
                          modules={activeLessonPlan.modules}
                          activeLessonPlan={activeLessonPlan}
                          activeModuleId={activeModule?.id || 0}
                          onSelectModule={handleModuleSelect}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
          
          {/* Quiz Tab Content */}
          {activeTab === 'quiz' && (
            <div className="flex flex-col">
              <section className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    Knowledge Assessment
                  </h2>
                  
                  {selectedTopic && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-white/5 text-white">
                        {selectedTopic.title}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {!selectedTopic ? (
                  <div className="bg-white/5 rounded-lg p-8 text-center">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                    <h3 className="text-lg font-medium mb-2">Select a Topic First</h3>
                    <p className="text-gray-400 mb-4">Choose a learning topic to access its quizzes</p>
                    <Button 
                      onClick={() => setActiveTab('lesson-plans')}
                      className="bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                    >
                      Browse Topics
                    </Button>
                  </div>
                ) : isLoadingQuiz ? (
                  <div className="bg-white/5 rounded-lg p-12 flex justify-center">
                    <div className="flex flex-col items-center">
                      <Loader className="h-8 w-8 animate-spin text-[#2E5BFF] mb-4" />
                      <p className="text-gray-400">Loading quiz...</p>
                    </div>
                  </div>
                ) : activeQuiz ? (
                  <div className="bg-white/5 rounded-lg p-4">
                    {quizSubmitted ? (
                      <div className="space-y-6">
                        <div className="text-center p-4">
                          <h3 className="text-xl font-semibold mb-2">{quizScore >= 70 ? 'Great Job!' : 'Quiz Completed'}</h3>
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-4">
                            <div className="text-2xl font-bold">
                              {quizScore}%
                            </div>
                          </div>
                          <p className="text-gray-300 mb-6">
                            {quizScore >= 80 ? 'Excellent work! You have a solid understanding of this topic.' :
                             quizScore >= 70 ? 'Good job! You\'re making great progress.' :
                             quizScore >= 50 ? 'You\'re on the right track, but may need more practice.' :
                             'This topic needs more review. Let\'s keep learning!'}
                          </p>
                          
                          <div className="flex justify-center gap-3">
                            <Button
                              onClick={() => {
                                setActiveQuiz(null);
                                setQuizSubmitted(false);
                              }}
                              className="bg-white/10 hover:bg-white/20"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Back to Quizzes
                            </Button>
                            <Button 
                              onClick={() => {
                                setActiveTab('chat');
                                // Reset the quiz state
                                setActiveQuiz(null);
                                setQuizSubmitted(false);
                              }}
                              className="bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Discuss with Tutor
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <h4 className="text-lg font-medium flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                            Review Your Answers
                          </h4>
                          
                          {activeQuiz.questions.map((question, qIndex) => {
                            const isCorrect = selectedOptions[qIndex] === question.correctOption;
                            return (
                              <div 
                                key={question.id}
                                className={`p-4 rounded-lg ${
                                  isCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'
                                }`}
                              >
                                <div className="flex items-start">
                                  <div className={`flex-shrink-0 mt-1 p-1 rounded-full ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                    {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <p className="font-medium mb-3">{qIndex + 1}. {question.question}</p>
                                    <div className="grid gap-2">
                                      {question.options.map((option, oIndex) => (
                                        <div 
                                          key={oIndex}
                                          className={`p-2 rounded ${
                                            oIndex === question.correctOption ? 'bg-green-900/30 border border-green-800/30' :
                                            oIndex === selectedOptions[qIndex] ? 'bg-red-900/30 border border-red-800/30' :
                                            'bg-white/5'
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <div className="flex-shrink-0 w-6">
                                              {oIndex === question.correctOption && <CheckCircle className="h-4 w-4 text-green-500" />}
                                              {oIndex === selectedOptions[qIndex] && oIndex !== question.correctOption && <XCircle className="h-4 w-4 text-red-500" />}
                                            </div>
                                            <p className={`text-sm ${
                                              oIndex === question.correctOption ? 'text-green-400' :
                                              oIndex === selectedOptions[qIndex] ? 'text-red-400' :
                                              'text-gray-300'
                                            }`}>
                                              {option}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {question.explanation && (
                                      <div className="mt-3 text-sm bg-white/5 p-3 rounded">
                                        <p className="font-medium text-blue-400 mb-1">Explanation:</p>
                                        <p className="text-gray-300">{question.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h3 className="text-xl font-semibold">{activeQuiz.title}</h3>
                            <p className="text-gray-400 text-sm mt-1">{activeQuiz.description}</p>
                          </div>
                          <Badge variant="outline" className="bg-white/5 text-gray-300">
                            {activeQuiz.questions.length} Questions
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-1 text-[#2E5BFF]" />
                            <span>Total: {activeQuiz.totalPoints} points</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            <span>Pass: 70%</span>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</h4>
                            <div className="flex items-center text-sm text-gray-400">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>Take your time</span>
                            </div>
                          </div>
                          
                          <div className="mb-6">
                            <p className="text-lg mb-4">{activeQuiz.questions[currentQuestionIndex].question}</p>
                            <div className="space-y-3">
                              {activeQuiz.questions[currentQuestionIndex].options.map((option, index) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg border cursor-pointer transition duration-200 ${
                                    selectedOptions[currentQuestionIndex] === index 
                                      ? 'bg-[#2E5BFF]/20 border-[#2E5BFF]' 
                                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                                  }`}
                                  onClick={() => {
                                    const newSelectedOptions = [...selectedOptions];
                                    newSelectedOptions[currentQuestionIndex] = index;
                                    setSelectedOptions(newSelectedOptions);
                                  }}
                                >
                                  <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                                      selectedOptions[currentQuestionIndex] === index 
                                        ? 'bg-[#2E5BFF] text-white' 
                                        : 'bg-white/10 text-gray-400'
                                    }`}>
                                      {String.fromCharCode(65 + index)}
                                    </div>
                                    <span>{option}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex justify-between">
                            <Button
                              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentQuestionIndex === 0}
                              className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-2" />
                              Previous
                            </Button>
                            
                            {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                              <Button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                                disabled={selectedOptions[currentQuestionIndex] === -1}
                                className="bg-[#2E5BFF] hover:bg-[#1E4BEF] disabled:opacity-50"
                              >
                                Next
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            ) : (
                              <Button
                                onClick={handleQuizSubmit}
                                disabled={selectedOptions.includes(-1)}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                Submit Quiz
                                <CheckCircle className="h-4 w-4 ml-2" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : moduleQuizzes && moduleQuizzes.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                      Available Module Quizzes
                    </h3>
                    
                    <div className="space-y-3">
                      {moduleQuizzes.map(quiz => (
                        <div 
                          key={quiz.id}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition"
                          onClick={() => startModuleQuiz(quiz.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium mb-1">{quiz.title}</h4>
                              <p className="text-sm text-gray-400">{quiz.description}</p>
                              
                              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                                <Badge variant="outline" className="bg-white/5 text-blue-400 border-blue-400/20">
                                  {quiz.questions.length} Questions
                                </Badge>
                                <div className="flex items-center text-gray-400">
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  <span>{quiz.time_limit_minutes} minutes</span>
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <Award className="h-3.5 w-3.5 mr-1" />
                                  <span>Pass: {quiz.passing_score_percent}%</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={`${
                              quiz.passed 
                                ? 'bg-green-900/20 text-green-400' 
                                : 'bg-blue-900/20 text-blue-400'
                            }`}>
                              {quiz.passed ? 'Passed' : 'Available'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-6 text-center">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 text-[#2E5BFF]" />
                      <h3 className="text-lg font-medium mb-2">No Quizzes Available Yet</h3>
                      <p className="text-gray-400 mb-6">Generate a quiz to test your knowledge on this topic</p>
                      
                      <Button 
                        onClick={() => generateQuizForTopic(selectedTopic.id, selectedTopic.title)}
                        className="bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                        disabled={isLoadingQuiz}
                      >
                        {isLoadingQuiz ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Generating Quiz
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Quiz
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium flex items-center mb-4">
                        <BarChart className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                        Quiz Performance
                      </h3>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        {isLoadingAnalysis ? (
                          <div className="flex justify-center py-8">
                            <Loader className="h-8 w-8 animate-spin text-[#2E5BFF]" />
                          </div>
                        ) : quizAnalysis ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-sm text-gray-400 mb-1">Quizzes Taken</p>
                                <p className="text-2xl font-semibold">{quizAnalysis.quizzes_taken || 0}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-sm text-gray-400 mb-1">Avg. Score</p>
                                <p className="text-2xl font-semibold">{quizAnalysis.average_score || 0}%</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-sm text-gray-400 mb-1">Passed</p>
                                <p className="text-2xl font-semibold text-green-500">{quizAnalysis.quizzes_passed || 0}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-sm text-gray-400 mb-1">Failed</p>
                                <p className="text-2xl font-semibold text-red-500">{quizAnalysis.quizzes_failed || 0}</p>
                              </div>
                            </div>
                            
                            {quizAnalysis.feedback && (
                              <div className="bg-blue-900/20 rounded-lg p-4 text-sm">
                                <p className="font-medium text-blue-400 mb-2">Performance Insights:</p>
                                <p className="text-gray-300">{quizAnalysis.feedback}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-gray-400 mb-4">No quiz data available yet</p>
                            <Button 
                              onClick={getQuizAnalysis} 
                              className="bg-white/10 hover:bg-white/20"
                              disabled={isLoadingAnalysis}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh Data
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
          
          {/* Sessions Tab Content */}
          {activeTab === 'sessions' && (
            <div className="flex flex-col">
              <section className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                    Learning Sessions
                  </h2>
                </div>
                
                <div className="space-y-6">
                  {/* Recent sessions section */}
                  <div>
                    <h3 className="text-lg font-medium flex items-center mb-4">
                      <Activity className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                      Recent Sessions
                    </h3>
                    
                    {previousSessions.length > 0 ? (
                      <div className="space-y-3">
                        {previousSessions.map((session) => (
                          <div 
                            key={session.id}
                            onClick={() => handleSessionSelect(session)}
                            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{session.topic}</h4>
                                <p className="text-sm text-gray-400 mt-1">{session.date}</p>
                              </div>
                              <div className="flex items-center">
                                <div className="hidden sm:flex items-center mr-4 text-gray-400 text-sm">
                                  <Clock className="h-4 w-4 mr-1.5" />
                                  <span>{session.duration}</span>
                                </div>
                                <Button size="sm" className="bg-[#2E5BFF] hover:bg-[#1E4BEF]">
                                  <ArrowRight className="h-4 w-4 mr-1.5" />
                                  Resume
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-6 text-center">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-[#2E5BFF]" />
                        <h3 className="text-lg font-medium mb-2">No Recent Sessions</h3>
                        <p className="text-gray-400 mb-6">Start a new learning session by selecting a topic</p>
                        
                        <Button 
                          onClick={() => setActiveTab('lesson-plans')}
                          className="bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Browse Topics
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Learning statistics section */}
                  {previousSessions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium flex items-center mb-4">
                        <PieChart className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                        Learning Statistics
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-400 mb-1">Total Sessions</p>
                          <p className="text-3xl font-semibold">{previousSessions.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-400 mb-1">Total Learning Time</p>
                          <p className="text-3xl font-semibold">
                            {previousSessions.reduce((total, session) => {
                              const minutes = parseInt(session.duration.split(' ')[0]);
                              return isNaN(minutes) ? total : total + minutes;
                            }, 0)} min
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-400 mb-1">Topics Explored</p>
                          <p className="text-3xl font-semibold">
                            {new Set(previousSessions.map(session => session.topic)).size}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Learning streak section */}
                  {previousSessions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium flex items-center mb-4">
                        <Zap className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                        Learning Streak
                      </h3>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-gray-400 text-sm">Current Streak</p>
                            <p className="text-2xl font-semibold flex items-center">
                              3 days
                              <span className="text-yellow-500 ml-2">
                                <Zap className="h-5 w-5 inline" />
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Longest Streak</p>
                            <p className="text-2xl font-semibold">7 days</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                          {[...Array(7)].map((_, i) => {
                            const isActive = i < 3;
                            return (
                              <div key={i} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                                  isActive ? 'bg-[#2E5BFF] text-white' : 'bg-white/10 text-gray-400'
                                }`}>
                                  {isActive && <Check className="h-4 w-4" />}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoloRoomPage;