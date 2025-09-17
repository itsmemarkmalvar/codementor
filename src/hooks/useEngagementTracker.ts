import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { getThresholdStatus, incrementEngagement } from '../services/api';
import { engagementSync } from '@/utils/crossTabSync';

interface EngagementTrackerOptions {
  quizThreshold: number;      // Quiz trigger at 30 points
  practiceThreshold: number;  // Practice trigger at 70 points
  sessionId?: number;
  userId?: string;
  onThresholdReached?: () => void;
  onQuizTrigger?: () => void;
  onPracticeTrigger?: () => void;
  onPreferencePoll?: () => void;
  onLessonCompletion?: () => void;
  autoTrigger?: boolean;
}

interface EngagementEvent {
  type: 'message' | 'code_execution' | 'scroll' | 'interaction' | 'time';
  points: number;
  timestamp: Date;
}

export function useEngagementTracker(options: EngagementTrackerOptions) {
  const [engagementScore, setEngagementScore] = useState(0);
  const [isQuizThresholdReached, setIsQuizThresholdReached] = useState(false);
  const [isPracticeThresholdReached, setIsPracticeThresholdReached] = useState(false);
  const [isPracticeCompleted, setIsPracticeCompleted] = useState(false);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [triggeredActivity, setTriggeredActivity] = useState<'quiz' | 'practice' | null>(null);
  const [assessmentSequence, setAssessmentSequence] = useState<'quiz' | 'practice' | null>(null);
  // Track auto-trigger one-shot behavior across reloads
  const quizAutoTriggeredRef = useRef<boolean>(false);
  const practiceAutoTriggeredRef = useRef<boolean>(false);
  const [hasThresholdSynced, setHasThresholdSynced] = useState<boolean>(false);
  
  // Buffer for passive engagement points to persist to backend in small batches
  const pendingPassivePointsRef = useRef<number>(0);
  
  // RISK MITIGATION: Debounce threshold detection to prevent spam
  const thresholdDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastThresholdTimeRef = useRef<number>(0);
  const THRESHOLD_COOLDOWN = 5000; // 5 second cooldown between thresholds
  
  const lastActivityRef = useRef<Date>(new Date());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<number | undefined>(options.sessionId);

  // Get session context for preservation
  const { 
    currentSession, 
    loadSessionMetadata, 
    saveSessionMetadata, 
    syncMetadataWithBackend,
    isMetadataSynced 
  } = useSession();

  // Update session ID when it changes
  useEffect(() => {
    sessionIdRef.current = options.sessionId;
  }, [options.sessionId]);

  // On session change, immediately sync persisted engagement from backend
  // Defined after syncThresholdStatusWithBackend to satisfy linter

  // Load engagement data from session metadata when session context changes
  useEffect(() => {
    if (currentSession) {
      try {
        const metadata = loadSessionMetadata();
        const engagementData = metadata.engagement_data;
        
        // Only hydrate if the stored engagement belongs to the currently active split-screen session
        if (engagementData && (
          engagementData.session_id === sessionIdRef.current ||
          // tolerate string/number mismatch
          String(engagementData.session_id || '') === String(sessionIdRef.current || '')
        )) {
          console.log('Loading engagement data from session:', engagementData);
          setEngagementScore(engagementData.score || 0);
          setIsQuizThresholdReached(engagementData.is_quiz_threshold_reached || false);
          setIsPracticeThresholdReached(engagementData.is_practice_threshold_reached || false);
          setEvents(engagementData.events || []);
          setTriggeredActivity(engagementData.triggered_activity || null);
          setAssessmentSequence(engagementData.assessment_sequence || null);
          
          // Restore last activity timestamp
          if (engagementData.last_activity) {
            lastActivityRef.current = new Date(engagementData.last_activity);
          }
          
          console.log('Engagement data restored successfully:', {
            score: engagementData.score || 0,
            is_quiz_threshold_reached: engagementData.is_quiz_threshold_reached || false,
            is_practice_threshold_reached: engagementData.is_practice_threshold_reached || false,
            events_count: engagementData.events?.length || 0
          });
        } else {
          console.log('No engagement data found in session metadata');
        }
      } catch (error) {
        console.error('Error loading engagement data from session metadata:', error);
      }
    }
  }, [currentSession, loadSessionMetadata]);



  // Sync threshold status with backend
  const syncThresholdStatusWithBackend = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const response = await getThresholdStatus(sessionIdRef.current);
      if (response.status === 'success') {
        const { threshold_status } = response.data;
        
        // Update local state with backend data
        setEngagementScore(threshold_status.current_score);
        setIsQuizThresholdReached(threshold_status.quiz_triggered);
        setIsPracticeThresholdReached(threshold_status.practice_triggered);
        setIsPracticeCompleted(!!threshold_status.practice_completed);
        
        console.log('Threshold status synced with backend:', threshold_status);
      }
    } catch (error) {
      console.error('Failed to sync threshold status with backend:', error);
    }
    // Mark that we've attempted an initial sync (success or fail)
    setHasThresholdSynced(true);
  }, []);

  // On session change, immediately sync persisted engagement from backend
  useEffect(() => {
    if (!options.sessionId) return;
    (async () => {
      try {
        await syncThresholdStatusWithBackend();
      } catch (e) {
        // Non-fatal: UI will continue with local state
        console.debug('Initial threshold sync failed:', e);
      }
    })();
  }, [options.sessionId, syncThresholdStatusWithBackend]);

  // Listen for cross-tab engagement updates
  useEffect(() => {
    if (!options.userId || !sessionIdRef.current) return;

    const unsubscribeEngagement = engagementSync.onEngagementUpdate((data) => {
      if (data.sessionId === sessionIdRef.current && data.userId === options.userId) {
        setEngagementScore(data.score);
        console.log('Engagement score updated from another tab:', data.score);
      }
    });

    const unsubscribeQuiz = engagementSync.onQuizUnlocked((data) => {
      if (data.sessionId === sessionIdRef.current) {
        setIsQuizThresholdReached(true);
        console.log('Quiz unlocked in another tab');
      }
    });

    const unsubscribePractice = engagementSync.onPracticeUnlocked((data) => {
      if (data.sessionId === sessionIdRef.current) {
        setIsPracticeThresholdReached(true);
        console.log('Practice unlocked in another tab');
      }
    });

    const unsubscribeThreshold = engagementSync.onThresholdReached((data) => {
      if (data.sessionId === sessionIdRef.current) {
        if (data.type === 'quiz') {
          setIsQuizThresholdReached(true);
        } else if (data.type === 'practice') {
          setIsPracticeThresholdReached(true);
        }
        console.log('Threshold reached in another tab:', data.type);
      }
    });

    return () => {
      unsubscribeEngagement();
      unsubscribeQuiz();
      unsubscribePractice();
      unsubscribeThreshold();
    };
  }, [options.userId]);

  // Save engagement data to session metadata
  const saveEngagementData = useCallback(() => {
    if (!currentSession) return;

    try {
      const engagementData = {
        session_id: sessionIdRef.current,
        score: engagementScore,
        is_quiz_threshold_reached: isQuizThresholdReached,
        is_practice_threshold_reached: isPracticeThresholdReached,
        events: events,
        triggered_activity: triggeredActivity,
        assessment_sequence: assessmentSequence,
        last_activity: lastActivityRef.current.toISOString()
      };

      const metadata = {
        engagement_data: engagementData
      };

      saveSessionMetadata(metadata);
    } catch (error) {
      console.error('Error saving engagement data to session metadata:', error);
    }
  }, [currentSession, engagementScore, isQuizThresholdReached, isPracticeThresholdReached, events, triggeredActivity, assessmentSequence, saveSessionMetadata]);

  // When the active split-screen session changes, reset local tracker state
  useEffect(() => {
    if (!options.sessionId) return;
    // Reset local state to avoid carrying engagement across sessions
    setEngagementScore(0);
    setIsQuizThresholdReached(false);
    setIsPracticeThresholdReached(false);
    setIsPracticeCompleted(false);
    setEvents([]);
    setTriggeredActivity(null);
    setAssessmentSequence(null);
    lastActivityRef.current = new Date();
    // Force a fresh backend sync for the new session id
    setHasThresholdSynced(false);
  }, [options.sessionId]);

  // Save engagement data whenever it changes
  useEffect(() => {
    saveEngagementData();
  }, [saveEngagementData]);

  // Auto-trigger on restored threshold state (e.g., after reload)
  useEffect(() => {
    if (!options.autoTrigger) return;
    // Avoid triggering based solely on stale local metadata before the first backend sync
    if (!hasThresholdSynced) return;
    // Quiz auto-trigger
    if (isQuizThresholdReached && !quizAutoTriggeredRef.current) {
      quizAutoTriggeredRef.current = true;
      try { options.onQuizTrigger?.(); } catch (e) { console.error('onQuizTrigger failed', e); }
    }
    // Practice auto-trigger (only after quiz was unlocked)
    if (isQuizThresholdReached && isPracticeThresholdReached && !practiceAutoTriggeredRef.current && !isPracticeCompleted) {
      practiceAutoTriggeredRef.current = true;
      try { options.onPracticeTrigger?.(); } catch (e) { console.error('onPracticeTrigger failed', e); }
    }
  }, [options.autoTrigger, hasThresholdSynced, isQuizThresholdReached, isPracticeThresholdReached, isPracticeCompleted, options.onQuizTrigger, options.onPracticeTrigger]);

  // Sync engagement data with backend periodically
  useEffect(() => {
    if (!currentSession || isMetadataSynced) return;

    const syncTimer = setInterval(async () => {
      try {
        await syncMetadataWithBackend();
      } catch (error) {
        console.error('Error syncing engagement data:', error);
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncTimer);
  }, [currentSession, isMetadataSynced, syncMetadataWithBackend]);

  // Track user activity with RISK MITIGATION: Debounced threshold detection
  const trackActivity = useCallback((type: EngagementEvent['type'], points: number = 1) => {
    if (!isTracking) return;

    const event: EngagementEvent = {
      type,
      points,
      timestamp: new Date()
    };

    setEvents(prev => [...prev, event]);
    setEngagementScore(prev => {
      const newScore = prev + points;
      
      console.log(`Engagement tracking: ${type} (+${points}) = ${newScore}/${options.quizThreshold}/${options.practiceThreshold}`);
      
      // RISK MITIGATION: Debounce threshold detection to prevent spam
      const now = Date.now();
      if (now - lastThresholdTimeRef.current < THRESHOLD_COOLDOWN) {
        console.log('Threshold detection debounced - cooldown active');
        return newScore;
      }
      
      // Stage 1: Quiz Threshold (30 points)
      if (newScore >= options.quizThreshold && !isQuizThresholdReached) {
        console.log('🎯 Quiz threshold reached at', newScore, 'points!');
        
        // Clear any existing debounce
        if (thresholdDebounceRef.current) {
          clearTimeout(thresholdDebounceRef.current);
        }
        
        // Debounced threshold trigger
        thresholdDebounceRef.current = setTimeout(async () => {
          setIsQuizThresholdReached(true);
          setTriggeredActivity('quiz');
          setAssessmentSequence('quiz');
          lastThresholdTimeRef.current = now;
          
          // Sync with backend
          if (sessionIdRef.current) {
            try {
              await incrementEngagement(sessionIdRef.current, { points });
              console.log('Engagement synced with backend for quiz threshold');
              
              // Broadcast engagement update to other tabs
              if (options.userId) {
                engagementSync.notifyEngagementUpdate({
                  score: newScore,
                  sessionId: sessionIdRef.current,
                  userId: options.userId
                });
              }
            } catch (error) {
              console.error('Failed to sync engagement with backend:', error);
            }
          }
          
          // Show toast notification
          toast.success(
            `Great engagement! Let's test your knowledge with a quiz.`,
            { duration: 3000 }
          );
          
          // Broadcast quiz unlock to other tabs
          if (sessionIdRef.current) {
            engagementSync.notifyQuizUnlocked(sessionIdRef.current);
            engagementSync.notifyThresholdReached({
              type: 'quiz',
              score: newScore,
              sessionId: sessionIdRef.current
            });
          }
          
          // Trigger quiz
          options.onQuizTrigger?.();
        }, 1000); // 1 second debounce
      }
      
      // Stage 2: Practice Threshold (70 points) - only after quiz completion
      if (newScore >= options.practiceThreshold && !isPracticeThresholdReached && isQuizThresholdReached) {
        console.log('🎯 Practice threshold reached at', newScore, 'points!');
        
        // Clear any existing debounce
        if (thresholdDebounceRef.current) {
          clearTimeout(thresholdDebounceRef.current);
        }
        
        // Debounced threshold trigger
        thresholdDebounceRef.current = setTimeout(async () => {
          setIsPracticeThresholdReached(true);
          setTriggeredActivity('practice');
          setAssessmentSequence('practice');
          lastThresholdTimeRef.current = now;
          
          // Sync with backend
          if (sessionIdRef.current) {
            try {
              await incrementEngagement(sessionIdRef.current, { points });
              console.log('Engagement synced with backend for practice threshold');
              
              // Broadcast engagement update to other tabs
              if (options.userId) {
                engagementSync.notifyEngagementUpdate({
                  score: newScore,
                  sessionId: sessionIdRef.current,
                  userId: options.userId
                });
              }
            } catch (error) {
              console.error('Failed to sync engagement with backend:', error);
            }
          }
          
          // Show toast notification
          toast.success(
            `Excellent progress! Now let's test your practical skills with coding practice.`,
            { duration: 4000 }
          );
          
          // Broadcast practice unlock to other tabs
          if (sessionIdRef.current) {
            engagementSync.notifyPracticeUnlocked(sessionIdRef.current);
            engagementSync.notifyThresholdReached({
              type: 'practice',
              score: newScore,
              sessionId: sessionIdRef.current
            });
          }
          
          // Trigger practice
          options.onPracticeTrigger?.();
        }, 1000); // 1 second debounce
      }
      
      return newScore;
    });

    // Accumulate passive engagement (not already persisted elsewhere)
    if (type === 'interaction' || type === 'scroll' || type === 'time') {
      pendingPassivePointsRef.current += points;
    }

    lastActivityRef.current = new Date();
    
    // Save to session metadata
    saveEngagementData();
    
    // Sync with backend periodically
    if (sessionIdRef.current && Math.random() < 0.3) { // 30% chance to sync
      syncThresholdStatusWithBackend();
    }
  }, [isTracking, options.quizThreshold, options.practiceThreshold, isQuizThresholdReached, isPracticeThresholdReached, options.onQuizTrigger, options.onPracticeTrigger, options.autoTrigger, saveEngagementData, syncThresholdStatusWithBackend]);

  // Periodically flush passive points to backend (integer only)
  useEffect(() => {
    if (!sessionIdRef.current) return;
    let isCancelled = false;
    const interval = setInterval(async () => {
      if (isCancelled) return;
      const available = Math.floor(pendingPassivePointsRef.current);
      if (!available || available < 1) return;
      if (!sessionIdRef.current) return;
      try {
        await incrementEngagement(sessionIdRef.current, { points: available });
        pendingPassivePointsRef.current -= available;
      } catch (err) {
        // Keep points in buffer; will retry on next tick
        console.debug('Passive engagement flush failed; will retry', err);
      }
    }, 3000);

    // Flush on tab hide/unmount
    const flushNow = async () => {
      const availableRaw = pendingPassivePointsRef.current;
      const toSend = availableRaw >= 1 ? Math.floor(availableRaw) : (availableRaw > 0 ? 1 : 0);
      if (!toSend || toSend < 1) return;
      if (!sessionIdRef.current) return;
      try {
        await incrementEngagement(sessionIdRef.current, { points: toSend });
        pendingPassivePointsRef.current -= toSend;
      } catch {}
    };
    const onHide = () => { flushNow(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [options.userId]);

  // Track message sending
  const trackMessage = useCallback(() => {
    trackActivity('message', 3);
  }, [trackActivity]);

  // Track code execution
  const trackCodeExecution = useCallback(() => {
    trackActivity('code_execution', 5);
  }, [trackActivity]);

  // Track scroll activity
  const trackScroll = useCallback(() => {
    trackActivity('scroll', 1);
  }, [trackActivity]);

  // Track general interaction
  const trackInteraction = useCallback(() => {
    trackActivity('interaction', 1);
  }, [trackActivity]);

  // Track time-based engagement
  const trackTimeEngagement = useCallback(() => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Award points for sustained activity (every 2 minutes of activity)
    if (timeSinceLastActivity >= 120000) { // 2 minutes
      trackActivity('time', 1);
    }
  }, [trackActivity]);

  // Track quiz completion (NO POINTS - triggers practice next)
  const trackQuizCompletion = useCallback(() => {
    setTriggeredActivity(null);
    
    // ✅ RISK MITIGATION: Don't reset engagement score - keep it for practice threshold
    // The engagement score continues accumulating after quiz completion
    
    // After quiz completion, wait for practice threshold (70 points)
    toast.success(
      `Great job on the quiz! Continue engaging to unlock practice exercises.`,
      { duration: 4000 }
    );
    
    // Don't auto-trigger practice - let user reach 70 points naturally
    // This ensures proper engagement flow and prevents spam
  }, []);

  // Track practice completion (NO POINTS - triggers preference poll and resets sequence)
  const trackPracticeCompletion = useCallback(() => {
    setTriggeredActivity(null);
    setAssessmentSequence(null); // Reset sequence for next cycle
    setIsPracticeCompleted(true);
    setIsPracticeThresholdReached(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('practiceCompleted', 'true');
        localStorage.setItem('practiceCompletionTime', String(Date.now()));
      }
    } catch {}
    
    // Show preference poll after practice completion
    setTimeout(() => {
      options.onPreferencePoll?.();
    }, 1000);
  }, [options.onPreferencePoll]);

  // Start tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
    
    // Don't reset engagement data if it's already loaded from session
    if (events.length === 0) {
      setIsQuizThresholdReached(false);
      setIsPracticeThresholdReached(false);
      setEngagementScore(0);
      setEvents([]);
      setTriggeredActivity(null);
      setAssessmentSequence(null);
      lastActivityRef.current = new Date();
    }

    // Set up activity timeout
    activityTimeoutRef.current = setInterval(trackTimeEngagement, 300000); // Check every 5 minutes

    // Add event listeners for user activity (less aggressive)
    let activityTimeout: NodeJS.Timeout | null = null;
    
    const handleActivity = () => {
      // Debounce activity tracking to prevent spam
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityTimeout = setTimeout(() => {
        trackInteraction();
      }, 2000); // Only track after 2 seconds of inactivity
    };

    document.addEventListener('mousemove', handleActivity, { passive: true });
    document.addEventListener('keydown', handleActivity, { passive: true });
    document.addEventListener('click', handleActivity, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [trackInteraction, trackTimeEngagement, events.length]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (activityTimeoutRef.current) {
      clearInterval(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
  }, []);

  // Reset tracking
  const resetTracking = useCallback(() => {
    setEngagementScore(0);
    setIsQuizThresholdReached(false);
    setIsPracticeThresholdReached(false);
    setEvents([]);
    setTriggeredActivity(null);
    setAssessmentSequence(null);
    lastActivityRef.current = new Date();
    quizAutoTriggeredRef.current = false;
    practiceAutoTriggeredRef.current = false;
  }, []);

  // Get engagement analytics
  const getEngagementAnalytics = useCallback(() => {
    const now = new Date();
    const sessionDuration = now.getTime() - lastActivityRef.current.getTime();
    
    return {
      score: engagementScore,
      quizThreshold: options.quizThreshold,
      practiceThreshold: options.practiceThreshold,
      isQuizThresholdReached,
      isPracticeThresholdReached,
      triggeredActivity,
      sessionDuration: Math.floor(sessionDuration / 1000), // seconds
      eventCount: events.length,
      eventsByType: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averagePointsPerMinute: events.length > 0 
        ? (engagementScore / (sessionDuration / 60000)).toFixed(2)
        : '0',
      // Add assessment tracking (separate from engagement points)
      assessmentsCompleted: {
        quizzes: 0, // Will be tracked separately
        practices: 0 // Will be tracked separately
      }
    };
  }, [engagementScore, options.quizThreshold, options.practiceThreshold, isQuizThresholdReached, isPracticeThresholdReached, triggeredActivity, events]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current);
      }
    };
  }, []);

  return {
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
    syncThresholdStatusWithBackend,
    events
  };
}
