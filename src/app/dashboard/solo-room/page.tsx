"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  User, 
  Bot, 
  Code, 
  BookOpen, 
  Clock, 
  Settings as SettingsIcon, 
  ChevronRight, 
  BarChart, 
  CheckCircle, 
  Star,
  Zap,
  Loader
} from 'lucide-react';
import { getTutorResponse, executeJavaCode, getTopics, getTopicHierarchy, updateProgress } from '@/services/api';
import { toast } from 'sonner';

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

const SoloRoomPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'topics' | 'sessions' | 'settings'>('chat');
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
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  
  // Progress tracking state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(0);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const [exercisesTotal, setExercisesTotal] = useState(0);
  const [completedSubtopics, setCompletedSubtopics] = useState<string[]>([]);
  
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

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
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
            } else if (title.includes('algorithm')) {
              icon = <Zap className="h-5 w-5 text-[#2E5BFF]" />;
            } else {
              icon = <BookOpen className="h-5 w-5 text-[#2E5BFF]" />;
            }
            
            return {
              ...topic,
              icon,
              progress: 0 // Initialize progress to 0, should be fetched from user progress API
            };
          });
          
          setTopics(topicsWithIcons);
        } else {
          console.warn('Failed to fetch topics, using default data');
          setTopics(defaultTopics);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
        toast.error('Failed to load topics. Using sample data instead.');
        setTopics(defaultTopics);
      } finally {
        setIsLoadingTopics(false);
      }
    };
    
    fetchTopics();
  }, []);

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
      // Get current progress values
      let newProgress = selectedTopic.progress;
      
      // Create a copy of the current progress data
      const updatedProgressData: ProgressData = { ...progressData };
      
      // Update the specific progress type
      if (progressType === 'interaction') {
        updatedProgressData.interaction = Math.min(updatedProgressData.interaction + progressIncrement, 25);
      } else if (progressType === 'code_execution') {
        updatedProgressData.code_execution = Math.min(updatedProgressData.code_execution + progressIncrement, 35);
      } else if (progressType === 'time_spent') {
        updatedProgressData.time_spent = Math.min(updatedProgressData.time_spent + progressIncrement, 10);
      } else if (progressType === 'knowledge_check') {
        updatedProgressData.knowledge_check = updatedProgressData.knowledge_check + progressIncrement;
      }
      
      // Calculate overall progress with appropriate weighting
      newProgress = Math.min(
        5 + // Base progress for starting
        updatedProgressData.interaction +
        updatedProgressData.code_execution +
        updatedProgressData.time_spent +
        updatedProgressData.knowledge_check,
        100 // Cap at 100%
      );
      
      // Determine status based on progress
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (newProgress >= 100) {
        status = 'completed';
      } else if (newProgress > 0) {
        status = 'in_progress';
      }
      
      // Update progress in database with progress type data
      await updateProgress({
        topic_id: selectedTopic.id,
        progress_percentage: newProgress,
        status,
        time_spent_minutes: timeSpentMinutes,
        exercises_completed: exercisesCompleted,
        exercises_total: exercisesTotal,
        completed_subtopics: completedSubtopics,
        // We'll handle the missing property in the API by using the stringified data
        // as a custom field that we can parse in the backend
      });
      
      // Update local state for progress data
      setProgressData(updatedProgressData);
      
      // Update local state
      setSelectedTopic({
        ...selectedTopic,
        progress: newProgress
      });
      
      // If we're at 80% progress but haven't done a knowledge check, prompt for one
      if (newProgress >= 80 && updatedProgressData.knowledge_check < 20 && !knowledgeCheckRequested) {
        setKnowledgeCheckRequested(true);
        const knowledgeCheckMsg: Message = {
          id: Date.now(),
          text: "You've made great progress! Let's verify your understanding with a few questions about this topic.",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, knowledgeCheckMsg]);
        // Request a quiz from the AI
        requestKnowledgeCheck();
      }
    } catch (error) {
      console.error("Error updating progress:", error);
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

  // Enhanced handleSendMessage with improved progress tracking
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

      // Get response from AI tutor
      const response = await getTutorResponse({
        question: inputMessage,
        conversationHistory,
        preferences: tutorPreferences,
        topic: selectedTopic?.title,
        topic_id: selectedTopic?.id,
        session_id: currentSessionId !== null ? currentSessionId : undefined
      });

      // Add AI's response to the chat
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: response.response || "I'm sorry, I don't have a response for that.",
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Only increment progress for meaningful interactions, max 25% for chat interactions
      // Check if this seems to be a knowledge check response
      if (knowledgeCheckRequested && 
          (inputMessage.toLowerCase().includes('answer') || 
           inputMessage.toLowerCase().includes('option') || 
           inputMessage.match(/[a-d]\s*:/i))) {
        // This might be an answer to a knowledge check question
        await updateUserProgress(5, 'knowledge_check');
        
        // After a few knowledge check answers, consider the check complete
        knowledgeCheckAnswersCount++;
        if (knowledgeCheckAnswersCount >= 3) {
          setKnowledgeCheckRequested(false);
          knowledgeCheckAnswersCount = 0;
        }
      } else {
        // Regular message, slower progress
        const messageLength = inputMessage.length;
        // More substantial questions get slightly more progress
        const progressIncrement = messageLength > 50 ? 2 : 1;
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
    
    try {
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
      
      // Initialize progress to 5% for starting the topic
      setSelectedTopic({
        ...topic,
        progress: 5
      });
      
      // Initialize progress in the database
      await updateProgress({
        topic_id: topic.id,
        progress_percentage: 5,
        status: 'in_progress',
        time_spent_minutes: 0,
        exercises_completed: 0,
        exercises_total: topic.exercises_count || 0,
        completed_subtopics: [],
        // Removed progress_data property to avoid type error
      });
      
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
      const result = await executeJavaCode({
        code: codeInput,
        session_id: currentSessionId !== null ? currentSessionId : undefined,
        topic_id: selectedTopic?.id
      });
      
      setCodeOutput({
        stdout: result.execution.stdout || '',
        stderr: result.execution.stderr || '',
        executionTime: result.execution.executionTime || 0
      });
      
      // Track code execution for progress
      // Award more points for meaningful code (longer, with methods, classes)
      const codeComplexity = calculateCodeComplexity(codeInput);
      
      if (result.execution.success) {
        // Successful execution
        const progressPoints = Math.min(3 + codeComplexity, 7); // Cap at 7% per successful run
        setExercisesCompleted(prev => prev + 1);
        await updateUserProgress(progressPoints, 'code_execution');
        
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

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center space-x-2">
        <Code className="h-6 w-6 text-[#2E5BFF]" />
        <h1 className="text-2xl font-bold">AI Tutor Solo Room</h1>
      </div>
      
      <p className="text-gray-400">
        Practice coding with your personal AI tutor. Ask questions, get feedback, and improve your Java programming skills.
      </p>
      
      {/* Progress Overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Your Learning Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Topics Covered</p>
              <p className="text-xl font-bold">4/12</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Exercises Completed</p>
              <p className="text-xl font-bold">24/50</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Learning Hours</p>
              <p className="text-xl font-bold">12.5</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <Star className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Streak</p>
              <p className="text-xl font-bold">5 days</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Interface */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="flex flex-wrap border-b border-white/10">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bot className="h-5 w-5" />
            <span>Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'topics' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Topics</span>
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'sessions' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Clock className="h-5 w-5" />
            <span>Sessions</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Preferences</span>
          </button>
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
          
          {activeTab === 'topics' && (
            <section className="p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                Learning Topics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
                {topics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTopicSelect(topic)}
                    className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        {topic.icon}
                        <span>{topic.title}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Progress</span>
                        <span className="text-xs font-medium">{topic.progress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div 
                          className="bg-[#2E5BFF] h-1.5 rounded-full" 
                          style={{ width: `${topic.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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