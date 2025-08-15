import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

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
  type: 'message' | 'code_execution' | 'scroll' | 'interaction' | 'time' | 'quiz_completed' | 'practice_completed';
  points: number;
  timestamp: Date;
}

export function useEngagementTracker(options: EngagementTrackerOptions) {
  const [engagementScore, setEngagementScore] = useState(0);
  const [isThresholdReached, setIsThresholdReached] = useState(false);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [triggeredActivity, setTriggeredActivity] = useState<'quiz' | 'practice' | null>(null);
  
  const lastActivityRef = useRef<Date>(new Date());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<number | undefined>(options.sessionId);

  // Update session ID when it changes
  useEffect(() => {
    sessionIdRef.current = options.sessionId;
  }, [options.sessionId]);

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
        
        // Auto-trigger quiz or practice if enabled
        if (options.autoTrigger !== false) {
          const shouldTriggerQuiz = Math.random() > 0.5;
          const activity = shouldTriggerQuiz ? 'quiz' : 'practice';
          
          setTriggeredActivity(activity);
          
          // Show toast notification
          toast.success(
            `Great engagement! Let's test your knowledge with a ${activity}.`,
            { duration: 3000 }
          );
          
          // Trigger the appropriate activity
          if (shouldTriggerQuiz) {
            options.onQuizTrigger?.();
          } else {
            options.onPracticeTrigger?.();
          }
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

  // Track quiz completion
  const trackQuizCompletion = useCallback(() => {
    trackActivity('quiz_completed', 5);
    setTriggeredActivity(null);
    
    // Show preference poll after quiz completion
    setTimeout(() => {
      options.onPreferencePoll?.();
    }, 1000);
  }, [trackActivity, options.onPreferencePoll]);

  // Track practice completion
  const trackPracticeCompletion = useCallback(() => {
    trackActivity('practice_completed', 5);
    setTriggeredActivity(null);
    
    // Show preference poll after practice completion
    setTimeout(() => {
      options.onPreferencePoll?.();
    }, 1000);
  }, [trackActivity, options.onPreferencePoll]);

  // Start tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
    setIsThresholdReached(false);
    setEngagementScore(0);
    setEvents([]);
    setTriggeredActivity(null);
    lastActivityRef.current = new Date();

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

    const handleScroll = () => {
      // Debounce scroll tracking
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityTimeout = setTimeout(() => {
        trackScroll();
      }, 3000); // Only track after 3 seconds of inactivity
    };

    document.addEventListener('mousemove', handleActivity, { passive: true });
    document.addEventListener('keydown', handleActivity, { passive: true });
    document.addEventListener('click', handleActivity, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('scroll', handleScroll);
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [trackInteraction, trackScroll, trackTimeEngagement]);

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
        : '0'
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
