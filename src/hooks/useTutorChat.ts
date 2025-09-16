import { useState, useCallback, useMemo, useEffect } from 'react';
import { getTutorResponse, getSplitScreenTutorResponse } from '@/services/api';
import { useSession } from '@/contexts/SessionContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: Date;
  code?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorPreferences {
  responseLength?: 'short' | 'medium' | 'detailed';
  codeExamples?: boolean;
  explanationDetail?: 'brief' | 'detailed' | 'comprehensive';
  challengeDifficulty?: 'beginner' | 'medium' | 'advanced';
  aiModel?: 'together' | 'gemini'; // Added model selection
}

export function useTutorChat(initialMessages: Message[] = []) {
  // Use session context for preserved session management
  const { 
    currentSession, 
    updateSessionActivity, 
    loadConversationHistory, 
    saveConversationHistory, 
    syncConversationWithBackend,
    isConversationSynced 
  } = useSession();
  
  // Maintain separate histories per model so switching models shows independent conversations
  const [messagesByModel, setMessagesByModel] = useState<Record<'together' | 'gemini', Message[]>>({
    together: [],
    gemini: [],
  });

  // Add state to track when conversation history needs to be saved
  const [pendingConversationSave, setPendingConversationSave] = useState<any[] | null>(null);

  // Save conversation history when pending save is set
  useEffect(() => {
    if (pendingConversationSave) {
      console.log('Saving conversation history from pending state:', pendingConversationSave.length, 'messages');
      saveConversationHistory(pendingConversationSave);
      setPendingConversationSave(null); // Clear the pending state
    }
  }, [pendingConversationSave, saveConversationHistory]);

  // Load conversation history from preserved session on mount
  useEffect(() => {
    const loadPreservedConversation = () => {
      try {
        console.log('Attempting to load preserved conversation history...');
        const preservedHistory = loadConversationHistory();
        console.log('Raw preserved history:', preservedHistory);
        
        if (preservedHistory.length > 0) {
          console.log('Loading preserved conversation history:', preservedHistory.length, 'messages');
          
          // Separate messages by model
          const togetherMessages: Message[] = [];
          const geminiMessages: Message[] = [];
          
          // Simple approach: separate messages by model; normalize sender for AI
          preservedHistory.forEach((msg: any, index) => {
            console.log(`Processing message ${index}:`, {
              id: msg.id,
              sender: msg.sender,
              _model: msg._model,
              textPreview: msg.text?.substring(0, 50) + '...'
            });
            
            const message: Message = {
              id: msg.id || Date.now() + Math.random(),
              text: msg.text || msg.content || '',
              sender: ((): 'user' | 'bot' | 'ai' => {
                // Preserve original for branching; will normalize below when placing into arrays
                if (msg.sender === 'user') return 'user';
                if (msg.sender === 'bot' || msg.sender === 'ai') return msg.sender;
                return 'user';
              })(),
              timestamp: new Date(msg.timestamp || Date.now()),
            };
            
            // Add _model property for proper identification
            (message as any)._model = msg._model;
            
            // Add user messages to both conversations
            if (msg.sender === 'user') {
              const geminiCopy = { ...message };
              const togetherCopy = { ...message };
              geminiMessages.push(geminiCopy);
              togetherMessages.push(togetherCopy);
              console.log(`Added user message to both conversations`);
            }
            // Add AI responses to their respective conversations
            else if (msg._model === 'gemini' || msg.model === 'gemini') {
              // Normalize sender so UI filters work without extra mapping
              (message as any).sender = 'gemini' as any;
              geminiMessages.push(message);
              console.log(`Added Gemini AI response`);
            }
            else if (msg._model === 'together' || msg.model === 'together') {
              (message as any).sender = 'together' as any;
              togetherMessages.push(message);
              console.log(`Added Together AI response`);
            }
            else {
              // Fallback to historical convention: 'bot' => gemini, 'ai' => together
              if (msg.sender === 'bot') {
                (message as any).sender = 'gemini' as any;
                geminiMessages.push(message);
              } else if (msg.sender === 'ai') {
                (message as any).sender = 'together' as any;
                togetherMessages.push(message);
              } else {
                console.log(`Skipped message with unknown model:`, { _model: msg._model, model: msg.model, sender: msg.sender });
              }
            }
          });
          
          setMessagesByModel({
            together: togetherMessages,
            gemini: geminiMessages
          });
          
          console.log('Restored conversation:', {
            together: togetherMessages.length,
            gemini: geminiMessages.length
          });
        }
      } catch (error) {
        console.error('Error loading preserved conversation:', error);
      }
    };

    // Load preserved conversation when session is available
    console.log('useTutorChat: Session changed, attempting to load conversation. Session:', currentSession?.session_identifier);
    if (currentSession?.session_identifier) {
      loadPreservedConversation();
    } else {
      console.log('useTutorChat: No session available, skipping conversation load');
    }
  }, [currentSession?.session_identifier, loadConversationHistory]);

  // Persist conversation on page visibility change/unload to avoid losing latest responses
  useEffect(() => {
    const persist = () => {
      const allMessages = [
        ...messagesByModel.together.map(msg => ({ ...msg, _model: 'together' as const })),
        ...messagesByModel.gemini.map(msg => ({ ...msg, _model: 'gemini' as const }))
      ];
      if (allMessages.length > 0) {
        try {
          saveConversationHistory(allMessages);
        } catch {}
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persist();
      }
    };
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', persist);
    };
  }, [messagesByModel.gemini, messagesByModel.together, saveConversationHistory]);
  const [isLoading, setIsLoading] = useState(false);
  const [tutorPreferences, setTutorPreferences] = useState<TutorPreferences>({
    responseLength: 'medium',
    codeExamples: true,
    explanationDetail: 'detailed',
    challengeDifficulty: 'medium',
    aiModel: 'together' // Default to Together AI
  });

  const currentModel = useMemo(() => (tutorPreferences.aiModel ?? 'together') as 'together' | 'gemini', [tutorPreferences.aiModel]);
  const currentMessages = messagesByModel[currentModel];
  const currentSessionId = currentSession?.session_identifier;
  
  // For split-screen mode, combine messages from both models
  const combinedMessages = useMemo(() => {
    const allMessages = [
      ...messagesByModel.together.map(msg => ({ ...msg, _model: 'together' as const })),
      ...messagesByModel.gemini.map(msg => ({ ...msg, _model: 'gemini' as const }))
    ];
    
    // Sort by timestamp first
    const sorted = allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Deduplicate user messages (they appear in both models but should only appear once)
    const deduplicated = sorted.reduce((acc, msg) => {
      if (msg.sender === 'user') {
        // Check if we already have this user message (same timestamp and text)
        const existing = acc.find(m => 
          m.sender === 'user' && 
          m.timestamp.getTime() === msg.timestamp.getTime() && 
          m.text === msg.text
        );
        if (!existing) {
          acc.push(msg);
        }
      } else {
        // AI messages are unique per model, so keep them all
        acc.push(msg);
      }
      return acc;
    }, [] as typeof sorted);
    
    console.log('Combined messages:', {
      total: deduplicated.length,
      together: messagesByModel.together.length,
      gemini: messagesByModel.gemini.length,
      messages: deduplicated.map(m => ({ sender: m.sender, text: m.text.substring(0, 50) + '...' }))
    });
    return deduplicated;
  }, [messagesByModel.together, messagesByModel.gemini]);

  // Convert frontend message format to API format
  const formatConversationHistory = useCallback((messagesToFormat: Message[]): ConversationMessage[] => {
    return messagesToFormat.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  }, []);

  // Send a message to the AI tutor
  const sendMessage = useCallback(async (
    messageText: string, 
    topicId?: number, 
    topicTitle?: string
  ) => {
    if (!messageText.trim()) return;

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    // Append to current model's history
    setMessagesByModel(prev => {
      const updated = {
        ...prev,
        [currentModel]: [...prev[currentModel], userMessage]
      };
      
      // Save conversation history after updating
      const allMessages = [
        ...updated.together.map((msg: Message) => ({ ...msg, _model: 'together' as const })),
        ...updated.gemini.map((msg: Message) => ({ ...msg, _model: 'gemini' as const }))
      ];
      setPendingConversationSave(allMessages); // Set pending save
      
      return updated;
    });
    setIsLoading(true);

    try {
      // Get the last 10 messages for context
      const recentMessages = [...currentMessages.slice(-9), userMessage];
      const conversationHistory = formatConversationHistory(recentMessages);

      // Make API call with selected model
      const response = await getTutorResponse({
        question: messageText,
        conversationHistory: conversationHistory,
        preferences: {
          ...tutorPreferences,
          model: currentModel // Pass selected model
        },
        topic_id: topicId,
        topic: topicTitle,
        session_id: currentSessionId ?? undefined
      });

      // Check for errors or fallback responses
      const isError = response.error === true;
      const isFallback = response.is_fallback === true || response.fallback === true;

      // Add AI response to messages
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: isError || isFallback
          ? response.response || 'I apologize, but I encountered an issue processing your request.'
          : response.response || 'I apologize, but I couldn\'t generate a response.',
        sender: 'ai',
        timestamp: new Date(),
      };
      // Attach meta so the UI can rate using chat_message_id if returned
      (aiMessage as any)._meta = {
        chat_message_id: response.chat_message_id,
        response_time_ms: response.response_time_ms,
        model: response.model,
      };
      // Append AI message to current model's history
      setMessagesByModel(prev => {
        const updated = {
          ...prev,
          [currentModel]: [...prev[currentModel], aiMessage]
        };
        
        // Save conversation history after updating
        const allMessages = [
          ...updated.together.map(msg => ({ ...msg, _model: 'together' as const })),
          ...updated.gemini.map(msg => ({ ...msg, _model: 'gemini' as const }))
        ];
        setPendingConversationSave(allMessages); // Set pending save
        
        return updated;
      });

      // Update session activity
      updateSessionActivity();

      return {
        success: !isError && !isFallback,
        message: aiMessage,
        sessionId: response.session_id
      };
    } catch (error) {
      console.error('Error sending message to tutor:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error while processing your request. Please try again later.',
        sender: 'ai',
        timestamp: new Date(),
      };
      // Append error message to current model's history
      setMessagesByModel(prev => ({
        ...prev,
        [currentModel]: [...prev[currentModel], errorMessage]
      }));
      
      return {
        success: false,
        message: errorMessage,
        error
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentMessages, currentModel, currentSessionId, formatConversationHistory, tutorPreferences]);

  // Start a new topic session
  const startTopicSession = useCallback(async (topic: { id: number, title: string }) => {
    setIsLoading(true);
    
    try {
      const response = await getTutorResponse({
        question: `I'd like to learn about ${topic.title}. Please provide a brief introduction.`,
        conversationHistory: [],
        preferences: {
          ...tutorPreferences,
          model: currentModel
        },
        topic: topic.title,
        topic_id: topic.id
      });

      // Check if we got an error or fallback response
      const isError = response.error === true;
      const isFallback = response.is_fallback === true || response.fallback === true;

      // Add welcome message
      const welcomeMessage: Message = {
        id: Date.now(),
        text: isError || isFallback
          ? response.response || `Welcome to the ${topic.title} topic! (Note: AI services are currently experiencing issues.)`
          : response.response || `Welcome to the ${topic.title} topic!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      // Reset current model's history to the welcome message
      setMessagesByModel(prev => ({
        ...prev,
        [currentModel]: [welcomeMessage]
      }));
      
      // Update session activity
      updateSessionActivity();

      return {
        success: !isError && !isFallback,
        message: welcomeMessage,
        sessionId: response.session_id
      };
    } catch (error) {
      console.error("Error starting topic session:", error);
      
      // Add fallback welcome message
      const fallbackMessage: Message = {
        id: Date.now(),
        text: `Welcome to the ${topic.title} topic! I'm experiencing some technical difficulties right now, but feel free to ask questions.`,
        sender: 'ai',
        timestamp: new Date(),
      };
      // Reset current model's history on error as well
      setMessagesByModel(prev => ({
        ...prev,
        [currentModel]: [fallbackMessage]
      }));
      
      return {
        success: false,
        message: fallbackMessage,
        error
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentModel, tutorPreferences]);

  // Update preferences
  const updatePreferences = useCallback((newPreferences: Partial<TutorPreferences>) => {
    setTutorPreferences(prev => ({
      ...prev,
      ...newPreferences
    }));
  }, []);

  // Send a message to both AI models simultaneously for split-screen comparison
  const sendSplitScreenMessage = useCallback(async (
    messageText: string, 
    topicId?: number, 
    topicTitle?: string,
    sessionId?: string
  ) => {
    if (!messageText.trim()) return;

    // Add user message to both models' histories
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    // Append to both models' histories
    setMessagesByModel(prev => {
      const updated = {
        together: [...prev.together, userMessage],
        gemini: [...prev.gemini, userMessage]
      };
      
      // Save conversation history after updating
      const allMessages = [
        ...updated.together.map((msg: Message) => ({ ...msg, _model: 'together' as const })),
        ...updated.gemini.map((msg: Message) => ({ ...msg, _model: 'gemini' as const }))
      ];
      setPendingConversationSave(allMessages); // Set pending save
      
      return updated;
    });
    setIsLoading(true);

    try {
      // Get the last 10 messages for context (use combined history for better context)
      const recentMessages = [...combinedMessages.slice(-9), userMessage];
      const conversationHistory = formatConversationHistory(recentMessages);

      // Debug session ID
      console.log('Debug session ID in sendSplitScreenMessage:', {
        sessionId,
        currentSessionId,
        finalSessionId: sessionId ?? currentSessionId,
        type: typeof (sessionId ?? currentSessionId)
      });

      // Make API call to get responses from both models
      const response = await getSplitScreenTutorResponse({
        question: messageText,
        conversationHistory: conversationHistory,
        preferences: tutorPreferences,
        topic_id: topicId,
        session_id: sessionId ?? currentSessionId
      });

      // Check for errors
      const isError = response.error === true;

      // Debug logging for Gemini response
      console.log('Gemini Response Debug:', {
        hasError: !!response.responses.gemini.error,
        error: response.responses.gemini.error,
        hasResponse: !!response.responses.gemini.response,
        responseLength: response.responses.gemini.response ? response.responses.gemini.response.length : 0,
        responsePreview: response.responses.gemini.response ? response.responses.gemini.response.substring(0, 100) + '...' : 'No response'
      });

      // Add AI responses to both models' histories
      const geminiMessage: Message = {
        id: Date.now() + 1,
        text: response.responses.gemini.error 
          ? `Gemini AI Error: ${response.responses.gemini.error}`
          : response.responses.gemini.response || 'Gemini AI: No response received.',
        sender: 'gemini' as any,
        timestamp: new Date(),
      };

      const togetherMessage: Message = {
        id: Date.now() + 2,
        text: response.responses.together.error 
          ? `Together AI Error: ${response.responses.together.error}`
          : response.responses.together.response || 'Together AI: No response received.',
        sender: 'together' as any,
        timestamp: new Date(),
      };

      // (Revert) No extra retry path

      // Add _model property for proper identification in combinedMessages
      (geminiMessage as any)._model = 'gemini';
      (togetherMessage as any)._model = 'together';

      // Debug logging for Together AI response
      console.log('Together AI Response Debug:', {
        hasError: !!response.responses.together.error,
        error: response.responses.together.error,
        hasResponse: !!response.responses.together.response,
        responseLength: response.responses.together.response ? response.responses.together.response.length : 0,
        responsePreview: response.responses.together.response ? response.responses.together.response.substring(0, 100) + '...' : 'No response'
      });

      // Attach meta information
      (geminiMessage as any)._meta = {
        chat_message_id: response.responses.gemini.message_id,
        response_time_ms: response.responses.gemini.response_time_ms,
        model: 'gemini',
      };

      (togetherMessage as any)._meta = {
        chat_message_id: response.responses.together.message_id,
        response_time_ms: response.responses.together.response_time_ms,
        model: 'together',
      };

      // Append AI messages to both models' histories
      setMessagesByModel(prev => {
        const updated = {
          together: [...prev.together, togetherMessage],
          gemini: [...prev.gemini, geminiMessage]
        };
        
        console.log('Adding messages to both models:', {
          gemini: geminiMessage,
          together: togetherMessage,
          prevTogether: prev.together.length,
          prevGemini: prev.gemini.length
        });
        
        // Save conversation history after updating
        const allMessages = [
          ...updated.together.map((msg: Message) => ({ ...msg, _model: 'together' as const })),
          ...updated.gemini.map((msg: Message) => ({ ...msg, _model: 'gemini' as const }))
        ];
        setPendingConversationSave(allMessages); // Set pending save
        
        return updated;
      });

      // Update session activity
      updateSessionActivity();

      return {
        success: !isError,
        geminiMessage,
        togetherMessage,
        sessionId: response.session_id
      };
    } catch (error) {
      console.error('Error sending split-screen message to tutor:', error);
      
      // Add error messages to both models
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error while processing your request. Please try again later.',
        sender: 'ai',
        timestamp: new Date(),
      };

      // Add _model property for proper identification
      (errorMessage as any)._model = 'together';

      setMessagesByModel(prev => ({
        together: [...prev.together, errorMessage],
        gemini: [...prev.gemini, errorMessage]
      }));
      
      return {
        success: false,
        error
      };
    } finally {
      setIsLoading(false);
    }
  }, [combinedMessages, currentSessionId, formatConversationHistory, tutorPreferences]);

  return {
    messages: currentMessages,
    combinedMessages, // Add combined messages for split-screen mode
    isLoading,
    currentSessionId,
    tutorPreferences,
    sendMessage,
    sendSplitScreenMessage,
    startTopicSession,
    updatePreferences,
    // setters act on the currently selected model to preserve separation
    setMessages: (msgs: Message[]) => setMessagesByModel(prev => ({ ...prev, [currentModel]: msgs })),
    // optional debug accessors
    _debug: { messagesByModel },
  };
}

export default useTutorChat; 