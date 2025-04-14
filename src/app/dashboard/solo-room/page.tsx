"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  ArrowUp
} from 'lucide-react';
import { getTutorResponse, executeJavaCode, getTopics, getTopicHierarchy, updateProgress, getUserProgress, getTopicProgress, getLessonPlanDetails, getLessonModules, getLessonPlans } from '@/services/api';
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
import styles from './SoloRoom.module.css';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
  progress: number;
  icon?: React.ReactNode;
  description?: string;
  difficulty_level?: string;
  parent_id?: number | null;
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
        const fetchedTopics = await getTopics();
        if (fetchedTopics && Array.isArray(fetchedTopics)) {
          // Get user progress data
          let userProgressData = [];
          try {
            userProgressData = await getUserProgress();
            console.log("Loaded user progress:", userProgressData);
          } catch (progressError) {
            console.error("Failed to load user progress:", progressError);
          }
          
          // Add icon based on topic title and merge with progress data
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
            
            // Find progress for this topic
            let progress = 0;
            if (userProgressData) {
              const progressItem = userProgressData.find((item: any) => item.topic_id === topic.id);
              if (progressItem) {
                progress = progressItem.progress_percentage || 0;
              }
            }
            
            return {
              ...topic,
              icon,
              progress
            };
          });
          
          setTopics(topicsWithIcons);
          
          // Also fetch lesson plans for all topics
          await fetchAllLessonPlans(topicsWithIcons);
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
        // Use fallback topics in case of error
        setTopics(defaultTopics);
      } finally {
        setIsLoadingTopics(false);
      }
    };
    
    fetchTopics();
  }, []);
  
  // Function to fetch all lesson plans
  const fetchAllLessonPlans = async (topicsData: Topic[]) => {
    try {
      console.log("Starting to fetch all lesson plans");
      
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
      
      // Update local state
      setSelectedTopic({
        ...selectedTopic,
        progress: roundedProgress
      });
      
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
  
  const handleTopicSelect = async (topic: Topic) => {
    setSelectedTopic(topic);
    setActiveTab('chat');
    setIsLoading(true);
    
    try {
      // Try to get existing progress for this topic
      const existingProgress = await getTopicProgress(topic.id);
      console.log("Existing progress for topic:", existingProgress);
      
      // Get lesson plans for this topic
      const lessonPlans = await getLessonPlans(topic.id);
      console.log("Lesson plans for topic:", lessonPlans);
      
      // Store lesson plans in state
      setTopicLessonPlans(prev => ({
        ...prev,
        [topic.id]: lessonPlans
      }));
      
      // If we have existing progress, use it to initialize the state
      if (existingProgress && existingProgress.progress_percentage > 0) {
        // Set time spent from existing data
        setTimeSpentMinutes(existingProgress.time_spent_minutes || 0);
        setExercisesCompleted(existingProgress.exercises_completed || 0);
        setExercisesTotal(existingProgress.exercises_total || topic.exercises_count || 0);
        
        // Set completed subtopics if available
        setCompletedSubtopics(existingProgress.completed_subtopics || []);
        
        // Set knowledge check requested if progress is high
        setKnowledgeCheckRequested(
          existingProgress.progress_percentage >= 80 && 
          (!existingProgress.progress_data || 
           !existingProgress.progress_data.knowledge_check ||
           existingProgress.progress_data.knowledge_check < 20)
        );
        
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
        } else {
          // Default progress data if none exists
          setProgressData({
            interaction: 0,
            code_execution: 0,
            time_spent: 0,
            knowledge_check: 0
          });
        }
        
        // Update the topic with the correct progress
        setSelectedTopic({
          ...topic,
          progress: existingProgress.progress_percentage
        });
      } else {
        // No existing progress, initialize with defaults
        // Reset session tracking for the new topic
        setSessionStartTime(new Date());
        setTimeSpentMinutes(0);
        setExercisesCompleted(0);
        setExercisesTotal(topic.exercises_count || 0);
        setCompletedSubtopics([]);
        setKnowledgeCheckRequested(false);
        knowledgeCheckAnswersCount = 0;
        
        // Initialize progress data
        setProgressData({
          interaction: 0,
          code_execution: 0,
          time_spent: 0,
          knowledge_check: 0
        });
        
        // Initialize progress to 5% for starting the topic
        setSelectedTopic({
          ...topic,
          progress: 5
        });
        
        // Prepare initial progress data as a string
        const initialProgressData = JSON.stringify({
          interaction: 0,
          code_execution: 0,
          time_spent: 0,
          knowledge_check: 0
        });
        console.log("Initializing progress_data as:", initialProgressData);
        
        // Initialize progress in the database
        await updateProgress({
          topic_id: topic.id,
          progress_percentage: 5, // This is already an integer
          status: 'in_progress',
          time_spent_minutes: 0,
          exercises_completed: 0,
          exercises_total: topic.exercises_count || 0,
          completed_subtopics: [], // Empty array for completed subtopics
          progress_data: initialProgressData
        }).catch(progressError => {
          console.error("Error initializing progress:", progressError);
          if (progressError.response && progressError.response.data) {
            console.error('Response error data:', progressError.response.data);
            toast.error(`Progress tracking error: ${JSON.stringify(progressError.response.data.errors || {})}`);
          } else {
            toast.error("Failed to initialize progress tracking.");
          }
        });
      }
      
      // Reset session ID when selecting a new topic
      setCurrentSessionId(null);
      
      // Get response from AI tutor about the selected topic
      const response = await getTutorResponse({
        question: `I'd like to learn about ${topic.title}. Please provide a brief introduction and mention what I'll need to know to demonstrate mastery of this topic.`,
        conversationHistory: [], // Empty array for new topic
        preferences: tutorPreferences,
        topic: topic.title,
        topic_id: topic.id
      });

      // Clear previous messages and add welcome message
      const welcomeMessage: Message = {
        id: Date.now(),
        text: response.response || `Welcome to the ${topic.title} topic!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // If the response includes a session ID, set it
      if (response.session_id) {
        setCurrentSessionId(response.session_id);
      }
    } catch (error) {
      console.error("Error selecting topic:", error);
      setMessages([
        {
          id: Date.now(),
          text: `I'm having trouble loading the ${topic.title} topic. Please try again later.`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
    let complexity = 0;
    
    // More lines = more complex
    const lineCount = code.split('\n').length;
    complexity += Math.min(lineCount / 10, 2);
    
    // Check for classes
    if (code.includes('class ')) {
      complexity += 1;
    }
    
    // Check for methods
    const methodMatches = code.match(/\w+\s*\([^)]*\)\s*{/g);
    if (methodMatches) {
      complexity += Math.min(methodMatches.length, 2);
    }
    
    return complexity;
  };

  const handleLessonPlanSelect = async (lessonPlan: LessonPlan) => {
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
            <TabsList className="grid grid-cols-5 bg-transparent w-full">
              <TabsTrigger
                value="chat"
                className={`px-3 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-[#2E5BFF] transition-all hover:text-white ${
                  activeTab === 'chat' ? 'text-white' : 'text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>AI Tutor Chat</span>
            </div>
              </TabsTrigger>
              <TabsTrigger
                value="lesson-plans"
                className={`px-3 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-[#2E5BFF] transition-all hover:text-white relative ${
                  activeTab === 'lesson-plans' ? 'text-white' : 'text-gray-400'
                }`}
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
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className={`px-3 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-[#2E5BFF] transition-all hover:text-white ${
                  activeTab === 'quiz' ? 'text-white' : 'text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>Quizzes</span>
        </div>
              </TabsTrigger>
              <TabsTrigger
                value="sessions"
                className={`px-3 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-[#2E5BFF] transition-all hover:text-white ${
                  activeTab === 'sessions' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Sessions
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className={`px-3 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-[#2E5BFF] transition-all hover:text-white ${
                  activeTab === 'settings' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Settings
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
                
                {/* Message header - show lesson context if available */}
                {activeLessonPlan && activeModule && (
                  <Card className="bg-white/5 border-[#2E5BFF]/20 text-white mb-2">
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-1 text-xs">
                        <BookOpen className="h-3 w-3 mr-1 text-[#2E5BFF]" />
                        <span className="font-medium text-[#2E5BFF]">{activeLessonPlan.title}</span>
                        <ChevronRight className="h-3 w-3 mx-1 text-gray-500" />
                        <span className="text-gray-400">{activeModule.title}</span>
                      </div>
                      <Link href={`/dashboard/lesson-plans/${activeLessonPlan.id}/${activeModule.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 text-xs text-[#2E5BFF] hover:text-white hover:bg-[#2E5BFF]/20 px-2 py-0"
                        >
                          <ScrollText className="h-3 w-3 mr-1" />
                          View Full
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )}
                
                <div className="bg-white/5 rounded-lg p-4 overflow-y-auto mb-4" style={{ height: '40vh' }}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-[#2E5BFF]" />
                        <p>Start chatting with your Gemini-powered AI tutor to learn Java programming</p>
                        <p className="text-xs mt-2">Powered by Google's Gemini AI</p>
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
                <div className="bg-white/5 rounded-lg p-4 overflow-hidden flex flex-col">
                  <div className="font-mono text-sm overflow-y-auto">
                    <textarea
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="w-full h-[25vh] bg-[#1A2E42]/80 text-gray-300 p-4 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2E5BFF]"
                      placeholder="// Write your Java code here"
                    />
                    
                    {/* Code output */}
                    {codeOutput && (
                      <div className="mt-4 bg-[#1a1a1a] rounded-lg p-4 text-sm">
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
                  </div>
                  <div className="mt-4 flex items-center justify-between">
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
                      {isLoading ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          <span>Get Feedback</span>
                        </>
                      )}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedTopic(topic)}
                          className={`p-4 rounded-lg cursor-pointer transition-colors ${
                            selectedTopic?.id === topic.id
                              ? 'bg-[#2E5BFF] text-white'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                              <div>{topic.icon}</div>
                              <div>
                                <p className="font-medium">{topic.title}</p>
                                <div className="flex items-center mt-1">
                                  <div className="h-1.5 rounded-full bg-white/10 w-20">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500"
                                      style={{ width: `${topic.progress || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs ml-2">{topic.progress || 0}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-full bg-white/10 h-6 w-6 flex items-center justify-center text-xs">
                              {topicLessonPlans[topic.id]?.length || 0}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                          {topicLessonPlans[selectedTopic.id]?.map((plan) => (
                            <motion.div
                              key={plan.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition"
                            >
                              <div 
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => handleLessonPlanSelect(plan)}
                              >
                                <div className="flex items-center space-x-3">
                                  {plan.icon}
                                  <span>{plan.title}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                              
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-gray-400">Difficulty</span>
                                  <span className="text-xs font-medium">
                                    {[...Array(plan.difficulty_level || 1)].map((_, i) => (
                                      <Star key={i} className="inline h-3 w-3 text-yellow-500" />
                                    ))}
                                  </span>
                      </div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-gray-400">Modules</span>
                                  <span className="text-xs font-medium">{plan.modules_count || 0}</span>
                                </div>
                                {plan.estimated_minutes && (
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-400">Estimated Time</span>
                                    <span className="text-xs font-medium">{plan.estimated_minutes} min</span>
                                  </div>
                                )}
                              </div>
                              
                              {plan.description && (
                                <div className="mt-2 text-xs text-gray-400">
                                  {plan.description.length > 100 
                                    ? `${plan.description.substring(0, 100)}...` 
                                    : plan.description
                                  }
                                </div>
                              )}
                            </motion.div>
                          ))}
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
                  <p className="text-white">Generating quiz questions...</p>
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
              ) : !activeQuiz ? (
                <div className="bg-white/5 rounded-lg p-8">
                  <div className="text-center mb-8">
                    <Lightbulb className="h-12 w-12 text-[#2E5BFF] mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Test Your Knowledge</h3>
                    <p className="text-gray-400">Generate a quiz to test your understanding of {selectedTopic.title}.</p>
                  </div>
                  
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
                    
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-white mb-4">Your Progress</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-400">Overall Progress</span>
                            <span className="text-sm font-medium text-white">{selectedTopic.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-[#2E5BFF] h-2 rounded-full" 
                              style={{ width: `${selectedTopic.progress}%` }}
                        ></div>
                      </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-400">Chat Interactions</span>
                            <span className="text-sm font-medium text-white">{progressData.interaction}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(progressData.interaction / 30) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-400">Quizzes</span>
                            <span className="text-sm font-medium text-white">{progressData.knowledge_check}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(progressData.knowledge_check / 30) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-400">Coding</span>
                            <span className="text-sm font-medium text-white">{progressData.code_execution}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(progressData.code_execution / 40) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-medium text-white mb-2">{activeQuiz.title}</h3>
                    <p className="text-gray-400">{activeQuiz.description}</p>
                    
                    {!quizSubmitted && (
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
                    )}
                  </div>
                  
                  {!quizSubmitted ? (
                    <div className="space-y-6">
                      <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="text-lg font-medium text-white mb-4">
                          Question {activeQuiz.questions[currentQuestionIndex].id}: {activeQuiz.questions[currentQuestionIndex].question}
                        </h4>
                        
                        <div className="space-y-3">
                          {activeQuiz.questions[currentQuestionIndex].options.map((option, optionIndex) => (
                            <motion.div
                              key={optionIndex}
                              whileHover={{ x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const newSelectedOptions = [...selectedOptions];
                                newSelectedOptions[currentQuestionIndex] = optionIndex;
                                setSelectedOptions(newSelectedOptions);
                              }}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedOptions[currentQuestionIndex] === optionIndex
                                  ? 'bg-[#2E5BFF] text-white'
                                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                                  selectedOptions[currentQuestionIndex] === optionIndex
                                    ? 'bg-white text-[#2E5BFF]'
                                    : 'bg-white/10 text-gray-400'
                                }`}>
                                  {String.fromCharCode(65 + optionIndex)}
                                </div>
                                <span>{option}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentQuestionIndex > 0) {
                              setCurrentQuestionIndex(currentQuestionIndex - 1);
                            }
                          }}
                          disabled={currentQuestionIndex === 0}
                          className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                        >
                          Previous
                        </Button>
                        
                        {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                          <Button
                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                            disabled={selectedOptions[currentQuestionIndex] === -1}
                            className="bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                          >
                            Next
                          </Button>
                        ) : (
                          <Button
                            onClick={handleQuizSubmit}
                            disabled={selectedOptions.some(option => option === -1)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Submit Quiz
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
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
                        
                        <p className="text-gray-400">
                          You answered {activeQuiz.questions.filter((_, i) => selectedOptions[i] === activeQuiz.questions[i].correctOption).length} 
                          out of {activeQuiz.questions.length} questions correctly.
                        </p>
                        
                        <div className="mt-6 space-y-2">
                          <Button
                            className="w-full bg-[#2E5BFF] hover:bg-[#1E4BEF]"
                            onClick={() => {
                              setCurrentQuestionIndex(0);
                              setQuizSubmitted(false);
                            }}
                          >
                            Review Answers
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full border-white/10 text-white hover:bg-white/10"
                            onClick={() => setActiveQuiz(null)}
                          >
                            Take Another Quiz
                          </Button>
                        </div>
                      </div>
                      
                      {currentQuestionIndex < activeQuiz.questions.length && (
                        <div className="bg-white/10 rounded-lg p-4">
                          <h4 className="text-lg font-medium text-white mb-4">
                            Question {activeQuiz.questions[currentQuestionIndex].id}: {activeQuiz.questions[currentQuestionIndex].question}
                          </h4>
                          
                          <div className="space-y-3">
                            {activeQuiz.questions[currentQuestionIndex].options.map((option, optionIndex) => {
                              const isCorrect = optionIndex === activeQuiz.questions[currentQuestionIndex].correctOption;
                              const isSelected = selectedOptions[currentQuestionIndex] === optionIndex;
                              
                              return (
                                <div
                                  key={optionIndex}
                                  className={`p-3 rounded-lg ${
                                    isCorrect
                                      ? 'bg-green-500/20 border border-green-500 text-white'
                                      : isSelected
                                        ? 'bg-red-500/20 border border-red-500 text-white'
                                        : 'bg-white/5 text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : isSelected
                                          ? 'bg-red-500 text-white'
                                          : 'bg-white/10 text-gray-400'
                                    }`}>
                                      {String.fromCharCode(65 + optionIndex)}
                                    </div>
                                    <span>{option}</span>
                                    
                                    {isCorrect && (
                                      <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                                    )}
                                    
                                    {!isCorrect && isSelected && (
                                      <AlertCircle className="h-5 w-5 text-red-500 ml-auto" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {activeQuiz.questions[currentQuestionIndex].explanation && (
                            <div className="mt-4 p-3 bg-white/5 rounded-lg">
                              <h5 className="text-sm font-medium text-white mb-2">Explanation:</h5>
                              <p className="text-sm text-gray-300">{activeQuiz.questions[currentQuestionIndex].explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentQuestionIndex > 0) {
                              setCurrentQuestionIndex(currentQuestionIndex - 1);
                            }
                          }}
                          disabled={currentQuestionIndex === 0}
                          className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                        >
                          Previous
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentQuestionIndex < activeQuiz.questions.length - 1) {
                              setCurrentQuestionIndex(currentQuestionIndex + 1);
                            }
                          }}
                          disabled={currentQuestionIndex === activeQuiz.questions.length - 1}
                          className="border-white/10 text-white hover:bg-white/10 hover:text-white"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                    <option value="intermediate" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Intermediate</option>
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoloRoomPage; 