"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Book, FolderOpen, MessageSquare, Lightbulb, ScrollText, Play, Palette, Settings, Monitor, Code2, Zap, Trophy, Clock, Target, Brain, GraduationCap, BookOpen, Timer, Info, ArrowRight } from 'lucide-react';
import { getTopics, updateProgress as apiUpdateProgress, getLessonPlans } from '@/services/api';
import { toast } from 'sonner';

// Import custom hooks
import { useTutorChat } from '@/hooks/useTutorChat';
import { useCodeExecution } from '@/hooks/useCodeExecution';

// Import refactored components
import { ChatInterface } from '@/components/solo-room/ChatInterface';
import { CodeEditor } from '@/components/solo-room/CodeEditor';
import { FileExplorer } from '@/components/solo-room/FileExplorer';
import { FileTabs } from '../../../components/solo-room/FileTabs';

// Types
interface Topic {
  id: number;
  title: string;
  description?: string;
  difficulty_level?: string;
  parent_id?: number | null;
  order?: number;
}

const SoloRoomRefactored = () => {
  // Core state
  const [activeTab, setActiveTab] = useState<'chat' | 'lesson-plans' | 'sessions' | 'quiz'>('chat');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  
  // Add lesson plans state
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);
  
  // Project state (simplified for demo)
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileParentPath, setNewFileParentPath] = useState('/');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [isCreatingDirectory, setIsCreatingDirectory] = useState(false);

  // Use custom hooks
  const {
    messages,
    isLoading: isChatLoading,
    tutorPreferences,
    sendMessage,
    startTopicSession,
    updatePreferences,
    currentSessionId
  } = useTutorChat();

  const {
    codeInput,
    setCodeInput,
    codeOutput,
    isExecuting,
    executeCode,
    formatCode
  } = useCodeExecution();

  // Fetch topics on initial load only
  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const allTopics = await getTopics();
        if (Array.isArray(allTopics)) {
          // Filter to only get main parent topics (no parent_id) and limit to 3
          const mainTopics = allTopics
            .filter(topic => !topic.parent_id) // Only parent topics
            .slice(0, 3) // Limit to 3 topics
            .sort((a, b) => a.order - b.order); // Sort by order
          
          console.log('Filtered main topics:', mainTopics);
          setTopics(mainTopics);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
        toast.error('Failed to load topics');
      } finally {
        setIsLoadingTopics(false);
      }
    };

    const createDefaultProject = () => {
      const mainFileId = 'file-1';
      const defaultProject = {
        id: 'project-1',
        name: 'Java Project',
        files: [
          {
            id: mainFileId,
            name: 'Main.java',
            content: `public class Main {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, Java!");
    }
}`,
            path: '/Main.java',
            language: 'java',
          }
        ],
        rootDirectory: {
          id: 'dir-1',
          name: 'Root',
          path: '/',
          isDirectory: true,
          children: [
            {
              id: mainFileId,
              name: 'Main.java',
              content: `public class Main {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, Java!");
    }
}`,
              path: '/Main.java',
              language: 'java',
            }
          ]
        },
        mainFile: mainFileId
      };
      
      setCurrentProject(defaultProject);
      setActiveFileId(mainFileId);
      setOpenFileTabs([mainFileId]);
      setCodeInput(defaultProject.files[0].content);
    };
    
    // Only fetch topics and create project on initial load
    fetchTopics();
    createDefaultProject();
  }, []); // Empty dependency array - run only once

  // Fetch lesson plans when a topic is selected
  useEffect(() => {
    const fetchLessonPlans = async () => {
      if (!selectedTopic) {
        setLessonPlans([]);
        return;
      }

      setIsLoadingLessonPlans(true);
      try {
        const plans = await getLessonPlans(selectedTopic.id);
        setLessonPlans(plans || []);
      } catch (error) {
        console.error('Error fetching lesson plans:', error);
        setLessonPlans([]);
        toast.error('Failed to load lessons');
      } finally {
        setIsLoadingLessonPlans(false);
      }
    };

    fetchLessonPlans();
  }, [selectedTopic?.id]); // Only run when selected topic changes

  // Topic selection handler
  const handleTopicSelect = async (topic: Topic) => {
    console.log('Topic selected:', topic);
    setSelectedTopic(topic);
    // Don't start session here - only when a specific lesson is clicked
  };

  // Message sending handler
  const handleSendMessage = async (message: string) => {
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }
    
    await sendMessage(message, selectedTopic.id, selectedTopic.title);
    
    // Track progress for sending a message
    updateProgress(1, 'interaction');
  };

  // Code execution handler
  const handleRunCode = async () => {
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }
    
    const result = await executeCode(codeInput, currentSessionId, selectedTopic.id);
    
    // Track progress for code execution
    updateProgress(2, 'code_execution');
    
    return result;
  };

  // Progress tracking
  const updateProgress = async (progressIncrement = 0, progressType = 'interaction') => {
    if (!selectedTopic) return;
    
    try {
      // Construct progress data object
      const progressData = {
        interaction: progressType === 'interaction' ? progressIncrement : 0,
        code_execution: progressType === 'code_execution' ? progressIncrement : 0,
        time_spent: progressType === 'time_spent' ? progressIncrement : 0,
        knowledge_check: progressType === 'knowledge_check' ? progressIncrement : 0
      };
      
      // Calculate overall progress as a weighted average
      const overallProgress = 
        (progressData.interaction * 0.25) + 
        (progressData.code_execution * 0.4) + 
        (progressData.time_spent * 0.1) + 
        (progressData.knowledge_check * 0.25);
      
      // Update progress on the server
      await apiUpdateProgress({
        topic_id: selectedTopic.id,
        progress_percentage: Math.min(Math.round(overallProgress), 100),
        status: overallProgress >= 100 ? 'completed' : 'in_progress',
        time_spent_minutes: 1,
        completed_subtopics: [],
        progress_data: JSON.stringify(progressData)
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // File operations
  const handleFileSelect = (fileId: string) => {
    if (currentProject) {
      const file = currentProject.files.find((f: any) => f.id === fileId);
      if (file && !file.isDirectory) {
        setActiveFileId(fileId);
        if (!openFileTabs.includes(fileId)) {
          setOpenFileTabs([...openFileTabs, fileId]);
        }
        setCodeInput(file.content);
      }
    }
  };

  const handleTabClose = (fileId: string) => {
    const newTabs = openFileTabs.filter(id => id !== fileId);
    setOpenFileTabs(newTabs);
    
    if (activeFileId === fileId && newTabs.length > 0) {
      setActiveFileId(newTabs[0]);
      const file = currentProject.files.find((f: any) => f.id === newTabs[0]);
      if (file) {
        setCodeInput(file.content);
      }
    }
  };

  const handleCreateNewFile = () => {
    // Simplified for demo
    toast.info('This functionality is simplified in the demo');
  };

  const handleDeleteFile = (fileId: string) => {
    // Simplified for demo
    toast.info('This functionality is simplified in the demo');
  };

  // Lesson click handler - Switch to chat and start AI conversation about the lesson
  const handleLessonClick = async (lesson: any) => {
    try {
      // Set the selected topic if not already set
      if (!selectedTopic) {
        const topicForLesson = topics.find(t => t.id === lesson.topic_id);
        if (topicForLesson) {
          setSelectedTopic(topicForLesson);
        }
      }
      
      // Start a session for this topic and lesson
      const topicToUse = selectedTopic || topics.find(t => t.id === lesson.topic_id);
      if (topicToUse) {
        await startTopicSession(topicToUse);
      }
      
      // Switch to chat tab
      setActiveTab('chat');
      
      // Start AI conversation about this specific lesson
      const welcomeMessage = `Hello! I'd like to start learning about "${lesson.title}". ${lesson.description ? `Here's what I understand about it: ${lesson.description}. ` : ''}Can you help me understand this topic and guide me through the key concepts step by step?`;
      
      // Send the initial message to start the conversation
      await sendMessage(welcomeMessage, topicToUse?.id || lesson.topic_id, topicToUse?.title || lesson.title);
      
      // Track progress for lesson selection
      updateProgress(1, 'interaction');
      
      toast.success(`Started learning session for: ${lesson.title}`);
    } catch (error) {
      console.error('Error starting lesson conversation:', error);
      toast.error('Failed to start lesson conversation');
    }
  };

  // Legacy lesson plan click handler (for external navigation)
  const handleLessonPlanClick = (planId: number) => {
    window.open(`/dashboard/lesson-plans/${planId}`, '_blank');
  };

  // Render main content
  return (
    <div className="flex flex-col h-screen bg-[#0A1929] custom-scrollbar">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm"
        >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2E5BFF] rounded-xl flex items-center justify-center">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Solo Coding Room</h1>
              <p className="text-sm text-gray-400">Interactive Java Learning Environment</p>
            </div>
          </div>
        </div>
        
        {/* Topic Status */}
        {selectedTopic && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/10"
          >
            <Target className="h-4 w-4 text-[#2E5BFF]" />
            <span className="text-sm font-medium text-white">{selectedTopic.title}</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </motion.div>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 backdrop-blur-sm">
            <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white transition-all duration-200">
            <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Tutor</span>
          </TabsTrigger>
            <TabsTrigger value="lesson-plans" className="flex items-center gap-2 data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white transition-all duration-200">
            <Book className="h-4 w-4" />
              <span className="hidden sm:inline">Lessons</span>
          </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2 data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white transition-all duration-200">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
          </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2 data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white transition-all duration-200">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz</span>
          </TabsTrigger>
        </TabsList>
        </div>
        
        <TabsContent value="chat" className="flex-1 overflow-hidden p-6">
          <div className="flex flex-col gap-6 h-full">
            {/* Top panel - Enhanced Chat Interface */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-1/2 flex flex-col"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#2E5BFF] rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">AI Tutor</h3>
                      <p className="text-xs text-gray-400">Ready to help you learn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-400">Online</span>
                  </div>
                </div>
                <div className="flex-1 p-4 min-h-0">
              <ChatInterface
                messages={messages}
                isLoading={isChatLoading}
                onSendMessage={handleSendMessage}
                topic={selectedTopic}
                preferences={tutorPreferences}
                onUpdatePreferences={updatePreferences}
              />
                </div>
              </div>
            </motion.div>
            
            {/* Bottom panel - Enhanced Code Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-1/2 flex flex-col"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden h-full flex flex-col">
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#2E5BFF] rounded-lg flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Code Editor</h3>
                      <p className="text-xs text-gray-400">Write and test your Java code</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRunCode}
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2E5BFF] text-white rounded-lg font-medium text-sm hover:bg-[#2E5BFF]/80 transition-all duration-200 disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isExecuting ? 'Running...' : 'Run Code'}
                  </motion.button>
                </div>
                
                <div className="flex flex-1 min-h-0">
                  {/* Enhanced File explorer */}
                  <div className="w-1/3 border-r border-white/10 overflow-y-auto bg-white/5 custom-scrollbar">
                    <div className="p-3 border-b border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="h-4 w-4 text-[#2E5BFF]" />
                        <span className="text-sm font-medium text-white">Project Files</span>
                      </div>
                    </div>
                  <FileExplorer
                    project={currentProject}
                    activeFileId={activeFileId}
                    onFileSelect={handleFileSelect}
                    onCreateNewFile={handleCreateNewFile}
                    onDeleteFile={handleDeleteFile}
                    setNewFileName={setNewFileName}
                    setNewFileParentPath={setNewFileParentPath}
                    setShowNewFileDialog={setShowNewFileDialog}
                    setIsCreatingDirectory={setIsCreatingDirectory}
                  />
                </div>
                
                                      {/* Enhanced Editor area */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Enhanced File tabs */}
                      <div className="border-b border-white/10 bg-white/5">
                  <FileTabs
                    project={currentProject}
                    openFileTabs={openFileTabs}
                    activeFileId={activeFileId}
                    onFileSelect={handleFileSelect}
                    onTabClose={handleTabClose}
                  />
                      </div>
                  
                  {/* Code editor */}
                    <div className="flex-1 min-h-0">
                    <CodeEditor
                      value={codeInput}
                      onChange={setCodeInput}
                      language="java"
                      onRun={handleRunCode}
                      onFormat={formatCode}
                      isExecuting={isExecuting}
                      output={codeOutput}
                    />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>
        
        <TabsContent value="lesson-plans" className="flex-1 p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            {isLoadingTopics ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#2E5BFF]/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                  <Book className="h-8 w-8 text-[#2E5BFF]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Loading Topics...</h3>
                <p className="text-gray-400 text-center max-w-md">
                  Fetching learning topics for your Java journey...
                </p>
              </div>
            ) : topics.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#2E5BFF]/20 rounded-2xl flex items-center justify-center mb-6">
                  <Book className="h-8 w-8 text-[#2E5BFF]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Topics Available</h3>
                <p className="text-gray-400 text-center max-w-md">
                  No learning topics are currently available. Please check back later.
                </p>
              </div>
            ) : (
              <div className="h-full overflow-auto custom-scrollbar">
                {/* Topic Buttons - Simple 3 buttons at the top */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Book className="h-5 w-5 text-[#2E5BFF]" />
                    Choose Your Learning Path
                  </h3>
                  <div className="flex gap-4 flex-wrap">
                    {topics.slice(0, 3).map((topic) => (
                      <motion.button
                        key={topic.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTopicSelect(topic)}
                        className={`
                          px-6 py-3 rounded-lg font-medium transition-all duration-200
                          ${selectedTopic?.id === topic.id 
                            ? 'bg-[#2E5BFF] text-white shadow-lg shadow-[#2E5BFF]/25' 
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}
                        `}
                      >
                        {topic.title}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Lessons Section - Shows when a topic is selected */}
                {selectedTopic && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <GraduationCap className="h-6 w-6 text-[#2E5BFF]" />
                      <h3 className="text-xl font-bold text-white">
                        {selectedTopic.title} Lessons
                      </h3>
                      <span className="px-3 py-1 bg-[#2E5BFF]/20 text-[#2E5BFF] rounded-full text-sm font-medium">
                        {selectedTopic.difficulty_level || 'Beginner'}
                      </span>
                    </div>
                    
                    {isLoadingLessonPlans ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                            <div className="animate-pulse">
                              <div className="w-3/4 h-5 bg-white/10 rounded mb-2"></div>
                              <div className="w-full h-4 bg-white/10 rounded mb-3"></div>
                              <div className="w-1/3 h-8 bg-white/10 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : lessonPlans.length === 0 ? (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                        <div className="w-12 h-12 bg-[#2E5BFF]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-6 w-6 text-[#2E5BFF]" />
                        </div>
                        <h4 className="text-lg font-semibold text-white mb-2">No Lessons Available</h4>
                        <p className="text-gray-400 text-sm">
                          No lesson plans are available for {selectedTopic.title} yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {lessonPlans.map((lesson: any, index: number) => (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: index * 0.1,
                              duration: 0.5,
                              ease: "easeOut"
                            }}
                            className="group relative overflow-hidden h-[420px]"
                          >
                            {/* Main Card */}
                            <div className="bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-[#2E5BFF]/50 hover:shadow-2xl hover:shadow-[#2E5BFF]/10 transition-all duration-300 ease-out h-full flex flex-col transform hover:scale-[1.02] hover:-translate-y-1">
                              {/* Difficulty Badge */}
                              <div className="absolute top-4 right-4 z-10">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${
                                  lesson.difficulty_level === 1 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                  lesson.difficulty_level === 2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                  lesson.difficulty_level === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                  lesson.difficulty_level === 4 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                  lesson.difficulty_level === 5 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                  {lesson.difficulty_level === 1 ? 'Beginner' :
                                   lesson.difficulty_level === 2 ? 'Easy' :
                                   lesson.difficulty_level === 3 ? 'Medium' :
                                   lesson.difficulty_level === 4 ? 'Hard' :
                                   lesson.difficulty_level === 5 ? 'Expert' :
                                   'Beginner'}
                                </span>
                              </div>

                              {/* Header - Fixed Height */}
                              <div className="mb-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-[#2E5BFF] to-[#1E40AF] rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                                    <BookOpen className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-20">
                                    <h4 className="text-lg font-bold text-white mb-1 transition-colors duration-200 group-hover:text-[#2E5BFF] line-clamp-2 h-[56px] flex items-center">
                                      {lesson.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" />
                                        Lesson {index + 1}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Trophy className="h-3 w-3" />
                                        {lesson.learning_objectives ? lesson.learning_objectives.split(',').length : 3} objectives
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Description - Fixed Height */}
                              <div className="mb-4">
                                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 h-[60px] flex items-start">
                                  {lesson.description}
                                </p>
                              </div>

                              {/* Learning Objectives - Fixed Height */}
                              <div className="mb-4 flex-1">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 h-[100px] flex flex-col">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Target className="h-4 w-4 text-[#2E5BFF]" />
                                    <span className="text-sm font-medium text-white">Key Learning Goals</span>
                                  </div>
                                  <div className="space-y-1 flex-1 overflow-hidden">
                                    {lesson.learning_objectives ? (
                                      lesson.learning_objectives.split('.').slice(0, 2).map((objective: string, i: number) => (
                                        objective.trim() && (
                                          <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                            <div className="w-1 h-1 bg-[#2E5BFF] rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="line-clamp-1">{objective.trim()}</span>
                                          </div>
                                        )
                                      ))
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                        Objectives will be revealed during the lesson
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Lesson Stats - Fixed Height */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between h-[32px]">
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {lesson.modules_count && (
                                      <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                                        <Clock className="h-3 w-3 text-[#2E5BFF]" />
                                        {lesson.modules_count} modules
                                      </span>
                                    )}
                                    {lesson.estimated_minutes && (
                                      <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                                        <Timer className="h-3 w-3 text-[#2E5BFF]" />
                                        {lesson.estimated_minutes} min
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Progress Preview (placeholder) */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                      <div className="w-0 h-full bg-gradient-to-r from-[#2E5BFF] to-[#60A5FA] rounded-full transition-all duration-500"></div>
                                    </div>
                                    <span className="text-xs text-gray-500">0%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Prerequisites - Fixed Height */}
                              <div className="mb-4 h-[36px] flex items-center">
                                {lesson.prerequisites ? (
                                  <div className="w-full p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Info className="h-3 w-3 text-amber-400 flex-shrink-0" />
                                      <span className="text-xs text-amber-300 font-medium">Prerequisites:</span>
                                      <span className="text-xs text-amber-200 truncate">{lesson.prerequisites}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Trophy className="h-3 w-3 text-green-400" />
                                      <span className="text-xs text-green-300 font-medium">No prerequisites required</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Button - Fixed at Bottom */}
                              <div className="mt-auto">
                                <button
                                  onClick={() => handleLessonClick(lesson)}
                                  className="w-full bg-gradient-to-r from-[#2E5BFF] to-[#1E40AF] hover:from-[#2343C3] hover:to-[#1E3A8A] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 ease-out flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-[#2E5BFF]/25 transform hover:scale-[1.01] active:scale-[0.99]"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Start Learning
                                  <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                                </button>
                              </div>

                              {/* Subtle Hover Glow Effect */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#2E5BFF]/0 via-[#2E5BFF]/5 to-[#2E5BFF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Show instruction when no topic is selected */}
                {!selectedTopic && (
          <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#2E5BFF]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-[#2E5BFF]" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Select a Topic to Begin
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Choose one of the topics above to explore available lessons and start learning with AI.
            </p>
          </div>
                )}
              </div>
            )}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="sessions" className="flex-1 p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[#2E5BFF] rounded-2xl flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Learning History</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                Track your progress and revisit previous learning sessions to reinforce your knowledge.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#2E5BFF]" />
                  <span>Session Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#2E5BFF]" />
                  <span>Progress Tracking</span>
                </div>
              </div>
          </div>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="quiz" className="flex-1 p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[#2E5BFF] rounded-2xl flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Knowledge Testing</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                Test your understanding with interactive quizzes and challenges tailored to your learning progress.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#2E5BFF]" />
                  <span>Interactive Quizzes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#2E5BFF]" />
                  <span>Skill Assessment</span>
                </div>
              </div>
          </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SoloRoomRefactored; 