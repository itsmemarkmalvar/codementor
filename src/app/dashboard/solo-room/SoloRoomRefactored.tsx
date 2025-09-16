"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Book, FolderOpen, MessageSquare, Lightbulb, ScrollText, Play, Palette, Settings, Monitor, Code2, Zap, Trophy, Clock, Target, Brain, GraduationCap, BookOpen, Timer, Info, ArrowRight, Users } from 'lucide-react';
import { getTopics, updateProgress as apiUpdateProgress, getLessonPlans, heartbeat, getProgressSummary, getModuleQuizzes, getQuiz, startQuizAttempt, submitQuizAttempt, getLessonModules, getPistonHealth, startSplitScreenSession, getActiveSession, endSession, recordUserChoice, requestClarification, incrementEngagement, getCurrentUser, getActivePreservedSessionByLesson, createAIPreferenceLog, getLessonTopicId, getLessonPlanProgress, updateModuleProgress, getLessonPracticeProblems, getThresholdStatus, getUserSessionHistory, reactivatePreservedSession, getLessonPlanDetails } from '@/services/api';
import { progressSync } from '@/utils/crossTabSync';

// Compact per-lesson progress bar that fetches backend percentage
const LessonProgressBar: React.FC<{ lessonId: number }> = ({ lessonId }) => {
  const [percent, setPercent] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);

  const fetchProgress = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLessonPlanProgress(lessonId);
      // Prefer engagement-based value to match Lesson Library display
      const p = Math.max(0, Math.min(100, Number(
        (data?.engagement_overall_percentage ?? data?.overall_percentage ?? 0)
      )));
      setPercent(p);
    } catch (e) {
      // Keep previous percent on error
      console.error('Failed to fetch lesson progress', e);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  React.useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  React.useEffect(() => {
    // Refresh when progress updates are broadcast (quiz/practice/lesson events)
    const unsub = progressSync.onProgressUpdate((_data) => {
      fetchProgress();
    });
    return () => { unsub(); };
  }, [fetchProgress]);

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2E5BFF] to-[#60A5FA] rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-500 min-w-[28px]">{loading ? '...' : `${percent}%`}</span>
      </div>
    </div>
  );
};
import { toast } from 'sonner';
import { isAuthenticated, getToken } from '@/lib/auth-utils';

// Import custom hooks
import { useTutorChat } from '@/hooks/useTutorChat';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useEngagementTracker } from '@/hooks/useEngagementTracker';
import { useSession } from '@/contexts/SessionContext';

// Import refactored components
import { ChatInterface } from '@/components/solo-room/ChatInterface';
import { CodeEditor } from '@/components/solo-room/CodeEditor';
import { FileExplorer } from '@/components/solo-room/FileExplorer';
import { FileTabs } from '../../../components/solo-room/FileTabs';
import { SplitScreenChatInterface } from '@/components/solo-room/SplitScreenChatInterface';
import { AIPreferenceModal } from '@/components/ui/AIPreferenceModal';
import { LessonCompletionModal } from '@/components/ui/LessonCompletionModal';

// Types
interface Topic {
  id: number;
  title: string;
  description?: string;
  difficulty_level?: string;
  parent_id?: number | null;
  order?: number;
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  topic_id: number;
  lesson_plan_id: number;
  order_index: number;
  description?: string;
  examples?: string;
  key_points?: string;
  guidance_notes?: string;
  estimated_minutes?: number;
  teaching_strategy?: any;
  common_misconceptions?: any;
  is_published?: boolean;
}

