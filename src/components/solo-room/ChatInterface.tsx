import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, ThumbsUp, ThumbsDown, ArrowDown, MessageSquare } from 'lucide-react';
import { TutorPreferences } from '@/hooks/useTutorChat';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Define message type
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: Date;
  code?: string;
}

// Define topic type
interface Topic {
  id: number;
  title: string;
  description?: string;
}

// Main component props
interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<any>;
  topic: Topic | null;
  preferences?: TutorPreferences;
  onUpdatePreferences?: (prefs: Partial<TutorPreferences>) => void;
}

// Constants for pagination and performance
const MESSAGES_PER_PAGE = 50;
const INITIAL_MESSAGES_TO_SHOW = 20;

// Helper function to parse code blocks in messages
const parseMessageWithCodeBlocks = (text: string) => {
  if (!text) return [{ type: 'text', content: '' }];

  const parts = [];
  const codeBlockRegex = /```([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Add code block
    parts.push({
      type: 'code',
      content: match[1].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last code block
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  onSendMessage, 
  topic,
  preferences,
  onUpdatePreferences
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [displayedMessages, setDisplayedMessages] = useState(INITIAL_MESSAGES_TO_SHOW);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Optimize message rendering with useMemo
  const visibleMessages = useMemo(() => {
    const totalMessages = messages.length;
    const startIndex = Math.max(0, totalMessages - displayedMessages);
    return messages.slice(startIndex);
  }, [messages, displayedMessages]);

  // Auto-scroll disabled - manual scroll only
  useEffect(() => {
    lastMessageCountRef.current = messages.length;
    // Auto-scroll functionality disabled per user request
  }, [messages]);

  // Handle scroll to detect if user is near bottom
  const handleScroll = useCallback((event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
    
    setIsNearBottom(isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 10);

    // Load more messages when scrolling to top
    if (scrollTop < 100 && displayedMessages < messages.length) {
      setDisplayedMessages(prev => Math.min(prev + MESSAGES_PER_PAGE, messages.length));
    }
  }, [displayedMessages, messages.length]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (inputMessage.trim() === '') return;
    
    const message = inputMessage;
    setInputMessage('');
    await onSendMessage(message);
    
    // Focus back on input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsNearBottom(true);
    }
  };

  const renderMessage = useCallback((message: Message, index?: number) => {
    const parts = parseMessageWithCodeBlocks(message.text);
    const isUser = message.sender === 'user';
    
          return (
        <div key={`${message.id}-${index || 0}-${message.timestamp.getTime()}`} className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8 bg-[#2E5BFF]">
              <AvatarFallback className="bg-[#2E5BFF] text-white text-xs">AI</AvatarFallback>
            </Avatar>
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div className={`rounded-2xl px-5 py-4 ${
            isUser 
              ? 'bg-[#2E5BFF] text-white ml-auto' 
              : 'bg-white/10 text-white border border-white/20'
          }`}>
            {!isUser && (
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-xs text-gray-300">AI Tutor</span>
                {preferences?.aiModel && (
                  <Badge variant="secondary" className="text-xs py-0 h-4 bg-[#2E5BFF]/20 text-[#2E5BFF] border-[#2E5BFF]/30">
                    {preferences.aiModel === 'gemini' ? 'Gemini' : 'Together AI'}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="message-content">
              {parts.map((part, partIndex) => {
                if (part.type === 'code') {
                  return (
                    <div key={partIndex} className="my-2 relative group">
                      <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto border border-white/10">
                        <code className="text-sm font-mono text-gray-200">{part.content}</code>
                      </pre>
                    </div>
                  );
                } else {
                  return (
                    <p key={partIndex} className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      isUser ? 'text-white' : 'text-gray-200'
                    }`}>
                      {part.content}
                    </p>
                  );
                }
              })}
            </div>
          </div>
          
          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {!isUser && onUpdatePreferences && (
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-1 text-gray-400 hover:text-green-400"
                  onClick={() => {/* Handle feedback */}}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-1 text-gray-400 hover:text-red-400"
                  onClick={() => {/* Handle feedback */}}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8 bg-white/10">
              <AvatarFallback className="bg-white/10 text-white text-xs">You</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    );
  }, [preferences, onUpdatePreferences]);

  // Show model selection if preferences are provided
  const renderModelSelector = () => {
    if (!preferences || !onUpdatePreferences) return null;
    
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">AI Model:</span>
        <Button
          size="sm"
          variant={preferences.aiModel === 'together' ? 'default' : 'outline'}
          className={`h-7 text-xs px-2 ${
            preferences.aiModel === 'together' 
              ? 'bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 text-white' 
              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
          }`}
          onClick={() => onUpdatePreferences({ aiModel: 'together' })}
        >
          Together AI
        </Button>
        <Button
          size="sm"
          variant={preferences.aiModel === 'gemini' ? 'default' : 'outline'}
          className={`h-7 text-xs px-2 ${
            preferences.aiModel === 'gemini' 
              ? 'bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 text-white' 
              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
          }`}
          onClick={() => onUpdatePreferences({ aiModel: 'gemini' })}
        >
          Gemini
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Topic header */}
      {topic && (
        <div className="p-3 bg-[#2E5BFF]/20 rounded-t-md mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">
                {topic.title}
              </h3>
              {topic.description && (
                <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
              )}
            </div>
            {messages.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MessageSquare className="h-4 w-4" />
                <span>{messages.length} messages</span>
                {displayedMessages < messages.length && (
                  <Badge variant="outline" className="text-xs bg-white/5 border-white/20">
                    Showing {displayedMessages} of {messages.length}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Model selector */}
      {renderModelSelector()}
      
      {/* Messages area */}
      <Card className="flex-1 min-h-0 overflow-hidden mb-4 bg-white/5 border-white/10 relative">
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-full p-6 custom-scrollbar"
          onScrollCapture={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 bg-[#2E5BFF]/20 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-[#2E5BFF]" />
              </div>
              <h3 className="text-lg font-medium text-white">
                {topic ? `Start chatting about ${topic.title}` : 'Select a topic or start chatting'}
              </h3>
              <p className="text-sm text-gray-400 max-w-md mt-2">
                Ask questions, request explanations, or get help with Java code.
              </p>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium text-white">
                Messages Loading...
              </h3>
              <p className="text-sm text-gray-400 max-w-md mt-2">
                {messages.length} messages available. Scroll up to load older messages.
              </p>
            </div>
          ) : (
            <>
              {/* Load more indicator */}
              {displayedMessages < messages.length && (
                <div className="text-center py-4 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white"
                    onClick={() => setDisplayedMessages(prev => Math.min(prev + MESSAGES_PER_PAGE, messages.length))}
                  >
                    Load {Math.min(MESSAGES_PER_PAGE, messages.length - displayedMessages)} more messages
                  </Button>
                </div>
              )}
              
              {visibleMessages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </>
          )}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 animate-pulse mt-4">
              <Bot className="h-5 w-5" />
              <span>AI is thinking...</span>
            </div>
          )}
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <Button
            className="absolute bottom-4 right-4 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 rounded-full w-10 h-10 p-0 shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </Card>
      
      {/* Input area */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-3">
        <div className="relative flex items-end gap-3">
          <Textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={topic ? `Ask about ${topic.title}...` : 'Type a message...'}
            className="flex-1 min-h-[40px] max-h-[120px] bg-transparent border-0 text-white placeholder:text-gray-400 focus:ring-0 focus:outline-none resize-none"
            disabled={isLoading}
          />
          <Button
            className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 rounded-full w-10 h-10 p-0 flex items-center justify-center flex-shrink-0"
            size="sm"
            disabled={inputMessage.trim() === '' || isLoading}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 