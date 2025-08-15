import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface EngagementTrackerOptions {
  threshold: number;
  sessionId?: number;
  onThresholdReached?: () => void;
  onQuizTrigger?: () => void;
  onPracticeTrigger?: () => void;
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
        
        // Trigger quiz or practice based on session type
        if (Math.random() > 0.5) {
          options.onQuizTrigger?.();
        } else {
          options.onPracticeTrigger?.();
        }
      }
      
      return newScore;
    });

    lastActivityRef.current = new Date();
  }, [isTracking, options.threshold, isThresholdReached, options.onThresholdReached, options.onQuizTrigger, options.onPracticeTrigger]);

  // Track message sending
  const trackMessage = useCallback(() => {
    trackActivity('message', 1); // Reduced from 2 to 1
  }, [trackActivity]);

  // Track code execution
  const trackCodeExecution = useCallback(() => {
    trackActivity('code_execution', 2); // Reduced from 3 to 2
  }, [trackActivity]);

  // Track scroll activity
  const trackScroll = useCallback(() => {
    trackActivity('scroll', 0.5); // Reduced from 1 to 0.5
  }, [trackActivity]);

  // Track general interaction
  const trackInteraction = useCallback(() => {
    trackActivity('interaction', 0.5); // Reduced from 1 to 0.5
  }, [trackActivity]);

  // Track time-based engagement
  const trackTimeEngagement = useCallback(() => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Award points for sustained activity (every 5 minutes of activity)
    if (timeSinceLastActivity >= 300000) { // 5 minutes (increased from 2)
      trackActivity('time', 0.5); // Reduced points from 1 to 0.5
    }
  }, [trackActivity]);

  // Start tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
    setIsThresholdReached(false);
    setEngagementScore(0);
    setEvents([]);
    lastActivityRef.current = new Date();

    // Set up activity timeout
    activityTimeoutRef.current = setInterval(trackTimeEngagement, 300000); // Check every 5 minutes (increased from 1 minute)

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
  }, [engagementScore, options.threshold, isThresholdReached, events]);

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
    isTracking,
    trackMessage,
    trackCodeExecution,
    trackScroll,
    trackInteraction,
    startTracking,
    stopTracking,
    resetTracking,
    getEngagementAnalytics,
    events
  };
}
