'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getActivePreservedSession, reactivatePreservedSession, deactivatePreservedSession } from '@/services/api';
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
  initializeSession: (userId: string) => Promise<void>;
  reactivateSession: (sessionId: string) => Promise<void>;
  deactivateSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
  updateSessionActivity: () => void;
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

    return () => {
      unsubscribeSessionUpdate();
      unsubscribeSessionActivated();
      unsubscribeSessionDeactivated();
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
      } else {
        console.log('No active session found for user');
        setCurrentSession(null);
      }
    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError(err.message || 'Failed to initialize session');
      setCurrentSession(null);
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

  const value: SessionContextType = {
    currentSession,
    isLoading,
    error,
    initializeSession,
    reactivateSession,
    deactivateSession,
    clearSession,
    updateSessionActivity
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
