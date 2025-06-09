import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  const renderMessage = (message: Message) => {
    const parts = parseMessageWithCodeBlocks(message.text);
    
    return (
      <div key={message.id} className="flex gap-3 mb-4">
        <div className="flex-shrink-0 mt-1">
          {message.sender === 'user' ? (
            <Avatar className="h-8 w-8 bg-[#2E5BFF]/30">
              <AvatarFallback className="bg-[#2E5BFF]/30 text-white">U</AvatarFallback>
              <AvatarImage src="/user-avatar.png" />
            </Avatar>
          ) : (
            <Avatar className="h-8 w-8 bg-[#2E5BFF]/30">
              <AvatarFallback className="bg-[#2E5BFF]/30 text-white">AI</AvatarFallback>
              <AvatarImage src="/ai-avatar.png" />
            </Avatar>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white">
              {message.sender === 'user' ? 'You' : 'AI Tutor'}
            </span>
            
            {message.sender === 'ai' && preferences?.aiModel && (
              <Badge variant="secondary" className="text-xs py-0 h-5 bg-[#2E5BFF]/20 text-[#2E5BFF] border-[#2E5BFF]/30">
                {preferences.aiModel === 'gemini' ? 'Gemini' : 'Together AI'}
              </Badge>
            )}
            
            <span className="text-xs text-gray-400">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className="message-content">
            {parts.map((part, index) => {
              if (part.type === 'code') {
                return (
                  <div key={index} className="my-2 relative group">
                    <pre className="bg-black/50 p-3 rounded-md overflow-x-auto">
                      <code className="text-sm font-mono text-gray-200">{part.content}</code>
                    </pre>
                  </div>
                );
              } else {
                return <p key={index} className="whitespace-pre-wrap text-gray-200">{part.content}</p>;
              }
            })}
          </div>
          
          {message.sender === 'ai' && onUpdatePreferences && (
            <div className="flex gap-2 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-gray-400 hover:text-green-400"
                onClick={() => {/* Handle feedback */}}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span className="text-xs">Helpful</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-gray-400 hover:text-red-400"
                onClick={() => {/* Handle feedback */}}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                <span className="text-xs">Not helpful</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topic header */}
      {topic && (
        <div className="p-3 bg-[#2E5BFF]/20 rounded-t-md mb-2">
          <h3 className="font-medium text-white">
            {topic.title}
          </h3>
          {topic.description && (
            <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
          )}
        </div>
      )}
      
      {/* Model selector */}
      {renderModelSelector()}
      
      {/* Messages area */}
      <Card className="flex-1 overflow-hidden mb-4 bg-white/5 border-white/10">
        <ScrollArea className="h-full p-4 custom-scrollbar">
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
          ) : (
            <>
              {messages.map(renderMessage)}
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
      </Card>
      
      {/* Input area */}
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={topic ? `Ask about ${topic.title}...` : 'Type a message...'}
          className="min-h-[80px] pr-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-[#2E5BFF] focus:ring-[#2E5BFF]/50"
          disabled={isLoading}
        />
        <Button
          className="absolute right-2 bottom-2 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
          size="sm"
          disabled={inputMessage.trim() === '' || isLoading}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInterface; 