import { useState, useCallback } from 'react';
import { getTutorResponse } from '@/services/api';

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [tutorPreferences, setTutorPreferences] = useState<TutorPreferences>({
    responseLength: 'medium',
    codeExamples: true,
    explanationDetail: 'detailed',
    challengeDifficulty: 'medium',
    aiModel: 'together' // Default to Together AI
  });

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

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get the last 10 messages for context
      const recentMessages = [...messages.slice(-9), userMessage];
      const conversationHistory = formatConversationHistory(recentMessages);

      // Make API call with selected model
      const response = await getTutorResponse({
        question: messageText,
        conversationHistory: conversationHistory,
        preferences: {
          ...tutorPreferences,
          model: tutorPreferences.aiModel // Pass selected model
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

      setMessages(prev => [...prev, aiMessage]);

      // Update session ID if provided in response
      if (!isError && !isFallback && response.session_id) {
        setCurrentSessionId(response.session_id);
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
      
      setMessages(prev => [...prev, errorMessage]);
      
      return {
        success: false,
        message: errorMessage,
        error
      };
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentSessionId, formatConversationHistory, tutorPreferences]);

  // Start a new topic session
  const startTopicSession = useCallback(async (topic: { id: number, title: string }) => {
    setIsLoading(true);
    
    try {
      const response = await getTutorResponse({
        question: `I'd like to learn about ${topic.title}. Please provide a brief introduction.`,
        conversationHistory: [],
        preferences: {
          ...tutorPreferences,
          model: tutorPreferences.aiModel
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
      
      setMessages([welcomeMessage]);
      
      // Update session ID if provided
      if (!isError && !isFallback && response.session_id) {
        setCurrentSessionId(response.session_id);
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
      
      setMessages([fallbackMessage]);
      
      return {
        success: false,
        message: fallbackMessage,
        error
      };
    } finally {
      setIsLoading(false);
    }
  }, [tutorPreferences]);

  // Update preferences
  const updatePreferences = useCallback((newPreferences: Partial<TutorPreferences>) => {
    setTutorPreferences(prev => ({
      ...prev,
      ...newPreferences
    }));
  }, []);

  return {
    messages,
    isLoading,
    currentSessionId,
    tutorPreferences,
    sendMessage,
    startTopicSession,
    updatePreferences,
    setMessages,
    setCurrentSessionId
  };
}

export default useTutorChat; 