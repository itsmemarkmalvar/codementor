'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getActivePreservedSession, reactivatePreservedSession, deactivatePreservedSession, updateConversationHistory } from '@/services/api';
import { sessionSync } from '@/utils/crossTabSync';

interface PreservedSession {
  id: number;
  user_id: string;
  session_identifier: string;
  topic_id?: number;
  lesson_id?: number;
  conversation_history: any[];
  session_metadata: any;
  is_active: boolean;
  last_activity: string;
  session_type: string;
  ai_models_used: string[];
  created_at: string;
  updated_at: string;
}

interface SessionContextType {
  currentSession: PreservedSession | null;
  isLoading: boolean;
  error: string | null;
  initializeSession: (userId: string) => Promise<PreservedSession | null>;
  reactivateSession: (sessionId: string) => Promise<void>;
  deactivateSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
  updateSessionActivity: () => void;
  // Enhanced conversation preservation methods
  loadConversationHistory: () => any[];
  saveConversationHistory: (messages: any[]) => void;
  syncConversationWithBackend: () => Promise<void>;
  isConversationSynced: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<PreservedSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConversationSynced, setIsConversationSynced] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSessionFromStorage = () => {
      try {
        const storedSession = localStorage.getItem('preserved_session');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          setCurrentSession(session);
        }
      } catch (err) {
        console.error('Error loading session from storage:', err);
        localStorage.removeItem('preserved_session');
      }
    };

    loadSessionFromStorage();
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('preserved_session', JSON.stringify(currentSession));
      // Notify other tabs about session update
      sessionSync.notifySessionUpdate(currentSession);
    } else {
      localStorage.removeItem('preserved_session');
    }
  }, [currentSession]);

  // Listen for session updates from other tabs
  useEffect(() => {
    const unsubscribeSessionUpdate = sessionSync.onSessionUpdate((sessionData) => {
      console.log('Received session update from other tab:', sessionData);
      setCurrentSession(sessionData);
      // Reset conversation sync status when session changes
      setIsConversationSynced(false);
    });

    const unsubscribeSessionActivated = sessionSync.onSessionActivated((data) => {
      console.log('Session activated in other tab:', data.sessionId);
      if (currentSession?.session_identifier === data.sessionId) {
        // Update local session to reflect activation
        setCurrentSession(prev => prev ? { ...prev, is_active: true } : null);
      }
    });

    const unsubscribeSessionDeactivated = sessionSync.onSessionDeactivated((data) => {
      console.log('Session deactivated in other tab:', data.sessionId);
      if (currentSession?.session_identifier === data.sessionId) {
        // Update local session to reflect deactivation
        setCurrentSession(prev => prev ? { ...prev, is_active: false } : null);
      }
    });

    // Listen for conversation updates from other tabs
    const unsubscribeConversationUpdate = sessionSync.onConversationUpdate((conversationData) => {
      console.log('Received conversation update from other tab:', conversationData);
      // Save conversation history from other tabs
      if (conversationData.sessionId === currentSession?.session_identifier) {
        localStorage.setItem('conversation_history', JSON.stringify(conversationData.messages));
        setIsConversationSynced(false); // Mark as needing sync
      }
    });

    return () => {
      unsubscribeSessionUpdate();
      unsubscribeSessionActivated();
      unsubscribeSessionDeactivated();
      unsubscribeConversationUpdate();
    };
  }, [currentSession?.session_identifier]);

  const initializeSession = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getActivePreservedSession(userId);
      
      if (response.data) {
        setCurrentSession(response.data);
        console.log('Session initialized:', response.data.session_identifier);
        // Notify other tabs about session activation
        sessionSync.notifySessionActivated(response.data.session_identifier);
        return response.data; // Return the session data
      } else {
        console.log('No active session found for user - session will be created when user starts conversation');
        setCurrentSession(null);
        // Don't set error for this case - it's expected when user hasn't started a conversation yet
        return null; // Return null to indicate no session
      }
    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError(err.message || 'Failed to initialize session');
      setCurrentSession(null);
      return null; // Return null on error
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reactivatePreservedSession(sessionId);
      setCurrentSession(response.data);
      console.log('Session reactivated:', response.data.session_identifier);
      // Notify other tabs about session activation
      sessionSync.notifySessionActivated(response.data.session_identifier);
    } catch (err: any) {
      console.error('Error reactivating session:', err);
      setError(err.message || 'Failed to reactivate session');
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await deactivatePreservedSession(sessionId);
      setCurrentSession(null);
      console.log('Session deactivated:', sessionId);
      // Notify other tabs about session deactivation
      sessionSync.notifySessionDeactivated(sessionId);
    } catch (err: any) {
      console.error('Error deactivating session:', err);
      setError(err.message || 'Failed to deactivate session');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    const sessionId = currentSession?.session_identifier;
    setCurrentSession(null);
    setError(null);
    localStorage.removeItem('preserved_session');
    
    // Notify other tabs about session deactivation
    if (sessionId) {
      sessionSync.notifySessionDeactivated(sessionId);
    }
  };

  const updateSessionActivity = () => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        last_activity: new Date().toISOString()
      };
      setCurrentSession(updatedSession);
    }
  };

  // Enhanced conversation preservation methods
  const loadConversationHistory = (): any[] => {
    try {
      const stored = localStorage.getItem('conversation_history');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading conversation history:', err);
      return [];
    }
  };

  const saveConversationHistory = (messages: any[]) => {
    try {
      console.log('Saving conversation history to localStorage:', {
        messageCount: messages.length,
        sampleMessage: messages[0] ? {
          id: messages[0].id,
          text: messages[0].text?.substring(0, 50) + '...',
          sender: messages[0].sender,
          timestamp: messages[0].timestamp,
          _model: messages[0]._model
        } : null
      });
      
      localStorage.setItem('conversation_history', JSON.stringify(messages));
      
      // Notify other tabs about conversation update
      if (currentSession?.session_identifier) {
        sessionSync.notifyConversationUpdate({
          sessionId: currentSession.session_identifier,
          messages: messages,
          timestamp: Date.now()
        });
      }
      
      setIsConversationSynced(false); // Mark as needing backend sync
    } catch (err) {
      console.error('Error saving conversation history:', err);
    }
  };

  const syncConversationWithBackend = async () => {
    if (!currentSession?.session_identifier) {
      console.log('Sync skipped: No active session found');
      return;
    }
    
    if (isConversationSynced) {
      console.log('Sync skipped: Conversation already synced');
      return;
    }

    try {
      const messages = loadConversationHistory();
      console.log('Attempting to sync conversation:', {
        sessionId: currentSession.session_identifier,
        messageCount: messages.length,
        messages: messages.slice(0, 2) // Log first 2 messages for debugging
      });
      
      // Ensure timestamps are properly formatted as ISO strings and IDs are strings
      const formattedMessages = messages.map(msg => ({
        ...msg,
        id: String(msg.id), // Ensure ID is a string
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      
      // Always sync, even if messages array is empty (to clear backend state)
      await updateConversationHistory(currentSession.session_identifier, formattedMessages);
      
      // Update the session with conversation history
      const updatedSession = {
        ...currentSession,
        conversation_history: formattedMessages,
        last_activity: new Date().toISOString()
      };
      setCurrentSession(updatedSession);
      setIsConversationSynced(true);
      
      console.log('Conversation synced with backend for session:', currentSession.session_identifier, 'message count:', formattedMessages.length);
    } catch (err) {
      console.error('Error syncing conversation with backend:', err);
      // Don't set isConversationSynced to true on error, so it can retry
    }
  };

  const value: SessionContextType = {
    currentSession,
    isLoading,
    error,
    initializeSession,
    reactivateSession,
    deactivateSession,
    clearSession,
    updateSessionActivity,
    // Enhanced conversation preservation methods
    loadConversationHistory,
    saveConversationHistory,
    syncConversationWithBackend,
    isConversationSynced
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
