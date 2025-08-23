import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';

interface EngagementTrackerOptions {
  threshold: number;
  sessionId?: number;
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
  const [isThresholdReached, setIsThresholdReached] = useState(false);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [triggeredActivity, setTriggeredActivity] = useState<'quiz' | 'practice' | null>(null);
  const [assessmentSequence, setAssessmentSequence] = useState<'quiz' | 'practice' | null>(null);
  
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

  // Load engagement data from session metadata on mount
  useEffect(() => {
    if (currentSession) {
      const metadata = loadSessionMetadata();
      const engagementData = metadata.engagement_data;
      
      if (engagementData) {
        console.log('Loading engagement data from session:', engagementData);
        setEngagementScore(engagementData.score || 0);
        setIsThresholdReached(engagementData.is_threshold_reached || false);
        setEvents(engagementData.events || []);
        setTriggeredActivity(engagementData.triggered_activity || null);
        setAssessmentSequence(engagementData.assessment_sequence || null);
        
        // Restore last activity timestamp
        if (engagementData.last_activity) {
          lastActivityRef.current = new Date(engagementData.last_activity);
        }
      }
    }
  }, [currentSession, loadSessionMetadata]);

  // Save engagement data to session metadata
  const saveEngagementData = useCallback(() => {
    if (!currentSession) return;

    const engagementData = {
      score: engagementScore,
      is_threshold_reached: isThresholdReached,
      events: events,
      triggered_activity: triggeredActivity,
      assessment_sequence: assessmentSequence,
      last_activity: lastActivityRef.current.toISOString()
    };

    const metadata = {
      engagement_data: engagementData
    };

    saveSessionMetadata(metadata);
  }, [currentSession, engagementScore, isThresholdReached, events, triggeredActivity, assessmentSequence, saveSessionMetadata]);

  // Save engagement data whenever it changes
  useEffect(() => {
    saveEngagementData();
  }, [saveEngagementData]);

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

  // Track user activity
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
      
      console.log(`Engagement tracking: ${type} (+${points}) = ${newScore}/${options.threshold}`);
      
      // Check if threshold is reached
      if (newScore >= options.threshold && !isThresholdReached) {
        console.log('Engagement threshold reached!');
        setIsThresholdReached(true);
        options.onThresholdReached?.();
        
        // Auto-trigger quiz first (sequential flow)
        if (options.autoTrigger !== false) {
          setTriggeredActivity('quiz');
          setAssessmentSequence('quiz');
          
          // Show toast notification
          toast.success(
            `Great engagement! Let's test your knowledge with a quiz.`,
            { duration: 3000 }
          );
          
          // Trigger quiz first
          options.onQuizTrigger?.();
        }
      }
      
      return newScore;
    });

    lastActivityRef.current = new Date();
  }, [isTracking, options.threshold, isThresholdReached, options.onThresholdReached, options.onQuizTrigger, options.onPracticeTrigger, options.autoTrigger]);

  // Track message sending
  const trackMessage = useCallback(() => {
    trackActivity('message', 1);
  }, [trackActivity]);

  // Track code execution
  const trackCodeExecution = useCallback(() => {
    trackActivity('code_execution', 2);
  }, [trackActivity]);

  // Track scroll activity
  const trackScroll = useCallback(() => {
    trackActivity('scroll', 0.5);
  }, [trackActivity]);

  // Track general interaction
  const trackInteraction = useCallback(() => {
    trackActivity('interaction', 0.5);
  }, [trackActivity]);

  // Track time-based engagement
  const trackTimeEngagement = useCallback(() => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Award points for sustained activity (every 5 minutes of activity)
    if (timeSinceLastActivity >= 300000) { // 5 minutes
      trackActivity('time', 0.5);
    }
  }, [trackActivity]);

  // Track quiz completion (NO POINTS - triggers practice next)
  const trackQuizCompletion = useCallback(() => {
    setTriggeredActivity(null);
    
    // After quiz completion, trigger practice to test practical knowledge
    setTimeout(() => {
      setTriggeredActivity('practice');
      setAssessmentSequence('practice');
      
      toast.success(
        `Great job on the quiz! Now let's test your practical skills with some coding practice.`,
        { duration: 4000 }
      );
      
      // Trigger practice after quiz completion
      options.onPracticeTrigger?.();
    }, 2000); // 2 second delay before triggering practice
  }, [options.onPracticeTrigger]);

  // Track practice completion (NO POINTS - triggers preference poll and resets sequence)
  const trackPracticeCompletion = useCallback(() => {
    setTriggeredActivity(null);
    setAssessmentSequence(null); // Reset sequence for next cycle
    
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
      setIsThresholdReached(false);
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
    setIsThresholdReached(false);
    setEvents([]);
    setTriggeredActivity(null);
    setAssessmentSequence(null);
    lastActivityRef.current = new Date();
  }, []);

  // Get engagement analytics
  const getEngagementAnalytics = useCallback(() => {
    const now = new Date();
    const sessionDuration = now.getTime() - lastActivityRef.current.getTime();
    
    return {
      score: engagementScore,
      threshold: options.threshold,
      isThresholdReached,
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
  }, [engagementScore, options.threshold, isThresholdReached, triggeredActivity, events]);

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
    isThresholdReached,
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
    events
  };
}