const SoloRoomRefactored = () => {
  // Core state
  const [activeTab, setActiveTab] = useState<'chat' | 'lesson-plans' | 'sessions' | 'quiz'>('chat');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  
  // Add lesson plans state
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [isLoadingLessonPlans, setIsLoadingLessonPlans] = useState(false);
  const [moduleQuizzes, setModuleQuizzes] = useState<any[]>([]);
  const [lessonModules, setLessonModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [quizElapsedSec, setQuizElapsedSec] = useState(0);
  const [quizTimerId, setQuizTimerId] = useState<NodeJS.Timeout | null>(null);
  const [quizResponses, setQuizResponses] = useState<Record<number, any>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizCompletionData, setQuizCompletionData] = useState<any>(null);
  const [practiceCompletionData, setPracticeCompletionData] = useState<any>(null);
  const [pistonHealth, setPistonHealth] = useState<{ok:boolean; latency_ms?: number}|null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyTopicFilter, setHistoryTopicFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  
  // Project state (simplified for demo)
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileParentPath, setNewFileParentPath] = useState('/');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [isCreatingDirectory, setIsCreatingDirectory] = useState(false);

  // Split-screen mode state (now default)
  const [isSplitScreenMode, setIsSplitScreenMode] = useState(true);
  const [splitScreenSession, setSplitScreenSession] = useState<any>(null);
  const [showAIPreferenceModal, setShowAIPreferenceModal] = useState(false);
  const [showLessonCompletionModal, setShowLessonCompletionModal] = useState(false);
  const [engagementTriggered, setEngagementTriggered] = useState(false);
  const [lastThresholdTime, setLastThresholdTime] = useState<number>(0);
  const [preferencePollType, setPreferencePollType] = useState<'quiz' | 'practice' | 'code_execution'>('quiz');
  const [isAnalyzingCode, setIsAnalyzingCode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Use custom hooks
  const {
    messages,
    combinedMessages,
    isLoading: isChatLoading,
    tutorPreferences,
    sendMessage,
    sendSplitScreenMessage,
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

  // Use the new session system
  const { 
    currentSession, 
    initializeSession, 
    deactivateSession,
    syncConversationWithBackend,
    isConversationSynced,
    loadSessionMetadata, 
    saveSessionMetadata, 
    syncMetadataWithBackend,
    isMetadataSynced,
    setCurrentSession,
    saveConversationHistory
  } = useSession();

  // Engagement tracking for split-screen mode with TWO-STAGE THRESHOLD SYSTEM
  const {
    engagementScore,
    isQuizThresholdReached,
    isPracticeThresholdReached,
    triggeredActivity,
    assessmentSequence,
    isTracking,
    trackMessage,
    trackCodeExecution,
    trackScroll,
    trackInteraction,
    trackQuizCompletion,
    trackPracticeCompletion,
    startTracking,
    stopTracking,
    resetTracking,
    getEngagementAnalytics,
    syncThresholdStatusWithBackend
  } = useEngagementTracker({
    quizThreshold: 30,      // Quiz triggers at 30 engagement points
    practiceThreshold: 70,  // Practice triggers at 70 engagement points
    sessionId: splitScreenSession?.id,
    userId: currentUser?.id?.toString() || undefined,
    autoTrigger: true, // Enable automatic quiz/practice triggering
    onQuizTrigger: () => {
      // Auto-trigger quiz first (sequential flow)
      handleAutoTriggerQuiz();
    },
    onPracticeTrigger: () => {
      // Auto-trigger practice after quiz completion
      handleAutoTriggerPractice();
    },
    onPreferencePoll: () => {
      // Show preference poll after quiz/practice completion
      setShowAIPreferenceModal(true);
    },
    onLessonCompletion: () => {
      // Show lesson completion modal
      setShowLessonCompletionModal(true);
    }
  });

  // If user returns with a PreservedSession but no SplitScreenSession, ensure one exists and restore engagement
  useEffect(() => {
    (async () => {
      try {
        if (!currentSession || splitScreenSession?.id) return;

        // Try to bind to an active split-screen session for this lesson first
        const active = await getActiveSession({ lesson_id: currentSession.lesson_id });
        if (active?.data?.session?.id) {
          const s = active.data.session;
          setSplitScreenSession({
            id: s.id,
            session_type: s.session_type,
            ai_models: s.ai_models_used,
            started_at: s.started_at
          });
          return;
        }

        // Otherwise create/reactivate one based on the preserved session's lesson/topic
        const lessonId = currentSession.lesson_id;
        if (!lessonId) return;
        let topicId: number | undefined = undefined;
        try {
          const topicResp = await getLessonTopicId(lessonId);
          topicId = (topicResp as any)?.topic_id ?? (topicResp as any)?.data?.topic_id;
        } catch (e) {
          console.warn('Could not resolve topic for lesson', lessonId, e);
        }

        const newSession = await startSplitScreenSession({
          topic_id: topicId,
          lesson_id: lessonId,
          session_type: 'comparison',
          ai_models: ['gemini', 'together']
        });
        if (newSession?.data?.session_id) {
          setSplitScreenSession({
            id: newSession.data.session_id,
            session_type: newSession.data.session_type,
            ai_models: newSession.data.ai_models,
            started_at: newSession.data.started_at
          });
        }
      } catch (e) {
        console.error('Failed to ensure split-screen session from preserved session:', e);
      }
    })();
  }, [currentSession, splitScreenSession?.id]);

  // Ensure engagement tracking starts when a preserved session exists (better UX)
  // This allows engagement to accrue even if a SplitScreenSession hasn't been created yet
  useEffect(() => {
    if (isSplitScreenMode && !isTracking && (splitScreenSession?.id || currentSession?.session_identifier)) {
      startTracking();
    }
  }, [isSplitScreenMode, isTracking, splitScreenSession?.id, currentSession?.session_identifier, startTracking]);

  // Auto-trigger quiz function
  const handleAutoTriggerQuiz = async () => {
    try {
      // Resolve lesson id from state, preserved session, or metadata
      let lessonIdResolved: number | undefined = selectedLesson?.id as any;
      if (!lessonIdResolved && currentSession?.lesson_id) lessonIdResolved = Number(currentSession.lesson_id);
      if (!lessonIdResolved) {
        try {
          const md = loadSessionMetadata?.();
          const lid = md?.lesson_data?.id;
          if (lid) lessonIdResolved = Number(lid);
        } catch {}
      }

      // If all quizzes for the lesson are passed, do not auto-redirect to the quiz tab
      if (lessonIdResolved) {
        const completed = await areAllLessonQuizzesPassed(Number(lessonIdResolved));
        if (completed) {
          toast.message('Quiz unlocked – all quizzes for this lesson are already completed.');
          return;
        }
      }

      // Ensure we have a module selected; if not, load the first module of the current lesson
      let moduleIdToUse = selectedModuleId;
      if (!moduleIdToUse) {
        if (!lessonIdResolved) {
          // As a last resort, prompt user only when no lesson id can be recovered
          toast.message('Quiz unlocked – select a lesson from the Lessons tab first.');
          return;
        }
        try {
          const modules = await getLessonModules(Number(lessonIdResolved));
          setLessonModules(modules || []);
          if (Array.isArray(modules) && modules.length > 0) {
            moduleIdToUse = modules[0].id;
            setSelectedModuleId(moduleIdToUse);
            // Bind lesson object if we only had the id
            if (!selectedLesson && selectedTopic?.id) {
              try {
                const plans = await getLessonPlans(selectedTopic.id);
                const found = Array.isArray(plans) ? plans.find((l: any) => l.id === lessonIdResolved) : null;
                if (found) setSelectedLesson(found);
              } catch {}
            }
          } else {
            toast.message('Quiz unlocked – this lesson has no modules yet. Please pick another lesson.');
            return;
          }
        } catch (e) {
          console.error('Failed to load modules for lesson', selectedLesson?.id, e);
          toast.error('Unable to load modules for this lesson');
          return;
        }
      }

      // Get available quizzes for the current module
      const quizzesResponse = await getModuleQuizzes(Number(moduleIdToUse));
      const quizzes = quizzesResponse.quizzes || [];
      if (quizzes.length === 0) {
        toast.message('Quiz unlocked – no quizzes available in this module yet.');
        return;
      }

      // Select a random quiz or the first available one
      const selectedQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];
      
      // Mark module as in progress and broadcast
      try { await updateModuleProgress(Number(moduleIdToUse), { status: 'in_progress' }); progressSync.notifyProgressUpdate({ type: 'lesson', progress: 0, sessionId: Number(splitScreenSession?.id || 0) }); } catch {}
      const attempt = await startQuizAttempt(selectedQuiz.id);
      setActiveQuiz(selectedQuiz);
      setActiveAttempt(attempt);
      setQuizResponses({});
      setQuizElapsedSec(0);
      
      // Start timer
      const timerId = setInterval(() => {
        setQuizElapsedSec(prev => prev + 1);
      }, 1000);
      setQuizTimerId(timerId);
      
      // Switch to quiz tab
      setActiveTab('quiz');
      toast.success('Quiz started! Test your knowledge.');
    } catch (error) {
      console.error('Error auto-triggering quiz:', error);
      toast.error('Failed to start quiz');
    }
  };

  // Helper to check if all quizzes across lesson modules are already passed
  const areAllLessonQuizzesPassed = async (lessonId: number): Promise<boolean> => {
    try {
      const modules = await getLessonModules(lessonId);
      if (!Array.isArray(modules) || modules.length === 0) return true; // nothing to take
      for (const mod of modules) {
        try {
          const res = await getModuleQuizzes(Number(mod.id));
          const quizzes = res?.quizzes || [];
          // If any quiz is not passed, user is not done
          const hasUnpassed = quizzes.some((q: any) => q?.passed !== true);
          if (hasUnpassed) return false;
        } catch {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // Auto-trigger practice function
  const handleAutoTriggerPractice = async () => {
    try {
      // Resolve lesson id from selected state, active session, or preserved metadata
      let lessonIdResolved: number | undefined = (selectedLesson as any)?.id ? Number((selectedLesson as any).id) : undefined;
      if (!lessonIdResolved && (currentSession as any)?.lesson_id) {
        lessonIdResolved = Number((currentSession as any).lesson_id);
      }
      if (!lessonIdResolved) {
        try {
          const md = loadSessionMetadata?.();
          const lid = md?.lesson_data?.id;
          if (lid) lessonIdResolved = Number(lid);
        } catch {}
      }

      // If still not resolved, show gentle notice (don't block future attempts)
      if (!lessonIdResolved) {
        toast.error('No lesson selected for practice');
        return;
      }

      // Gate: if practice already completed for this session, do not redirect
      try {
        // Local guard: if user just completed practice in this browser
        try {
          const lcFlag = typeof window !== 'undefined' ? localStorage.getItem('practiceCompleted') : null;
          const lcTime = typeof window !== 'undefined' ? Number(localStorage.getItem('practiceCompletionTime') || 0) : 0;
          const recent = lcFlag === 'true' && (Date.now() - lcTime) < 6 * 60 * 60 * 1000; // 6 hours
          if (recent) {
            toast.info('You recently completed a practice. Continue in split screen.');
            return;
          }
        } catch {}

        if (splitScreenSession?.id) {
          const ts = await getThresholdStatus(Number(splitScreenSession.id));
          const completed = !!ts?.data?.threshold_status?.practice_completed;
          if (completed) {
            toast.info('Practice already completed for this lesson. Continue in split screen.');
            return;
          }
        }
      } catch {}

      // Fetch practice problems related to the resolved lesson
      const problems = await getLessonPracticeProblems(Number(lessonIdResolved));
      if (Array.isArray(problems) && problems.length > 0) {
        const first = problems[0];
        window.location.href = `/dashboard/practice/problems/${first.id}`;
        toast.success('Practice started!');
        return;
      }

      // Fallback: derive topic and open practice hub
      let topicIdResolved: number | undefined = selectedTopic?.id;
      if (!topicIdResolved) {
        try {
          const t = await getLessonTopicId(Number(lessonIdResolved));
          if (t) topicIdResolved = Number(t);
        } catch {}
      }
      if (topicIdResolved) {
        window.location.href = `/dashboard/practice/${topicIdResolved}`;
        toast.success('Practice hub opened for your topic.');
        return;
      }

      window.location.href = `/dashboard/practice`;
      toast.success('Practice hub opened.');
    } catch (error) {
      console.error('Error auto-triggering practice:', error);
      toast.error('Failed to start practice session');
    }
  };

  // Track last user activity globally for heartbeat gating
  const lastActivityRef = useRef<number>(Date.now());



  // Split-screen session management
  const endSplitScreenSession = async () => {
    if (!splitScreenSession?.id) {
      console.log('No active session to end');
      setSplitScreenSession(null);
      stopTracking();
      resetTracking();
      setEngagementTriggered(false);
      setLastThresholdTime(0);
      return;
    }

    try {
      // Ensure we have a numeric session ID
      const sessionId = typeof splitScreenSession.id === 'number' ? splitScreenSession.id : parseInt(splitScreenSession.id);
      if (isNaN(sessionId)) {
        console.error('Invalid session ID for ending session:', splitScreenSession.id);
        setSplitScreenSession(null);
        stopTracking();
        resetTracking();
        setEngagementTriggered(false);
        setLastThresholdTime(0);
        return;
      }
      
      await endSession(sessionId);
      setSplitScreenSession(null);
      stopTracking();
      resetTracking();
      setEngagementTriggered(false);
      setLastThresholdTime(0);
      toast.success('Split-screen session ended');
    } catch (error) {
      console.error('Error ending split-screen session:', error);
      // Even if ending fails, clear the local state
      setSplitScreenSession(null);
      stopTracking();
      resetTracking();
      setEngagementTriggered(false);
      setLastThresholdTime(0);
      toast.error('Failed to end split-screen session');
    }
  };

  const handleUserChoice = async (choice: string, reason?: string) => {
    if (!splitScreenSession?.id) {
      console.log('No active session for user choice - skipping');
      setShowAIPreferenceModal(false);
      // Only show lesson completion modal for quiz/practice and when progress is complete
      if (preferencePollType !== 'code_execution') {
        if (await shouldShowLessonCompletion()) {
          setShowLessonCompletionModal(true);
        }
      }
      setEngagementTriggered(false);
      return;
    }

    try {
      // Ensure we have a numeric session ID
      const sessionId = typeof splitScreenSession.id === 'number' ? splitScreenSession.id : parseInt(splitScreenSession.id);
      if (isNaN(sessionId)) {
        console.error('Invalid session ID for user choice:', splitScreenSession.id);
        setShowAIPreferenceModal(false);
        setEngagementTriggered(false);
        return;
      }
      
      // ✅ ENHANCED: Create comprehensive AI preference log with performance data
      let preferenceLogData: any = {
        session_id: sessionId,
        chosen_ai: choice,
        choice_reason: reason,
        interaction_type: preferencePollType,
        topic_id: currentSession?.lesson_id ? await getLessonTopicId(currentSession.lesson_id) : null,
        difficulty_level: 'medium', // Default, can be enhanced later
        attempt_count: 1
      };

      // Add performance data based on interaction type
      if (preferencePollType === 'quiz' && quizCompletionData) {
        preferenceLogData = {
          ...preferenceLogData,
          performance_score: quizCompletionData.score,
          success_rate: quizCompletionData.passed ? 100 : (quizCompletionData.percentage || 0),
          time_spent_seconds: quizCompletionData.time_spent_seconds,
          context_data: {
            quiz_id: quizCompletionData.quiz_id,
            score: quizCompletionData.score,
            percentage: quizCompletionData.percentage,
            passed: quizCompletionData.passed,
            session_id: quizCompletionData.session_id
          }
        };
      } else if (preferencePollType === 'practice' && practiceCompletionData) {
        preferenceLogData = {
          ...preferenceLogData,
          performance_score: practiceCompletionData.points_earned,
          success_rate: practiceCompletionData.is_correct ? 100 : 0,
          time_spent_seconds: practiceCompletionData.time_spent_seconds,
          context_data: {
            problem_id: practiceCompletionData.problem_id,
            is_correct: practiceCompletionData.is_correct,
            points_earned: practiceCompletionData.points_earned,
            complexity_score: practiceCompletionData.complexity_score,
            session_id: practiceCompletionData.session_id
          }
        };
      }

      // Create AI preference log
      await createAIPreferenceLog(preferenceLogData);

      // Record user choice for split-screen session (for backward compatibility)
      await recordUserChoice(sessionId, { 
        choice: choice as 'gemini' | 'together' | 'both' | 'neither', 
        reason,
        activity_type: preferencePollType
      });

      setShowAIPreferenceModal(false);
      
      // Only show lesson completion modal for quiz/practice and when progress is complete
      if (preferencePollType !== 'code_execution') {
        if (await shouldShowLessonCompletion()) {
          setShowLessonCompletionModal(true);
        }
      }
      
      // Reset engagement to prevent immediate re-triggering
      setEngagementTriggered(false);
      
      // Show success message for all activity types
      toast.success('Thank you for your feedback!');

      // Clear completion data
      setQuizCompletionData(null);
      setPracticeCompletionData(null);
    } catch (error) {
      console.error('Error recording user choice:', error);
      // Continue anyway - close modal and show completion
      setShowAIPreferenceModal(false);
      if (preferencePollType !== 'code_execution') {
        setShowLessonCompletionModal(true);
      }
      setEngagementTriggered(false);
      toast.error('Failed to record your choice');
    }
  };

  const handleClarificationRequest = async (request: string) => {
    if (!splitScreenSession?.id) {
      console.log('No active session for clarification request - skipping');
      setShowLessonCompletionModal(false);
      setEngagementTriggered(false);
      toast.success('Clarification request sent');
      return;
    }

    try {
      // Ensure we have a numeric session ID
      const sessionId = typeof splitScreenSession.id === 'number' ? splitScreenSession.id : parseInt(splitScreenSession.id);
      if (isNaN(sessionId)) {
        console.error('Invalid session ID for clarification request:', splitScreenSession.id);
        setShowLessonCompletionModal(false);
        setEngagementTriggered(false);
        toast.success('Clarification request sent');
        return;
      }
      
      await requestClarification(sessionId, { request });
      setShowLessonCompletionModal(false);
      toast.success('Clarification request sent');
      // Reset engagement to prevent immediate re-triggering
      setEngagementTriggered(false);
    } catch (error) {
      console.error('Error requesting clarification:', error);
      // Continue anyway - close modal
      setShowLessonCompletionModal(false);
      setEngagementTriggered(false);
      toast.error('Failed to send clarification request');
    }
  };

  // Handle lesson completion
  const handleLessonCompletion = () => {
    // Show lesson completion modal
    setShowLessonCompletionModal(true);
  };

  // Decide whether to show lesson completion modal based on backend progress
  const shouldShowLessonCompletion = async (): Promise<boolean> => {
    try {
      const lessonPlanId = (selectedLesson as any)?.lesson_plan_id || (selectedLesson as any)?.id || (currentSession as any)?.lesson_id;
      if (!lessonPlanId || typeof lessonPlanId !== 'number') return false;
      const data = await getLessonPlanProgress(lessonPlanId);
      const percent = Number(data?.engagement_overall_percentage ?? data?.overall_percentage ?? 0);
      return percent >= 100;
    } catch (e) {
      console.warn('Unable to compute lesson completion progress:', e);
      return false;
    }
  };

  // Function to check if lesson is complete (can be called from various places)
  const checkLessonCompletion = () => {
    // This could be based on various criteria:
    // - Quiz completion with passing score
    // - Practice completion
    // - Time spent on lesson
    // - User manually marking as complete
    
    // For now, we'll trigger it after quiz completion
    // This can be enhanced with more sophisticated logic
  };

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

    // Initialize session and sync conversation on mount
    const initializeSessionAndSync = async () => {
      try {
        // Check if user is authenticated
        const token = getToken();
        if (token) {
          // Get the current user to get their ID
          const userResponse = await getCurrentUser();
          const userId = userResponse.user?.id?.toString();
          
          // Set current user state
          setCurrentUser(userResponse.user);
          
          if (userId) {
            console.log('Initializing session for user:', userId);
            // Initialize session for the current user
            const session = await initializeSession(userId);
            
            // Only sync if a session was found (session will be created when user starts conversation)
            if (session) {
              // Sync conversation with backend after a short delay
              setTimeout(async () => {
                await syncConversationWithBackend();
              }, 1000);
            }
          } else {
            console.error('Could not get user ID from response:', userResponse);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
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
    initializeSessionAndSync();
  }, []); // Empty dependency array - run only once

      // Load session data when currentSession changes or when topics are loaded
  const didHydrateFromMetadataRef = React.useRef<string | null>(null);
    useEffect(() => {
      const sessionId = currentSession?.session_identifier || null;
      console.log('Session data loading effect triggered. sessionId:', sessionId, 'topics.length:', topics.length, 'hydratedFor:', didHydrateFromMetadataRef.current);
      const loadSessionData = async () => {
        if (currentSession) {
          if (didHydrateFromMetadataRef.current === sessionId) {
            return;
          }
          console.log('Current session:', currentSession);
          const metadata = loadSessionMetadata();
          console.log('Loading session metadata:', metadata);
        
        // Load topic data
        if (!selectedTopic && metadata.topic_data && topics.length > 0) {
          const savedTopic = topics.find(t => t.id === metadata.topic_data.id);
          if (savedTopic) {
            console.log('Loading saved topic from session:', savedTopic.title);
            setSelectedTopic(savedTopic);
          } else {
            console.log('Topic not found in topics array:', metadata.topic_data.id, 'Available topics:', topics.map(t => ({ id: t.id, title: t.title })));
          }
        }
        
        // Load lesson data - we need to fetch lesson plans first if topic is available
        if (!selectedLesson && metadata.lesson_data && metadata.topic_data) {
          try {
            console.log('Fetching lesson plans for topic:', metadata.topic_data.id);
            // Fetch lesson plans for the topic
            const plans = await getLessonPlans(metadata.topic_data.id);
            console.log('Fetched lesson plans:', plans);
            if (plans && Array.isArray(plans)) {
              const savedLesson = plans.find(l => l.id === metadata.lesson_data.id);
              if (savedLesson) {
                console.log('Loading saved lesson from session:', savedLesson.title);
                setSelectedLesson(savedLesson);
              } else {
                console.log('Lesson not found in plans:', metadata.lesson_data.id, 'Available lessons:', plans.map(l => ({ id: l.id, title: l.title })));
              }
            }
          } catch (error) {
            console.error('Error loading lesson from session:', error);
          }
        }
        // mark hydrated for this session to avoid overriding later topic selections
        didHydrateFromMetadataRef.current = sessionId;
      }
    };
    
    // Load session data when session changes or when topics are available
    if (currentSession && topics.length > 0) {
      loadSessionData();
    }
  }, [currentSession, topics, loadSessionMetadata, selectedTopic, selectedLesson]);

  // Save active tab to session metadata when it changes
  useEffect(() => {
    if (currentSession && activeTab) {
      try {
        const metadata = {
          user_preferences: {
            last_active_tab: activeTab
          }
        };
        saveSessionMetadata(metadata);
        console.log('Saved active tab to session metadata:', activeTab);
      } catch (error) {
        console.error('Error saving active tab to session metadata:', error);
      }
    }
  }, [currentSession, activeTab, saveSessionMetadata]);

  // Load active tab from session metadata when session is loaded
  useEffect(() => {
    if (currentSession) {
      try {
        const metadata = loadSessionMetadata();
        const lastActiveTab = metadata.user_preferences?.last_active_tab;
        
        if (lastActiveTab && lastActiveTab !== activeTab) {
          console.log('Restoring last active tab from session:', lastActiveTab);
          setActiveTab(lastActiveTab as 'chat' | 'lesson-plans' | 'sessions' | 'quiz');
        }
      } catch (error) {
        console.error('Error loading active tab from session metadata:', error);
      }
    }
  }, [currentSession, loadSessionMetadata]); // Removed activeTab to prevent infinite loop

  // Fallback: if metadata is missing but PreservedSession has lesson_id, bind lesson and topic
  useEffect(() => {
    (async () => {
      if (!currentSession?.lesson_id || selectedLesson || topics.length === 0) return;
      try {
        // Resolve topic from lesson id
        const topicResp = await getLessonTopicId(currentSession.lesson_id);
        const topicId = (topicResp as any)?.topic_id ?? (topicResp as any)?.data?.topic_id;
        if (topicId) {
          const topic = topics.find(t => t.id === Number(topicId));
          if (topic) setSelectedTopic(topic);
          const plans = await getLessonPlans(Number(topicId));
          const lesson = Array.isArray(plans) ? plans.find((l: any) => l.id === currentSession.lesson_id) : null;
          if (lesson) setSelectedLesson(lesson as any);
        }
      } catch (e) {
        console.warn('Fallback binding of lesson from preserved session failed', e);
      }
    })();
  }, [currentSession?.lesson_id, selectedLesson, topics]);

  // Do NOT auto-switch tabs away from quiz/chat; keep user context stable
  useEffect(() => {
    if (!selectedLesson || !currentSession) return;
    // Only set tab if no tab is chosen yet (initial state) – avoid overriding quiz/chat
    if (!activeTab) {
      setActiveTab('chat');
    }
  }, [selectedLesson, currentSession]);

  // When user lands on the Quiz tab, make sure module is selected and quizzes are loaded
  useEffect(() => {
    (async () => {
      if (activeTab !== 'quiz') return;
      // Ensure we have a lesson and (at least) a module
      if (!selectedLesson?.id) return;
      let moduleId = selectedModuleId;
      if (!moduleId) {
        try {
          const modules = await getLessonModules(selectedLesson.id);
          setLessonModules(modules || []);
          if (Array.isArray(modules) && modules.length > 0) {
            moduleId = modules[0].id;
            setSelectedModuleId(moduleId);
          }
        } catch {}
      }
      if (!moduleId) return;
      try {
        const res = await getModuleQuizzes(Number(moduleId));
        setModuleQuizzes(res?.quizzes || []);
        // If quizzes exist and no active attempt yet, keep UI ready; auto-start is handled by threshold trigger
      } catch (e) {
        console.warn('Failed to load module quizzes on quiz tab open', e);
      }
    })();
  }, [activeTab, selectedLesson?.id, selectedModuleId]);

  // Fetch Piston health
  useEffect(() => {
    getPistonHealth().then(setPistonHealth).catch(()=>setPistonHealth({ok:false} as any));
    // Initial load of progress summary and apply RL difficulty
    (async () => {
      try {
        const s = await getProgressSummary();
        setSummary(s);
        const next = s?.rl?.difficulty_next as 'increase' | 'decrease' | 'same' | undefined;
        if (next) {
          const mapped = next === 'increase' ? 'advanced' : next === 'decrease' ? 'beginner' : 'medium';
          updatePreferences({ challengeDifficulty: mapped });
        }
      } catch {}
    })();
    // Periodically refresh summary to keep badge up-to-date
    const summaryTimer = setInterval(async () => {
      try {
        const s = await getProgressSummary();
        setSummary(s);
        const next = s?.rl?.difficulty_next as 'increase' | 'decrease' | 'same' | undefined;
        if (next) {
          const mapped = next === 'increase' ? 'advanced' : next === 'decrease' ? 'beginner' : 'medium';
          updatePreferences({ challengeDifficulty: mapped });
        }
      } catch {}
    }, 60000);

    // Periodically sync conversation with backend
    const conversationSyncTimer = setInterval(async () => {
      try {
        if (currentSession && !isConversationSynced) {
          await syncConversationWithBackend();
        }
      } catch (error) {
        console.error('Error syncing conversation:', error);
      }
    }, 30000); // Sync every 30 seconds

    // Periodically sync metadata with backend
    const metadataSyncTimer = setInterval(async () => {
      try {
        if (currentSession && !isMetadataSynced) {
          await syncMetadataWithBackend();
        }
      } catch (error) {
        console.error('Error syncing metadata:', error);
      }
    }, 30000); // Sync every 30 seconds

    return () => {
      clearInterval(summaryTimer);
      clearInterval(conversationSyncTimer);
      clearInterval(metadataSyncTimer);
    };
  }, [currentSession, isConversationSynced, isMetadataSynced, updatePreferences]);



  // Render a small Piston health badge helper
  const renderPistonHealth = () => (
    pistonHealth ? (
      <span className={`ml-2 text-xs px-2 py-1 rounded ${pistonHealth.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
        Remote execution: {pistonHealth.ok ? `OK${typeof pistonHealth.latency_ms==='number' ? ` · ${pistonHealth.latency_ms}ms` : ''}` : 'Unavailable'}
      </span>
    ) : null
  );

  // Track in-flight requests and guard against stale responses to prevent flicker
  const lessonPlansAbortRef = React.useRef<AbortController | null>(null);
  const lessonPlansReqIdRef = React.useRef(0);
  const [pendingTopicId, setPendingTopicId] = useState<number | null>(null);

  // Debounced trigger for reloads when the topic changes rapidly
  const debouncedReloadRef = React.useRef<number | null>(null);

  // Fetch lesson plans when a topic is selected and on progress broadcasts (unlocking after completion)
  const reloadLessonPlans = React.useCallback(async (opts?: { reason?: string; debounceMs?: number }) => {
    const topicId = selectedTopic?.id;
    if (!topicId) {
      setLessonPlans([]);
      return;
    }

    // Debounce optional
    const debounceMs = opts?.debounceMs ?? 0;
    if (debounceMs > 0) {
      if (debouncedReloadRef.current) {
        window.clearTimeout(debouncedReloadRef.current);
      }
      debouncedReloadRef.current = window.setTimeout(() => {
        reloadLessonPlans({ reason: 'debounced' });
      }, debounceMs);
      return;
    }

    // Mark pending topic id (used by UI to avoid clearing list instantly)
    setPendingTopicId(topicId);

    // Cancel previous request
    if (lessonPlansAbortRef.current) {
      try { lessonPlansAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    lessonPlansAbortRef.current = controller;

    // Sequence guard
    const reqId = ++lessonPlansReqIdRef.current;
    setIsLoadingLessonPlans(true);
    try {
      const plans = await getLessonPlans(topicId, { signal: controller.signal });
      // Ignore stale responses
      if (reqId !== lessonPlansReqIdRef.current) return;
      setLessonPlans(plans || []);
    } catch (error: any) {
      // Ignore cancellations
      if (error?.name === 'CanceledError' || error?.message === 'canceled' || error?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching lesson plans:', error);
      // Keep previous list to avoid flash; surface toast once
      toast.error('Failed to load lessons');
    } finally {
      if (reqId === lessonPlansReqIdRef.current) {
        setIsLoadingLessonPlans(false);
        setPendingTopicId(null);
      }
    }
  }, [selectedTopic?.id]);

  useEffect(() => {
    // Debounce initial load when topic changes to avoid flicker on rapid switches
    reloadLessonPlans({ debounceMs: 200, reason: 'topic-change' });
    return () => {
      if (debouncedReloadRef.current) {
        window.clearTimeout(debouncedReloadRef.current);
      }
    };
  }, [reloadLessonPlans]);

  useEffect(() => {
    // Throttle progress-driven reloads to once per 1500ms, and reload only if we have a topic
    let lastRun = 0;
    const unsub = progressSync.onProgressUpdate(() => {
      const now = Date.now();
      if (!selectedTopic) return;
      if (now - lastRun < 1500) return;
      lastRun = now;
      reloadLessonPlans({ reason: 'progress-update' });
    });
    return () => { unsub(); };
  }, [reloadLessonPlans, selectedTopic?.id]);

  // Topic selection handler
  const handleTopicSelect = async (topic: Topic) => {
    console.log('Topic selected:', topic);
    setSelectedTopic(topic);
    
    // Save topic data to session metadata (but don't create session)
    if (currentSession) {
      console.log('Saving topic data to session metadata. Topic:', topic.title);
      const metadata = {
        topic_data: {
          id: topic.id,
          title: topic.title,
          description: topic.description,
          difficulty_level: topic.difficulty_level
        }
      };
      console.log('Topic metadata to save:', metadata);
      setPendingSessionMetadata(metadata);
    } else {
      console.log('No current session available for saving topic metadata');
    }
    
    // Reset engagement state for new topic (but don't start tracking yet)
    setEngagementTriggered(false);
    setLastThresholdTime(0);
    
    // Clear any existing split screen session since we're switching topics
    setSplitScreenSession(null);
    
    console.log('Topic selected:', topic.title, '- No session created yet. Session will be created when user selects a lesson.');
  };

  // Message sending handler
  const handleSendMessage = async (message: string, topicId?: number, topicTitle?: string) => {
    // Mark as activity
    lastActivityRef.current = Date.now();
    // Use provided topic info or fall back to selected topic
    const topicToUse = selectedTopic || (topicId ? { id: topicId, title: topicTitle } : null);
    
    if (!topicToUse) {
      toast.error('Please select a topic first');
      return;
    }
    
    // Add lesson context if available
    let messageWithContext = message;
    if (selectedLesson) {
      messageWithContext = `Current Lesson: "${selectedLesson.title}"
${selectedLesson.description ? `Lesson Description: ${selectedLesson.description}` : ''}
${selectedLesson.key_points ? `Key Points: ${selectedLesson.key_points}` : ''}

User Question: ${message}`;
    }
    
    // Adapt message by current difficulty preference
    const difficulty = tutorPreferences?.challengeDifficulty || 'medium';
    const messageWithDifficulty = (() => {
      if (difficulty === 'beginner') {
        return `${messageWithContext}\n\nPlease explain step-by-step with simple examples and gentle pacing. Avoid jumping to advanced topics.`;
      }
      if (difficulty === 'advanced') {
        return `${messageWithContext}\n\nChallenge me with harder problems, fewer hints, and expect concise, expert-level explanations.`;
      }
      return messageWithContext;
    })();

    // Use split-screen message function for simultaneous AI responses
            await sendSplitScreenMessage(messageWithDifficulty, topicToUse.id, topicToUse.title || 'Learning Session', currentSession?.session_identifier || splitScreenSession?.session_identifier);
    
    // Track progress for sending a message
    updateProgress(1, 'interaction');
    
      // Track engagement for split-screen mode (only for significant interactions)
    if (splitScreenSession?.id && message.length > 20) { // Only track for substantial messages
      try {
        console.log('=== Engagement Debug ===');
        console.log('Session ID:', splitScreenSession.id);
        console.log('Session object:', splitScreenSession);
        console.log('Incrementing engagement for session:', splitScreenSession.id);
        
        // Ensure we have a numeric session ID
        const sessionId = typeof splitScreenSession.id === 'number' ? splitScreenSession.id : parseInt(splitScreenSession.id);
        if (isNaN(sessionId)) {
          console.error('Invalid session ID for engagement tracking:', splitScreenSession.id);
          return;
        }
        
        await incrementEngagement(sessionId, { points: 3 });
        console.log('Engagement increment successful');
      } catch (error: any) {
        console.error('Failed to increment engagement:', error);
        console.error('Error details:', error.response?.data || error.message);
        // Don't throw the error - continue with the chat functionality
      }
    } else if (!splitScreenSession?.id) {
      console.warn('No active split-screen session for engagement tracking');
      console.log('splitScreenSession state:', splitScreenSession);
    }
  };

  // Code execution handler (Green button - executes code via Judge0)
  const handleRunCode = async () => {
    // Mark as activity
    lastActivityRef.current = Date.now();
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }
    
    const result = await executeCode(codeInput, currentSessionId, selectedTopic.id);
    
    // Track progress for code execution
    updateProgress(2, 'code_execution');
    
    // Track engagement for split-screen mode (only for successful code execution)
    if (splitScreenSession?.id && result && result.success) {
      try {
        // Ensure we have a numeric session ID
        const sessionId = typeof splitScreenSession.id === 'number' ? splitScreenSession.id : parseInt(splitScreenSession.id);
        if (isNaN(sessionId)) {
          console.error('Invalid session ID for engagement tracking:', splitScreenSession.id);
        } else {
          await incrementEngagement(sessionId, { points: 5 });
        }
        trackCodeExecution();
        
        // Show AI preference poll for successful code execution
        // Only show if we have recent AI interactions (within last 5 minutes)
        const hasRecentAIInteraction = combinedMessages.some(msg => 
          msg.sender === 'bot' || msg.sender === 'ai'
        );
        
        if (hasRecentAIInteraction) {
          setPreferencePollType('code_execution');
          setTimeout(() => {
            setShowAIPreferenceModal(true);
          }, 2000); // 2 second delay after successful execution
        }
      } catch (error) {
        console.warn('Failed to increment engagement:', error);
        // Don't throw the error - continue with the functionality
      }
    } else if (!splitScreenSession?.id) {
      console.warn('No active split-screen session for engagement tracking');
    }
    
    return result;
  };

  // AI Analysis handler (Blue button - sends code to both AI models for analysis)
  const handleAnalyzeCode = async () => {
    
    if (!selectedTopic) {
      toast.error('Please select a topic first');
      return;
    }

    if (!codeInput.trim()) {
      toast.error('Please write some code to analyze');
      return;
    }

    // Mark as activity
    lastActivityRef.current = Date.now();
    
    // Show loading state and store the toast ID to dismiss it later
    const loadingToastId = toast.loading('Sending code to AI models for analysis...');
    
    // Set analyzing state
    setIsAnalyzingCode(true);
    
    // Create a message that includes the code for AI analysis
    const analysisMessage = `Please analyze this Java code and provide feedback on:
1. Code structure and organization
2. Best practices and potential improvements
3. Any bugs or issues you can identify
4. Suggestions for optimization

Here's the code:
\`\`\`java
${codeInput}
\`\`\`

Please provide detailed, constructive feedback.`;

    try {
      // Send to both AI models in split-screen mode
      const sessionId = currentSession?.session_identifier || splitScreenSession?.session_identifier;
      if (isSplitScreenMode) {
        const result = await sendSplitScreenMessage(analysisMessage, selectedTopic.id, selectedTopic.title, sessionId);
        
        // If a new session was created, update the session state
        if (result?.sessionId && !currentSession?.session_identifier) {
          console.log('New session created:', result.sessionId);
          // The session will be automatically created by the backend and returned in the response
          // We need to wait for the session to be available in the context
        }
        
        // Track engagement
        trackCodeExecution();
        
        // Switch to chat tab to show the analysis
        setActiveTab('chat');
        
        // Dismiss the loading toast and show success
        toast.dismiss(loadingToastId);
        toast.success('Code sent to AI models for analysis! Check the chat for feedback.', { duration: 3000 });
      } else {
        // Fallback to single AI mode or create a new session
        await sendMessage(analysisMessage);
        setActiveTab('chat');
        
        // Dismiss the loading toast and show success
        toast.dismiss(loadingToastId);
        toast.success('Code sent for analysis! Check the chat for feedback.', { duration: 3000 });
      }
      
      // Track progress for code analysis
      updateProgress(2, 'code_analysis');
      
    } catch (error) {
      console.error('Error sending code for analysis:', error);
      
      // Dismiss the loading toast and show error
      toast.dismiss(loadingToastId);
      toast.error('Failed to send code for analysis');
    } finally {
      // Reset analyzing state
      setIsAnalyzingCode(false);
    }
  };
  // Editor change handler that also marks activity
  const handleEditorChange = (val: string) => {
    lastActivityRef.current = Date.now();
    setCodeInput(val);
  };


  // Progress tracking (server is source of truth)
  const updateProgress = async (progressIncrement = 0, progressType = 'interaction') => {
    if (!selectedTopic) return;
    
    try {
      const progressData = {
        interaction: progressType === 'interaction' ? progressIncrement : 0,
        code_execution: progressType === 'code_execution' ? progressIncrement : 0,
        code_analysis: progressType === 'code_analysis' ? progressIncrement : 0,
        knowledge_check: progressType === 'knowledge_check' ? progressIncrement : 0
      };

      await apiUpdateProgress({
        topic_id: selectedTopic.id,
        status: 'in_progress',
        completed_subtopics: [],
        progress_data: progressData
      });
      // Broadcast progress change so lesson bars refresh
      try {
        progressSync.notifyProgressUpdate({ type: 'lesson', progress: 0, sessionId: Number(splitScreenSession?.id || 0) });
      } catch {}
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Time accrual heartbeat: award 1 point per 10 minutes (server computes)
  useEffect(() => {
    if (!selectedTopic) return;

    // Track recent user activity (mouse/keyboard/touch) and only send heartbeat if active recently
    const IDLE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents: Array<keyof DocumentEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, markActivity, { passive: true });
    });

    let timer: any;
    const tick = async () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
        const now = Date.now();
        const msSinceActivity = now - lastActivityRef.current;
        if (msSinceActivity > IDLE_THRESHOLD_MS) {
          // Skip heartbeat while idle
          return;
        }
        await heartbeat({ topic_id: selectedTopic.id, minutes_increment: 1 });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };

    // fire every 60s while on this screen, but only when recently active
    timer = setInterval(tick, 60000);

    return () => {
      if (timer) clearInterval(timer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, markActivity);
      });
    };
  }, [selectedTopic]);

  // Page visibility API for conversation and metadata sync
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && currentSession) {
        // Page became visible - sync conversation and metadata only if session exists
        try {
          await syncConversationWithBackend();
          await syncMetadataWithBackend();
        } catch (error) {
          console.error('Error syncing on page visibility:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncConversationWithBackend]);

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

  // Lesson selection handler
  const handleLessonClick = async (lesson: Lesson) => {
    console.log('Lesson clicked:', lesson);
    setSelectedLesson(lesson);
    
    // Find the topic for this lesson
    const topicForLesson = topics.find(t => t.id === lesson.topic_id);
    
    // Use the found topic or the already selected one
    const topicToUse = topicForLesson || selectedTopic;
    
    if (!topicToUse) {
      console.error('No topic found for lesson:', lesson);
      toast.error('Unable to find topic for this lesson');
      return;
    }
    
    // Check if user is authenticated before trying to manage sessions
    if (!isAuthenticated()) {
      console.log('User not authenticated - continuing without session management for lesson');
      setSplitScreenSession(null);
      
      // Save lesson and topic data to session metadata anyway
      if (currentSession) {
        const metadata = {
          lesson_data: {
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            topic_id: lesson.topic_id
          },
          topic_data: {
            id: topicToUse.id,
            title: topicToUse.title,
            description: topicToUse.description
          }
        };
        saveSessionMetadata(metadata);
      }
      
      // Switch to chat tab and continue
      setActiveTab('chat');
      return;
    }
    
    try {
      // Get current user ID
      const userResponse = await getCurrentUser();
      const userId = userResponse.user?.id?.toString();
      
      // Set current user state
      setCurrentUser(userResponse.user);
      
      if (!userId) {
        console.error('Could not get user ID');
        toast.error('Authentication error');
        return;
      }
      
      // Check if there's an existing session for this specific lesson
      console.log('Checking for existing session for lesson:', lesson.id);
      const existingSessionResponse = await getActivePreservedSessionByLesson(userId, lesson.id);
      
      if (existingSessionResponse && existingSessionResponse.data) {
        console.log('Found existing session for lesson:', existingSessionResponse.data.session_identifier);
        
        // Use the existing session from backend
        const existingSession = existingSessionResponse.data;
        
        // Save lesson and topic data to session metadata
        const metadata = {
          lesson_data: {
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            topic_id: lesson.topic_id
          },
          topic_data: {
            id: topicToUse.id,
            title: topicToUse.title,
            description: topicToUse.description
          }
        };
        setPendingSessionMetadata(metadata);
        
        // Switch to chat tab FIRST
        setActiveTab('chat');
        
        // Update the SessionContext with the existing PreservedSession
        setCurrentSession(existingSession);
        
        // Check if there's an active SplitScreenSession for engagement tracking
        try {
          const activeSessionResponse = await getActiveSession({ lesson_id: lesson.id });
          if (activeSessionResponse?.data?.session) {
            // Use existing SplitScreenSession for engagement tracking
            const splitScreenSessionData = {
              id: activeSessionResponse.data.session.id, // ✅ Use numeric SplitScreenSession ID
              session_type: activeSessionResponse.data.session.session_type,
              ai_models: activeSessionResponse.data.session.ai_models_used,
              started_at: activeSessionResponse.data.session.started_at
            };
            setSplitScreenSession(splitScreenSessionData);
            console.log('Using existing SplitScreenSession for engagement tracking:', splitScreenSessionData.id);
          } else {
            // Create new SplitScreenSession for engagement tracking
            console.log('Creating new SplitScreenSession for engagement tracking');
            const newSession = await startSplitScreenSession({
              topic_id: topicToUse.id,
              lesson_id: lesson.id,
              session_type: 'comparison',
              ai_models: ['gemini', 'together']
            });
            
            if (newSession && newSession.data && newSession.data.session_id) {
              const splitScreenSessionData = {
                id: newSession.data.session_id, // ✅ Use numeric SplitScreenSession ID
                session_type: newSession.data.session_type,
                ai_models: newSession.data.ai_models,
                started_at: newSession.data.started_at
              };
              setSplitScreenSession(splitScreenSessionData);
              console.log('Created new SplitScreenSession for engagement tracking:', splitScreenSessionData.id);
            }
          }
        } catch (sessionError) {
          console.error('Error managing SplitScreenSession:', sessionError);
          // Continue without engagement tracking
          setSplitScreenSession(null);
        }
        
        // Load conversation history from the existing session
        if (existingSession.conversation_history && existingSession.conversation_history.length > 0) {
          console.log('Loading conversation history from existing session:', existingSession.conversation_history.length, 'messages');
          setPendingConversationHistory(existingSession.conversation_history);
        }
        
        // Reset tracking and start with existing session
        resetTracking();
        setTimeout(() => {
          startTracking();
          console.log('Resumed existing session for lesson:', lesson.title, 'PreservedSession ID:', existingSession.session_identifier);
        }, 250);
        
        toast.success(`Resumed your previous session for "${lesson.title}"`);
        
      } else {
        console.log('No existing session found for lesson, creating new session');
        
        // Save lesson and topic data to session metadata
        const metadata = {
          lesson_data: {
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            topic_id: lesson.topic_id
          },
          topic_data: {
            id: topicToUse.id,
            title: topicToUse.title,
            description: topicToUse.description
          }
        };
        setPendingSessionMetadata(metadata);
        
        // Switch to chat tab FIRST
        setActiveTab('chat');
        
        // Reset engagement state for new session
        setEngagementTriggered(false);
        setLastThresholdTime(0);
        
        // Create a new split-screen session for this lesson
        console.log('Starting new split-screen session for lesson:', lesson.title, 'Topic ID:', topicToUse.id, 'Lesson ID:', lesson.id);
        const session = await startSplitScreenSession({
          topic_id: topicToUse.id,
          lesson_id: lesson.id,
          session_type: 'comparison',
          ai_models: ['gemini', 'together']
        });
        
        console.log('Session creation response for lesson:', session);
        
        // Check if session was created successfully
        if (session && session.data && session.data.session_id) {
          // Create a session object with the expected structure
          const sessionData = {
            id: session.data.session_id,
            session_type: session.data.session_type,
            ai_models: session.data.ai_models,
            started_at: session.data.started_at
          };
          setSplitScreenSession(sessionData);
          resetTracking(); // Reset tracking before starting new session
          
          // Delay starting engagement tracking to prevent immediate triggers
          setTimeout(() => {
            startTracking();
            console.log('New split-screen session started successfully for lesson:', lesson.title, 'Session ID:', sessionData.id);
          }, 500); // reduced delay for faster UX
          
          toast.success(`Started new session for "${lesson.title}"`);
        } else {
          console.warn('Session creation returned invalid response for lesson:', session);
          setSplitScreenSession(null);
          // Continue without session - split-screen will still work
          console.log('Continuing without session - split-screen functionality will work without engagement tracking');
        }
      }
      
      // Start AI conversation about this specific lesson with better context
      const welcomeMessage = `Hello! I'd like to start learning about "${lesson.title}". 

${lesson.description ? `Lesson Description: ${lesson.description}` : ''}
${lesson.key_points ? `\nKey Points: ${lesson.key_points}` : ''}
${lesson.examples ? `\nExamples: ${lesson.examples}` : ''}

Please help me understand this topic step by step. Start with an overview of what we'll be learning, then guide me through the key concepts with clear examples.`;
      
      // Send the initial message to start the conversation
      try {
        await handleSendMessage(welcomeMessage, topicToUse.id, topicToUse.title);
        console.log('Welcome message sent successfully');
      } catch (messageError) {
        console.error('Error sending welcome message:', messageError);
        toast.error('Failed to send welcome message');
      }
      
    } catch (error) {
      console.error('Error handling lesson selection:', error);
      toast.error('Failed to load lesson session');
      
      // Fallback: just switch to chat tab and continue without session
      setActiveTab('chat');
      setSplitScreenSession(null);
    }
  };

  // Legacy lesson plan click handler (for external navigation)
  const handleLessonPlanClick = (planId: number) => {
    window.open(`/dashboard/lesson-plans/${planId}`, '_blank');
  };

  const handleQuizStart = async (lesson: any) => {
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
      if (!topicToUse) {
        toast.error('Topic not found for this lesson');
        return;
      }
      
      await startTopicSession(topicToUse);
      
      // Switch to quiz tab
      setActiveTab('quiz');
      
      // Load quizzes for the currently selected module and prefetch first quiz details
      try {
        let moduleId = selectedModuleId;
        if (!moduleId) {
          const modules = await getLessonModules(lesson.id);
          setLessonModules(modules || []);
          if (Array.isArray(modules) && modules.length > 0) {
            moduleId = modules[0].id;
            setSelectedModuleId(moduleId);
          }
        }

        const quizzesRes = moduleId ? await getModuleQuizzes(moduleId) : { quizzes: [] } as any;
        const quizzes = quizzesRes?.quizzes || [];
        setModuleQuizzes(quizzes);
        if (quizzes.length > 0) {
          const { quiz } = await getQuiz(quizzes[0].id);
          setActiveQuiz(quiz);
          setQuizResponses({});
          // Start attempt
          // Mark module as in progress on quiz start
          if (selectedModuleId) { try { await updateModuleProgress(selectedModuleId, { status: 'in_progress' }); progressSync.notifyProgressUpdate({ type: 'lesson', progress: 0, sessionId: Number(splitScreenSession?.id || 0) }); } catch {} }
          const { attempt } = await startQuizAttempt(quiz.id);
          setActiveAttempt(attempt);
        } else {
          setActiveQuiz(null);
          setActiveAttempt(null);
          // Fallback to AI interactive quiz in chat
          const intro = `Hello! I'd like to take an interactive quiz on "${lesson.title}". ${lesson.description ? `This lesson covers: ${lesson.description}. ` : ''}Please ask one question at a time (MCQ or short answer), wait for my reply, then give feedback and the next question. Start easy then increase difficulty.`;
          try {
            await handleSendMessage(intro, topicToUse.id, topicToUse.title);
            toast.info('Started AI interactive quiz in the chat');
            setActiveTab('chat');
          } catch (e) {
            console.error('AI quiz start failed', e);
          }
        }
      } catch (e) {
        console.error('Failed to load quizzes:', e);
        setActiveQuiz(null);
        setActiveAttempt(null);
      }
      
    } catch (error) {
      console.error('Error in handleQuizStart:', error);
      toast.error(`Failed to start quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load active tab from session metadata when session is loaded
  useEffect(() => {
    if (currentSession) {
      try {
        const metadata = loadSessionMetadata();
        const lastActiveTab = metadata.user_preferences?.last_active_tab;
        
        if (lastActiveTab && lastActiveTab !== activeTab) {
          console.log('Restoring last active tab from session:', lastActiveTab);
          setActiveTab(lastActiveTab as 'chat' | 'lesson-plans' | 'sessions' | 'quiz');
        }
      } catch (error) {
        console.error('Error loading active tab from session metadata:', error);
      }
    }
  }, [currentSession, loadSessionMetadata]); // Removed activeTab to prevent infinite loop

  // Add state to track conversation history loading
  const [pendingConversationHistory, setPendingConversationHistory] = useState<any[] | null>(null);
  
  // Add state to track session metadata saving
  const [pendingSessionMetadata, setPendingSessionMetadata] = useState<any | null>(null);

  // Load conversation history when pending history is set
  useEffect(() => {
    if (pendingConversationHistory) {
      console.log('Loading conversation history from pending state:', pendingConversationHistory.length, 'messages');
      saveConversationHistory(pendingConversationHistory);
      setPendingConversationHistory(null); // Clear the pending state
    }
  }, [pendingConversationHistory, saveConversationHistory]);

  // Load user session history when History tab opens
  useEffect(() => {
    (async () => {
      if (activeTab !== 'sessions') return;
      const userId = currentSession?.user_id;
      if (!userId) return;
      try {
        setIsLoadingHistory(true);
        const res = await getUserSessionHistory(String(userId));
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setSessionHistory(list);
      } catch (e) {
        console.warn('Failed to load session history', e);
        setSessionHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [activeTab, currentSession?.user_id]);

  const handleReactivateHistorySession = async (sessionIdentifier: string) => {
    try {
      const res = await reactivatePreservedSession(sessionIdentifier);
      const preserved = res?.data || res;
      if (!preserved) throw new Error('No preserved session returned');

      // Load conversation history if available
      if (Array.isArray(preserved.conversation_history) && preserved.conversation_history.length > 0) {
        setPendingConversationHistory(preserved.conversation_history);
      }

      // Try to bind to an active SplitScreenSession for the same lesson
      const lessonIdFromMeta = preserved?.lesson_id || preserved?.session_metadata?.lesson_data?.id;
      const topicIdFromMeta = preserved?.topic_id || preserved?.session_metadata?.topic_data?.id;
      let ss: any = null;
      if (lessonIdFromMeta) {
        try {
          const active = await getActiveSession({ lesson_id: Number(lessonIdFromMeta) });
          ss = active?.data?.session || active?.session || null;
        } catch {}
      }
      // Fallback: query active session without lesson filter
      if (!ss) {
        try {
          const active = await getActiveSession();
          ss = active?.data?.session || active?.session || null;
        } catch {}
      }

      // If still no split-screen session, start a new one for the preserved lesson
      if (!ss && lessonIdFromMeta) {
        try {
          const newSessionRes = await startSplitScreenSession({
            topic_id: topicIdFromMeta ? Number(topicIdFromMeta) : undefined,
            lesson_id: Number(lessonIdFromMeta),
            session_type: 'comparison',
            ai_models: ['gemini','together']
          } as any);
          ss = newSessionRes?.data?.session || newSessionRes?.session || newSessionRes || null;
        } catch {}
      }

      // Update selected topic/lesson in UI if available
      if (topicIdFromMeta) {
        const t = topics.find(t => Number(t.id) === Number(topicIdFromMeta));
        if (t) setSelectedTopic(t as any);
      }
      if (lessonIdFromMeta) {
        try {
          const lesson = await getLessonPlanDetails(Number(lessonIdFromMeta));
          if (lesson) setSelectedLesson(lesson as any);
        } catch {}
      }

      if (ss) {
        setSplitScreenSession(ss);
      }

      setActiveTab('chat');
    } catch (e) {
      toast.error('Failed to reactivate session');
    }
  };

  // Save session metadata when pending metadata is set
  useEffect(() => {
    if (pendingSessionMetadata) {
      console.log('Saving session metadata from pending state:', pendingSessionMetadata);
      saveSessionMetadata(pendingSessionMetadata);
      setPendingSessionMetadata(null); // Clear the pending state
    }
  }, [pendingSessionMetadata, saveSessionMetadata]);

  // Router for navigation
  const router = useRouter();

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
                <h1 className="text-xl font-bold text-white">AI Tutor Room</h1>
                <p className="text-sm text-gray-400">Interactive Java Learning Environment</p>
              </div>
            </div>
            

          </div>
          
          {/* Topic Status and Overall Progress Badge */}
          <div className="flex items-center gap-3">
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
            <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              Progress: {Math.max(0, Math.min(100, summary?.weighted_breakdown?.overall_progress ?? 0))}%
            </div>
          </div>
        </motion.div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (quizInProgress && value !== 'quiz') {
            toast.error('Finish or submit the quiz first to access other tabs');
            return;
          }
          setActiveTab(value as any);
        }}
        className="flex-1 flex flex-col"
      >
        <div className="px-6 pt-4">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 backdrop-blur-sm">
            <TabsTrigger
              value="chat"
              disabled={quizInProgress}
              className="flex items-center gap-2 data-[state=active]:bg-[#2E5BFF] data-[state=active]:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
              <div className="ml-4 whitespace-nowrap">{renderPistonHealth()}</div>
            </div>
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
                       <h3 className="font-semibold text-white">
                         Split-Screen AI Tutor
                       </h3>
                       <p className="text-xs text-gray-400">
                          Gemini and Together AI Tutorimage.png responses
                       </p>
                     </div>
                  </div>
                                     <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400">Online</span>
                      {!isConversationSynced && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-yellow-400">Syncing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                                 <div className="flex-1 p-4 min-h-0 overflow-hidden">
                   {(() => {
                     console.log('SplitScreenChatInterface props:', {
                       selectedTopic,
                       selectedLesson,
                       sessionId: splitScreenSession?.id || currentSession?.session_identifier || undefined,
                       engagementScore
                     });
                     return null;
                   })()}
                   <SplitScreenChatInterface
                     messages={combinedMessages.map(msg => {
                       // Map sender values correctly based on _model field
                       let mappedSender: 'user' | 'gemini' | 'together' = 'user';
                       const senderStr = String((msg as any).sender);
                       
                       if (senderStr === 'user') {
                         mappedSender = 'user';
                       } else if (senderStr === 'gemini' || senderStr === 'together') {
                         // Already tagged with model (e.g., after refresh)
                         mappedSender = senderStr as 'gemini' | 'together';
                       } else if (senderStr === 'bot') {
                         // Check the _model field to determine which AI this is
                         const model = (msg as any)._model;
                         if (model === 'together') {
                           mappedSender = 'together';
                         } else if (model === 'gemini') {
                           mappedSender = 'gemini';
                         } else {
                           // Default to gemini if no model specified
                           mappedSender = 'gemini';
                         }
                       } else if (senderStr === 'ai') {
                         // Legacy support for 'ai' sender
                         mappedSender = (msg as any)._model === 'together' ? 'together' : 'gemini';
                       }
                       
                      try {
                        const dbg = require('@/utils/debug');
                        if (dbg?.isDebugEnabled?.()) {
                          console.log('Message mapping:', {
                            originalSender: msg.sender,
                            model: (msg as any)._model,
                            mappedSender: mappedSender,
                            textPreview: msg.text?.substring(0, 30) + '...'
                          });
                        }
                      } catch {}
                      
                      return {
                        ...msg,
                        sender: mappedSender
                      };
                     })}
                     isLoading={isChatLoading}
                     onSendMessage={async (message) => {
                       await handleSendMessage(message);
                       // Only track message if it's substantial
                       if (message.length > 20) {
                         trackMessage();
                       }
                     }}
                     topic={selectedTopic}
                     lesson={selectedLesson}
                     sessionId={splitScreenSession?.id || currentSession?.session_identifier || undefined}
                     engagementScore={engagementScore}
                     userId={currentUser?.id?.toString() || undefined}
                     onEngagementThreshold={() => {
                       if (splitScreenSession?.id) {
                         setEngagementTriggered(true);
                         setShowAIPreferenceModal(true);
                       } else {
                         console.warn('Engagement threshold reached but no active session - skipping modal');
                       }
                     }}
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
                      <p className="text-xs text-gray-400">Write, test, and get AI feedback on your Java code</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAnalyzeCode}
                    disabled={isExecuting || isAnalyzingCode}
                    title="Send code to AI models for analysis and feedback"
                    className="flex items-center gap-2 px-4 py-2 bg-[#2E5BFF] text-white rounded-lg font-medium text-sm hover:bg-[#2E5BFF]/80 transition-all duration-200 disabled:opacity-50"
                  >
                    {isAnalyzingCode ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    {isAnalyzingCode ? 'Analyzing...' : 'Analyze Code'}
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
                      onChange={handleEditorChange}
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
                  <div className="flex gap-4 flex-wrap p-1">
                    {topics.slice(0, 3).map((topic) => (
                      <div key={topic.id} className="p-1">
                        <motion.button
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
                      </div>
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-2">
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
                            className="group relative h-[340px] p-1"
                          >
                            {/* Main Card */}
                            <div className="bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-[#2E5BFF]/50 hover:shadow-2xl hover:shadow-[#2E5BFF]/10 transition-all duration-300 ease-out h-full flex flex-col transform hover:scale-[1.02] hover:-translate-y-1 overflow-hidden">
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

                              {/* Header - Compact */}
                              <div className="mb-3">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-[#2E5BFF] to-[#1E40AF] rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                                    <BookOpen className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-20">
                                    <h4 className="text-base font-bold text-white mb-1 transition-colors duration-200 group-hover:text-[#2E5BFF] line-clamp-2">
                                      {lesson.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" />
                                        Lesson {index + 1}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Description - Compact */}
                              <div className="mb-3">
                                <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
                                  {lesson.description}
                                </p>
                              </div>

                              {/* Key Stats - Compact */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  {lesson.modules_count && (
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                      <Clock className="h-3 w-3 text-[#2E5BFF]" />
                                      {lesson.modules_count} modules
                                    </span>
                                  )}
                                  {lesson.estimated_minutes && (
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                      <Timer className="h-3 w-3 text-[#2E5BFF]" />
                                      {lesson.estimated_minutes} min
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                    <Target className="h-3 w-3 text-[#2E5BFF]" />
                                    {lesson.key_points ? lesson.key_points.split(',').length : 3} goals
                                  </span>
                                </div>
                              </div>

                              {/* Progress - Compact */}
                              <LessonProgressBar lessonId={lesson.id} />

                              {/* Prerequisites - Compact */}
                              <div className="mb-3 flex-1">
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
                                  onClick={() => {
                                    // Prevent navigation if locked
                                    if ((lesson as any).is_locked) return;
                                    handleLessonClick(lesson);
                                  }}
                                  className={`w-full font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-out flex items-center justify-center gap-2 text-sm group-hover:shadow-lg group-hover:shadow-[#2E5BFF]/25 transform hover:scale-[1.01] active:scale-[0.99] ${ (lesson as any).is_locked ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-[#2E5BFF] to-[#1E40AF] hover:from-[#2343C3] hover:to-[#1E3A8A] text-white' }`}
                                  disabled={Boolean((lesson as any).is_locked)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Start Learning
                                  <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                                </button>
                              </div>

                              {/* Subtle Hover Glow Effect */}
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2E5BFF]/0 via-[#2E5BFF]/5 to-[#2E5BFF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
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
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#2E5BFF]" />
                  <h3 className="text-lg font-semibold text-white">Learning History</h3>
                </div>
                {isLoadingHistory && <span className="text-xs text-gray-400">Loading…</span>}
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by lesson title or session id..."
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]"
                  value={historyQuery}
                  onChange={(e) => { setHistoryQuery(e.target.value); setHistoryPage(1); }}
                />
                <select
                  className="h-10 bg-white/5 border border-white/10 rounded px-3 text-white"
                  value={historyTopicFilter}
                  onChange={(e) => { setHistoryTopicFilter(e.target.value); setHistoryPage(1); }}
                >
                  <option value="all">All Topics</option>
                  {topics.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.title}</option>
                  ))}
                </select>
              </div>

              {sessionHistory.length === 0 && !isLoadingHistory ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sessions yet.</div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                  {Object.entries(
                    sessionHistory
                      .filter((s) => {
                        const title = s.session_metadata?.lesson_data?.title?.toLowerCase?.() || '';
                        const sid = String(s.session_identifier || '').toLowerCase();
                        const matchesQuery = !historyQuery || title.includes(historyQuery.toLowerCase()) || sid.includes(historyQuery.toLowerCase());
                        const matchesTopic = historyTopicFilter === 'all' || String(s.topic_id || s.session_metadata?.topic_data?.id || '') === historyTopicFilter;
                        return matchesQuery && matchesTopic;
                      })
                      .reduce((acc: Record<string, any[]>, s: any) => {
                        const key = String(s.lesson_id || 'unknown');
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(s);
                        return acc;
                      }, {})
                  ).slice((historyPage-1), (historyPage-1)+HISTORY_PAGE_SIZE).map(([lessonKey, sessions]) => {
                    const sample = (sessions as any[])[0] || {};
                    const title = sample?.session_metadata?.lesson_data?.title || (lessonKey !== 'unknown' ? `Lesson #${lessonKey}` : 'Unknown Lesson');
                    const topicTitle = sample?.session_metadata?.topic_data?.title || topics.find(t => t.id === sample?.topic_id)?.title;
                    return (
                      <div key={lessonKey} className="bg-white/5 border border-white/10 rounded-lg">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                          <div className="text-white font-medium">{title}{topicTitle ? <span className="ml-2 text-xs text-gray-400">· {topicTitle}</span> : null}</div>
                          <div className="text-xs text-gray-400">{sessions.length} session{sessions.length>1?'s':''}</div>
                        </div>
                        <div className="divide-y divide-white/10">
                          {(sessions as any[]).map((s) => (
                            <div key={s.session_identifier} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-white truncate">{s.session_identifier}</div>
                                <div className="text-xs text-gray-400">Last activity: {new Date(s.last_activity).toLocaleString()}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReactivateHistorySession(String(s.session_identifier))}
                                  className="px-3 py-1 rounded bg-[#2E5BFF] hover:bg-[#2343C3] text-white text-xs"
                                >
                                  Reactivate
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-300 text-xs disabled:opacity-50"
                  disabled={historyPage === 1}
                >Prev</button>
                <span className="text-xs text-gray-400">Page {historyPage}</span>
                <button
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-300 text-xs"
                >Next</button>
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
            {!selectedLesson ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#2E5BFF] rounded-2xl flex items-center justify-center mb-6">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Quiz Mode</h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  Select a lesson from the "Lessons" tab to take a quiz on that specific topic.
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Book className="h-4 w-4 text-[#2E5BFF]" />
                    <span>Choose Lesson First</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-[#2E5BFF]" />
                    <span>Then Take Quiz</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quiz Header - Selected Lesson */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-[#2E5BFF] rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">Quiz: {selectedLesson.title}</h3>
                      <p className="text-gray-400">Test your understanding of this lesson</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                        Lesson {selectedLesson.order_index}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quiz Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Lesson Overview */}
                  <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[#2E5BFF]" />
                        Lesson Overview
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {selectedLesson.description}
                      </p>
                      
                      {/* Lesson Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {selectedLesson.estimated_minutes && (
                          <div className="bg-white/5 rounded-lg p-3 text-center">
                            <div className="text-[#2E5BFF] font-semibold text-lg">{selectedLesson.estimated_minutes}</div>
                            <div className="text-gray-400 text-xs">Minutes</div>
                          </div>
                        )}
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                          <div className="text-[#2E5BFF] font-semibold text-lg">{selectedLesson.order_index}</div>
                          <div className="text-gray-400 text-xs">Order</div>
                        </div>
                      </div>

                      {/* Key Points */}
                      {selectedLesson.key_points && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-white mb-2">Key Points:</h5>
                          <div className="text-gray-300 text-sm">
                            {selectedLesson.key_points.split(',').map((point: string, index: number) => (
                              <div key={index} className="flex items-start gap-2 mb-1">
                                <Target className="h-3 w-3 text-[#2E5BFF] mt-0.5 flex-shrink-0" />
                                <span>{point.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Examples */}
                      {selectedLesson.examples && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Code2 className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-300">Examples:</span>
                          </div>
                          <span className="text-sm text-blue-200">{selectedLesson.examples}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Quiz */}
                  <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Brain className="h-5 w-5 text-[#2E5BFF]" />
                        Quiz
                        </h4>
                        {quizInProgress && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">Quiz in progress</span>
                            {(() => {
                              const limitMin = Number(activeQuiz?.time_limit_minutes || 0);
                              const limitSec = limitMin > 0 ? limitMin * 60 : 0;
                              const remaining = limitSec > 0 ? Math.max(0, limitSec - quizElapsedSec) : 0;
                              const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
                              const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
                              return limitSec > 0 ? (
                                <span className="text-xs text-white bg-white/10 border border-white/10 px-2 py-1 rounded">Time Left: {mm}:{ss}</span>
                              ) : null;
                            })()}
                            <button
                              onClick={() => { setActiveAttempt(null); setActiveQuiz(null); setQuizResponses({}); setQuizElapsedSec(0); if (quizTimerId) { clearInterval(quizTimerId); setQuizTimerId(null);} }}
                              className="text-xs px-2 py-1 bg-white/10 border border-white/10 text-gray-200 rounded hover:bg-white/20"
                            >
                              Cancel Attempt
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Module selector */}
                      {lessonModules.length > 0 && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Module:</span>
                          <select
                            className="bg-white/10 border border-white/10 text-sm text-white rounded px-2 py-1"
                            value={selectedModuleId ?? ''}
                            onChange={async (e) => {
                              const id = Number(e.target.value);
                              setSelectedModuleId(id);
                              try {
                                const res = await getModuleQuizzes(id);
                                setModuleQuizzes(res?.quizzes || []);
                                setActiveQuiz(null);
                                setActiveAttempt(null);
                                setQuizResponses({});
                              } catch {}
                            }}
                          >
                            {lessonModules.map((m) => (
                              <option key={m.id} value={m.id}>{m.title || `Module #${m.id}`}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quiz selection with lock gating */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        {moduleQuizzes.map((q) => (
                          <button
                            key={q.id}
                            onClick={async () => {
                              try {
                                if (q.locked) {
                                  toast.error('Locked: Pass the lower difficulty first');
                                  return;
                                }
                                const { quiz } = await getQuiz(q.id);
                                setActiveQuiz(quiz);
                                setQuizResponses({});
          const { attempt } = await startQuizAttempt(quiz.id);
          setActiveAttempt(attempt);
          setQuizElapsedSec(0);
          if (quizTimerId) { clearInterval(quizTimerId); }
          const newTimerId = setInterval(() => setQuizElapsedSec((s) => s + 1), 1000);
          setQuizTimerId(newTimerId);
                              } catch (e) {
                                console.error('Failed to load quiz', e);
                              }
                            }}
                            className={`px-3 py-1 rounded text-xs ${q.locked ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed' : 'bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10'} ${activeQuiz?.id === q.id ? 'border-[#2E5BFF]/50' : ''}`}
                          >
                            {q.title || `Quiz #${q.id}`} {q.locked ? '🔒' : q.passed ? '✅' : ''}
                            <span className="ml-2 text-[10px] text-gray-400">Pass {q.passing_score_percent ?? 0}%</span>
                          </button>
                        ))}
                        {moduleQuizzes.length === 0 && (
                          <span className="text-xs text-gray-400">No quizzes available for this lesson yet.</span>
                        )}
                      </div>

                      {/* Quiz questions */}
                      {activeQuiz && (
                        <div className="space-y-4">
                          {(activeQuiz.questions || []).map((question: any, idx: number) => (
                            <div key={question.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                              <div className="text-sm text-white font-medium mb-2">Q{idx + 1}. {question.question_text}</div>
                              {question.code_snippet && (
                                <pre className="text-xs text-gray-200 bg-black/30 rounded p-3 overflow-auto mb-2"><code>{question.code_snippet}</code></pre>
                              )}
                              {/* Simple renderer for MCQ or text */}
                              {Array.isArray(question.options) && question.options.length > 0 ? (
                                <div className="space-y-2">
                                  {question.options.map((opt: any, i: number) => {
                                    const optVal = typeof opt === 'object' && opt && 'value' in opt ? String(opt.value) : String(opt);
                                    const optLabel = typeof opt === 'object' && opt && 'label' in opt ? String(opt.label) : String(opt);
                                    return (
                                      <label key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                        <input
                                          type="radio"
                                          name={`q_${question.id}`}
                                          value={optVal}
                                          className="accent-[#2E5BFF]"
                                          checked={quizResponses[question.id] === optVal}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setQuizResponses((prev) => ({ ...prev, [question.id]: value }));
                                          }}
                                        />
                                        <span>{optLabel}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <textarea
                                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white placeholder-gray-400"
                                  placeholder="Type your answer"
                                  value={quizResponses[question.id] ?? ''}
                                  onChange={(e) => setQuizResponses((prev) => ({ ...prev, [question.id]: e.target.value }))}
                                />
                              )}
                            </div>
                          ))}

                          <div className="pt-2">
                            <button
                              disabled={!activeAttempt || isSubmittingQuiz}
                              onClick={async () => {
                                if (!activeAttempt) return;
                                setIsSubmittingQuiz(true);
                                try {
                                  const res = await submitQuizAttempt(activeAttempt.id, {
                                    responses: quizResponses,
                                    time_spent_seconds: quizElapsedSec
                                  });
                                  toast.success(`Quiz submitted: ${Math.round(res.percentage)}% ${res.passed ? '(Passed)' : '(Try again)'}`);
                                  
                                  // Track quiz completion for engagement
                                  trackQuizCompletion();

                                  // Award engagement points for completing a quiz (more if passed)
                                  try {
                                    const sid = typeof splitScreenSession?.id === 'number'
                                      ? splitScreenSession.id
                                      : parseInt(String(splitScreenSession?.id));
                                    if (!isNaN(sid)) {
                                      const quizPoints = res.passed ? 8 : 4; // knowledge_check engagement
                                      await incrementEngagement(sid, { points: quizPoints });
                                      // Refresh local engagement state from backend
                                      try { await syncThresholdStatusWithBackend(); } catch {}
                                    }
                                  } catch (e) {
                                    console.warn('Failed to increment engagement for quiz completion:', e);
                                  }
                                  
                                  // Track quiz points (server computes progress, we send signal)
                                  updateProgress(2, 'knowledge_check');
                                  // If passed, mark current module as completed to advance server progress
                                  try {
                                    if (res.passed && selectedModuleId) {
                                      await updateModuleProgress(selectedModuleId, { status: 'completed' });
                                    }
                                  } catch {}
                                  // Notify others to refresh lesson progress bars
                                  try { progressSync.notifyProgressUpdate({ type: 'quiz', progress: res.percentage, sessionId: Number(splitScreenSession?.id || 0) }); } catch {}
                                  
                                  // Update attempt state and refresh quiz list (unlock next difficulty on pass)
                                  if (res.attempt) {
                                    setActiveAttempt(res.attempt);
                                  }
                                  if (selectedModuleId) {
                                    try {
                                      const refreshed = await getModuleQuizzes(selectedModuleId);
                                      setModuleQuizzes(refreshed?.quizzes || []);
                                    } catch {}
                                  }
                                  if (quizTimerId) {
                                    clearInterval(quizTimerId);
                                    setQuizTimerId(null);
                                  }
                                  
                                  // ✅ AUTOMATIC AI PREFERENCE POLL TRIGGER
                                  // Set preference poll type and show modal
                                  setPreferencePollType('quiz');
                                  
                                  // Store quiz completion data for preference poll
                                  setQuizCompletionData({
                                    quiz_id: activeQuiz?.id,
                                    score: res.score,
                                    percentage: res.percentage,
                                    passed: res.passed,
                                    time_spent_seconds: quizElapsedSec,
                                    session_id: splitScreenSession?.id
                                  });
                                  
                                  // Show preference poll after quiz completion
                                  setTimeout(() => {
                                    setShowAIPreferenceModal(true);
                                  }, 1000);
                                  
                                  // Lesson completion modal is now gated to show only
                                  // after the preference poll and when backend progress
                                  // reports the lesson as complete.
                                } catch (e) {
                                  toast.error('Failed to submit quiz');
                                } finally {
                                  setIsSubmittingQuiz(false);
                                }
                              }}
                              className="px-4 py-2 bg-[#2E5BFF] text-white rounded-lg text-sm font-medium hover:bg-[#2343C3] disabled:opacity-50"
                            >
                              {isSubmittingQuiz ? 'Submitting...' : 'Submit Quiz'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

             {/* Split-Screen Modals */}
       <AIPreferenceModal
         isOpen={showAIPreferenceModal}
         onClose={() => {
           setShowAIPreferenceModal(false);
           setEngagementTriggered(false);
         }}
         onSubmit={handleUserChoice}
         sessionId={splitScreenSession?.id}
         interactionType={preferencePollType}
       />

       <LessonCompletionModal
         isOpen={showLessonCompletionModal}
         onClose={() => {
           setShowLessonCompletionModal(false);
           setEngagementTriggered(false);
         }}
         onRequestClarification={handleClarificationRequest}
         onProceed={() => {
           setShowLessonCompletionModal(false);
           endSplitScreenSession();
         }}
         lessonTitle={selectedLesson?.title || 'this lesson'}
         sessionId={splitScreenSession?.id}
       />
    </div>
  );
};

export default SoloRoomRefactored; 