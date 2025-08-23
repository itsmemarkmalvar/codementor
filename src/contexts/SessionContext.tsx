'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getActivePreservedSession, reactivatePreservedSession, deactivatePreservedSession, updateConversationHistory, updateSessionMetadata } from '@/services/api';
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
  // Enhanced metadata preservation methods
  loadSessionMetadata: () => any;
  saveSessionMetadata: (metadata: any) => void;
  syncMetadataWithBackend: () => Promise<void>;
  isMetadataSynced: boolean;
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
  const [isMetadataSynced, setIsMetadataSynced] = useState(false);

  // Helper function to safely get current user ID from JWT token
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Raw token from localStorage:', token.substring(0, 50) + '...');
        
        // Check if token has the expected JWT format (3 parts separated by dots)
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.warn('Token does not have expected JWT format (3 parts)');
          return null;
        }
        
        // Safely decode the payload part
        const payloadPart = parts[1];
        console.log('Payload part:', payloadPart);
        
        // Add padding if needed for base64 decoding
        const paddedPayload = payloadPart + '='.repeat((4 - payloadPart.length % 4) % 4);
        
        try {
          const decodedPayload = atob(paddedPayload);
          console.log('Decoded payload:', decodedPayload);
          const payload = JSON.parse(decodedPayload);
          const userId = payload.user_id || payload.sub;
          console.log('Extracted user ID:', userId);
          return userId;
        } catch (decodeError) {
          console.error('Error decoding JWT payload:', decodeError);
          return null;
        }
      }
    } catch (err) {
      console.error('Error getting current user ID:', err);
    }
    return null;
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSessionFromStorage = () => {
      try {
        // Note: We can't load user-specific session on mount because we don't know the user ID yet
        // The session will be loaded when initializeSession is called with the user ID
        console.log('Session loading from storage skipped - will be loaded when user ID is available');
      } catch (err) {
        console.error('Error loading session from storage:', err);
      }
    };

    loadSessionFromStorage();
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (currentSession) {
      // Get current user ID for user-specific storage
      const currentUserId = currentSession.user_id || 'anonymous';
      const storageKey = `preserved_session_${currentUserId}`;
      
      localStorage.setItem(storageKey, JSON.stringify(currentSession));
      // Notify other tabs about session update
      sessionSync.notifySessionUpdate(currentSession);
    } else {
      // Remove session for current user
      const currentUserId = currentSession?.user_id || 'anonymous';
      const storageKey = `preserved_session_${currentUserId}`;
      localStorage.removeItem(storageKey);
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
        const currentUserId = currentSession?.user_id || 'anonymous';
        const storageKey = `conversation_history_${currentUserId}`;
        localStorage.setItem(storageKey, JSON.stringify(conversationData.messages));
        setIsConversationSynced(false); // Mark as needing sync
      }
    });

    // Listen for metadata updates from other tabs
    const unsubscribeMetadataUpdate = sessionSync.onMetadataUpdate((metadataData) => {
      console.log('Received metadata update from other tab:', metadataData);
      // Save metadata from other tabs
      if (metadataData.sessionId === currentSession?.session_identifier) {
        const currentUserId = currentSession?.user_id || 'anonymous';
        const storageKey = `session_metadata_${currentUserId}`;
        localStorage.setItem(storageKey, JSON.stringify(metadataData.metadata));
        setIsMetadataSynced(false); // Mark as needing sync
      }
    });

    return () => {
      unsubscribeSessionUpdate();
      unsubscribeSessionActivated();
      unsubscribeSessionDeactivated();
      unsubscribeConversationUpdate();
      unsubscribeMetadataUpdate();
    };
  }, [currentSession?.session_identifier]);

  const initializeSession = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getActivePreservedSession(userId);
      
      if (response.data) {
        console.log('Session data from backend:', response.data);
        
        // Merge backend session metadata with localStorage metadata
        const localStorageMetadata = loadSessionMetadata();
        const backendMetadata = response.data.session_metadata || {};
        
        console.log('LocalStorage metadata:', localStorageMetadata);
        console.log('Backend metadata:', backendMetadata);
        
        // Merge metadata (localStorage takes precedence for recent changes)
        const mergedMetadata = { ...backendMetadata, ...localStorageMetadata };
        console.log('Merged metadata:', mergedMetadata);
        
        // Update localStorage with merged metadata
        if (Object.keys(mergedMetadata).length > 0) {
          const currentUserId = response.data.user_id || 'anonymous';
          const storageKey = `session_metadata_${currentUserId}`;
          localStorage.setItem(storageKey, JSON.stringify(mergedMetadata));
        }
        
        setCurrentSession(response.data);
        console.log('Session initialized:', response.data.session_identifier);
        
        // Check if session has conversation history
        if (response.data.conversation_history && Array.isArray(response.data.conversation_history)) {
          console.log('Session has conversation history from backend:', {
            messageCount: response.data.conversation_history.length,
            sampleMessage: response.data.conversation_history[0] ? {
              id: response.data.conversation_history[0].id,
              text: response.data.conversation_history[0].text?.substring(0, 50) + '...',
              sender: response.data.conversation_history[0].sender,
              _model: response.data.conversation_history[0]._model
            } : null
          });
          
          // Save conversation history to localStorage for the hook to load
          const currentUserId = response.data.user_id || 'anonymous';
          const storageKey = `conversation_history_${currentUserId}`;
          localStorage.setItem(storageKey, JSON.stringify(response.data.conversation_history));
          console.log('Saved conversation history to localStorage:', storageKey);
        } else {
          console.log('No conversation history in backend session - will try to load from chat_messages');
        }
        
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
      // Get current user ID for user-specific storage
      const currentUserId = currentSession?.user_id || 'anonymous';
      const storageKey = `conversation_history_${currentUserId}`;
      
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading conversation history:', err);
      return [];
    }
  };

  const saveConversationHistory = (messages: any[]) => {
    try {
      // Get current user ID for user-specific storage
      const currentUserId = currentSession?.user_id || 'anonymous';
      const storageKey = `conversation_history_${currentUserId}`;
      
      console.log(`Saving conversation history to localStorage (user ${currentUserId}):`, {
        messageCount: messages.length,
        sampleMessage: messages[0] ? {
          id: messages[0].id,
          text: messages[0].text?.substring(0, 50) + '...',
          sender: messages[0].sender,
          timestamp: messages[0].timestamp,
          _model: messages[0]._model
        } : null
      });
      
      localStorage.setItem(storageKey, JSON.stringify(messages));
      
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
    
    // Check if session belongs to current user
    console.log('Session validation:', {
      sessionId: currentSession.session_identifier,
      userId: currentSession.user_id,
      isActive: currentSession.is_active
    });
    
    const currentUserId = getCurrentUserId();
    console.log('Current user ID from token:', currentUserId);
    
    // Validate session ownership (more flexible validation)
    if (currentUserId && currentSession.user_id) {
      const sessionUserId = currentSession.user_id.toString();
      const tokenUserId = currentUserId.toString();
      
      console.log('Session ownership check:', {
        sessionUserId,
        tokenUserId,
        match: sessionUserId === tokenUserId
      });
      
      if (sessionUserId !== tokenUserId) {
        console.warn('Session ownership mismatch detected:', {
          sessionUserId: sessionUserId,
          currentUserId: tokenUserId,
          sessionId: currentSession.session_identifier
        });
        
        // Instead of clearing immediately, let's check if this is a valid session
        // Sometimes the backend might have a different user ID format
        console.log('Proceeding with session anyway - will validate with backend');
      }
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
      
      console.log('Formatted messages for backend sync:', {
        sessionId: currentSession.session_identifier,
        messageCount: formattedMessages.length,
        sampleMessage: formattedMessages[0] ? {
          id: formattedMessages[0].id,
          text: formattedMessages[0].text?.substring(0, 50) + '...',
          sender: formattedMessages[0].sender,
          timestamp: formattedMessages[0].timestamp,
          _model: formattedMessages[0]._model
        } : null
      });
      
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

  // Enhanced metadata preservation methods
  const loadSessionMetadata = (): any => {
    try {
      // Get current user ID for user-specific storage
      const currentUserId = currentSession?.user_id || 'anonymous';
      const storageKey = `session_metadata_${currentUserId}`;
      
      const stored = localStorage.getItem(storageKey);
      console.log(`Raw session metadata from localStorage (user ${currentUserId}):`, stored);
      const parsed = stored ? JSON.parse(stored) : {};
      console.log(`Parsed session metadata (user ${currentUserId}):`, parsed);
      return parsed;
    } catch (err) {
      console.error('Error loading session metadata:', err);
      return {};
    }
  };

  const saveSessionMetadata = (metadata: any) => {
    try {
      // Get current user ID for user-specific storage
      const currentUserId = currentSession?.user_id || 'anonymous';
      const storageKey = `session_metadata_${currentUserId}`;
      
      console.log(`Saving session metadata to localStorage (user ${currentUserId}):`, {
        engagement_score: metadata.engagement_data?.score,
        topic_id: metadata.topic_data?.id,
        lesson_id: metadata.lesson_data?.id
      });
      console.log('Full metadata being saved:', metadata);
      
      // Get existing metadata and merge with new metadata
      const existingMetadata = loadSessionMetadata();
      const mergedMetadata = { ...existingMetadata, ...metadata };
      
      console.log('Existing metadata:', existingMetadata);
      console.log('Merged metadata:', mergedMetadata);
      
      localStorage.setItem(storageKey, JSON.stringify(mergedMetadata));
      
      // Notify other tabs about metadata update
      if (currentSession?.session_identifier) {
        sessionSync.notifyMetadataUpdate({
          sessionId: currentSession.session_identifier,
          metadata: metadata,
          timestamp: Date.now()
        });
      }
      
      setIsMetadataSynced(false); // Mark as needing backend sync
    } catch (err) {
      console.error('Error saving session metadata:', err);
    }
  };

  const syncMetadataWithBackend = async () => {
    console.log('syncMetadataWithBackend called. currentSession:', currentSession?.session_identifier, 'isMetadataSynced:', isMetadataSynced);
    if (!currentSession?.session_identifier) {
      console.log('Metadata sync skipped: No active session found');
      return;
    }
    
    if (isMetadataSynced) {
      console.log('Metadata sync skipped: Metadata already synced');
      return;
    }
    
    const currentUserId = getCurrentUserId();
    
    // Validate session ownership (more flexible validation)
    if (currentUserId && currentSession.user_id) {
      const sessionUserId = currentSession.user_id.toString();
      const tokenUserId = currentUserId.toString();
      
      console.log('Session ownership check (metadata):', {
        sessionUserId,
        tokenUserId,
        match: sessionUserId === tokenUserId
      });
      
      if (sessionUserId !== tokenUserId) {
        console.warn('Session ownership mismatch detected in metadata sync:', {
          sessionUserId: sessionUserId,
          currentUserId: tokenUserId,
          sessionId: currentSession.session_identifier
        });
        
        // Instead of clearing immediately, let's check if this is a valid session
        console.log('Proceeding with metadata sync anyway - will validate with backend');
      }
    }

    try {
      const metadata = loadSessionMetadata();
      console.log('Attempting to sync metadata:', {
        sessionId: currentSession.session_identifier,
        engagement_score: metadata.engagement_data?.score,
        topic_id: metadata.topic_data?.id,
        lesson_id: metadata.lesson_data?.id
      });
      
      console.log('Calling updateSessionMetadata API with sessionId:', currentSession.session_identifier, 'metadata:', metadata);
      await updateSessionMetadata(currentSession.session_identifier, metadata);
      
      // Update the session with metadata
      const updatedSession = {
        ...currentSession,
        session_metadata: metadata,
        last_activity: new Date().toISOString()
      };
      setCurrentSession(updatedSession);
      setIsMetadataSynced(true);
      
      console.log('Metadata synced with backend for session:', currentSession.session_identifier);
    } catch (err) {
      console.error('Error syncing metadata with backend:', err);
      // Don't set isMetadataSynced to true on error, so it can retry
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
    isConversationSynced,
    // Enhanced metadata preservation methods
    loadSessionMetadata,
    saveSessionMetadata,
    syncMetadataWithBackend,
    isMetadataSynced
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
