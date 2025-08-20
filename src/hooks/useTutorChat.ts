import { useState, useCallback, useMemo } from 'react';
import { getTutorResponse, getSplitScreenTutorResponse } from '@/services/api';

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
  // Maintain separate histories per model so switching models shows independent conversations
  const [messagesByModel, setMessagesByModel] = useState<Record<'together' | 'gemini', Message[]>>({
    together: initialMessages,
    gemini: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  // Maintain separate session IDs per model
  const [sessionIdByModel, setSessionIdByModel] = useState<Record<'together' | 'gemini', number | null>>({
    together: null,
    gemini: null,
  });
  const [tutorPreferences, setTutorPreferences] = useState<TutorPreferences>({
    responseLength: 'medium',
    codeExamples: true,
    explanationDetail: 'detailed',
    challengeDifficulty: 'medium',
    aiModel: 'together' // Default to Together AI
  });

  const currentModel = useMemo(() => (tutorPreferences.aiModel ?? 'together') as 'together' | 'gemini', [tutorPreferences.aiModel]);
  const currentMessages = messagesByModel[currentModel];
  const currentSessionId = sessionIdByModel[currentModel];
  
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
    setMessagesByModel(prev => ({
      ...prev,
      [currentModel]: [...prev[currentModel], userMessage]
    }));
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
      setMessagesByModel(prev => ({
        ...prev,
        [currentModel]: [...prev[currentModel], aiMessage]
      }));

      // Update session ID if provided in response
      if (!isError && !isFallback && response.session_id) {
        setSessionIdByModel(prev => ({
          ...prev,
          [currentModel]: response.session_id
        }));
      }

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
      
      // Update session ID if provided
      if (!isError && !isFallback && response.session_id) {
        setSessionIdByModel(prev => ({
          ...prev,
          [currentModel]: response.session_id
        }));
      }

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
    sessionId?: number
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
    setMessagesByModel(prev => ({
      together: [...prev.together, userMessage],
      gemini: [...prev.gemini, userMessage]
    }));
    setIsLoading(true);

    try {
      // Get the last 10 messages for context (use combined history for better context)
      const recentMessages = [...combinedMessages.slice(-9), userMessage];
      const conversationHistory = formatConversationHistory(recentMessages);

      // Make API call to get responses from both models
      const response = await getSplitScreenTutorResponse({
        question: messageText,
        conversationHistory: conversationHistory,
        preferences: tutorPreferences,
        topic_id: topicId,
        session_id: sessionId ?? currentSessionId ?? undefined
      });

      // Check for errors
      const isError = response.error === true;

      // Add AI responses to both models' histories
      const geminiMessage: Message = {
        id: Date.now() + 1,
        text: response.responses.gemini.error 
          ? `Gemini AI Error: ${response.responses.gemini.error}`
          : response.responses.gemini.response || 'Gemini AI: No response received.',
        sender: 'bot', // Use 'bot' for Gemini to match the expected format
        timestamp: new Date(),
      };

      const togetherMessage: Message = {
        id: Date.now() + 2,
        text: response.responses.together.error 
          ? `Together AI Error: ${response.responses.together.error}`
          : response.responses.together.response || 'Together AI: No response received.',
        sender: 'ai', // Use 'ai' for Together to match the expected format
        timestamp: new Date(),
      };

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
        console.log('Adding messages to both models:', {
          gemini: geminiMessage,
          together: togetherMessage,
          prevTogether: prev.together.length,
          prevGemini: prev.gemini.length
        });
        return {
          together: [...prev.together, togetherMessage],
          gemini: [...prev.gemini, geminiMessage]
        };
      });

      // Update session ID if provided in response
      if (!isError && response.session_id) {
        setSessionIdByModel(prev => ({
          together: response.session_id,
          gemini: response.session_id
        }));
      }

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
    setCurrentSessionId: (id: number | null) => setSessionIdByModel(prev => ({ ...prev, [currentModel]: id })),
    // optional debug accessors
    _debug: { messagesByModel, sessionIdByModel },
  };
}

export default useTutorChat; 