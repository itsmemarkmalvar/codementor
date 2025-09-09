// Cross-tab synchronization utility using BroadcastChannel API
export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(channelName: string = 'codementor-sync') {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = this.handleMessage.bind(this);
    }
  }

  private handleMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in cross-tab sync listener:', error);
        }
      });
    }
  }

  // Subscribe to a specific event type
  subscribe<T = any>(type: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
      if (this.listeners.get(type)?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  // Broadcast a message to all tabs
  broadcast<T = any>(type: string, data: T): void {
    if (this.channel) {
      this.channel.postMessage({ type, data });
    }
  }

  // Check if BroadcastChannel is supported
  isSupported(): boolean {
    return this.channel !== null;
  }

  // Close the channel
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

// Session-specific sync events
export const SESSION_SYNC_EVENTS = {
  SESSION_UPDATED: 'session_updated',
  SESSION_ACTIVATED: 'session_activated',
  SESSION_DEACTIVATED: 'session_deactivated',
  CONVERSATION_UPDATED: 'conversation_updated',
  METADATA_UPDATED: 'metadata_updated',
  TAB_FOCUSED: 'tab_focused',
  TAB_BLURRED: 'tab_blurred',
  // New engagement and progress events
  ENGAGEMENT_UPDATED: 'engagement_updated',
  THRESHOLD_REACHED: 'threshold_reached',
  PROGRESS_UPDATED: 'progress_updated',
  QUIZ_UNLOCKED: 'quiz_unlocked',
  PRACTICE_UNLOCKED: 'practice_unlocked',
  UI_STATE_UPDATED: 'ui_state_updated'
} as const;

// Create a global instance
export const crossTabSync = new CrossTabSync();

// Session sync utilities
export const sessionSync = {
  // Notify other tabs when session is updated
  notifySessionUpdate: (sessionData: any) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.SESSION_UPDATED, sessionData);
  },

  // Notify other tabs when session is activated
  notifySessionActivated: (sessionId: string) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.SESSION_ACTIVATED, { sessionId });
  },

  // Notify other tabs when session is deactivated
  notifySessionDeactivated: (sessionId: string) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.SESSION_DEACTIVATED, { sessionId });
  },

  // Notify other tabs when conversation is updated
  notifyConversationUpdate: (conversationData: any) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.CONVERSATION_UPDATED, conversationData);
  },

  // Notify other tabs when metadata is updated
  notifyMetadataUpdate: (metadataData: any) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.METADATA_UPDATED, metadataData);
  },

  // Subscribe to session updates
  onSessionUpdate: (callback: (sessionData: any) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.SESSION_UPDATED, callback);
  },

  // Subscribe to session activation
  onSessionActivated: (callback: (data: { sessionId: string }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.SESSION_ACTIVATED, callback);
  },

  // Subscribe to session deactivation
  onSessionDeactivated: (callback: (data: { sessionId: string }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.SESSION_DEACTIVATED, callback);
  },

  // Subscribe to conversation updates
  onConversationUpdate: (callback: (conversationData: any) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.CONVERSATION_UPDATED, callback);
  },

  // Subscribe to metadata updates
  onMetadataUpdate: (callback: (metadataData: any) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.METADATA_UPDATED, callback);
  }
};

// Engagement and progress sync utilities
export const engagementSync = {
  // Notify other tabs when engagement score changes
  notifyEngagementUpdate: (engagementData: { score: number; sessionId: number; userId: string }) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.ENGAGEMENT_UPDATED, engagementData);
  },

  // Notify other tabs when threshold is reached
  notifyThresholdReached: (thresholdData: { type: 'quiz' | 'practice'; score: number; sessionId: number }) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.THRESHOLD_REACHED, thresholdData);
  },

  // Notify other tabs when quiz is unlocked
  notifyQuizUnlocked: (sessionId: number) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.QUIZ_UNLOCKED, { sessionId, timestamp: Date.now() });
  },

  // Notify other tabs when practice is unlocked
  notifyPracticeUnlocked: (sessionId: number) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.PRACTICE_UNLOCKED, { sessionId, timestamp: Date.now() });
  },

  // Subscribe to engagement updates
  onEngagementUpdate: (callback: (engagementData: { score: number; sessionId: number; userId: string }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.ENGAGEMENT_UPDATED, callback);
  },

  // Subscribe to threshold events
  onThresholdReached: (callback: (thresholdData: { type: 'quiz' | 'practice'; score: number; sessionId: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.THRESHOLD_REACHED, callback);
  },

  // Subscribe to quiz unlock events
  onQuizUnlocked: (callback: (data: { sessionId: number; timestamp: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.QUIZ_UNLOCKED, callback);
  },

  // Subscribe to practice unlock events
  onPracticeUnlocked: (callback: (data: { sessionId: number; timestamp: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.PRACTICE_UNLOCKED, callback);
  }
};

// Progress and UI state sync utilities
export const progressSync = {
  // Notify other tabs when progress updates
  notifyProgressUpdate: (progressData: { type: 'quiz' | 'practice' | 'lesson'; progress: number; sessionId: number }) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.PROGRESS_UPDATED, progressData);
  },

  // Notify other tabs when UI state changes
  notifyUIStateUpdate: (uiStateData: { component: string; state: any; sessionId: number }) => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.UI_STATE_UPDATED, uiStateData);
  },

  // Subscribe to progress updates
  onProgressUpdate: (callback: (progressData: { type: 'quiz' | 'practice' | 'lesson'; progress: number; sessionId: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.PROGRESS_UPDATED, callback);
  },

  // Subscribe to UI state updates
  onUIStateUpdate: (callback: (uiStateData: { component: string; state: any; sessionId: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.UI_STATE_UPDATED, callback);
  }
};

// Tab focus/blur handling
export const tabFocusSync = {
  // Notify when tab gains focus
  notifyTabFocused: () => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.TAB_FOCUSED, { timestamp: Date.now() });
  },

  // Notify when tab loses focus
  notifyTabBlurred: () => {
    crossTabSync.broadcast(SESSION_SYNC_EVENTS.TAB_BLURRED, { timestamp: Date.now() });
  },

  // Subscribe to tab focus events
  onTabFocused: (callback: (data: { timestamp: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.TAB_FOCUSED, callback);
  },

  // Subscribe to tab blur events
  onTabBlurred: (callback: (data: { timestamp: number }) => void) => {
    return crossTabSync.subscribe(SESSION_SYNC_EVENTS.TAB_BLURRED, callback);
  }
};

// Initialize tab focus/blur listeners
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    tabFocusSync.notifyTabFocused();
  });

  window.addEventListener('blur', () => {
    tabFocusSync.notifyTabBlurred();
  });
}
