import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  User, 
  Bot, 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'gemini' | 'together';
  timestamp: Date;
  model?: string;
  responseTime?: number;
}

interface Topic {
  id: number;
  title: string;
  description?: string;
}

interface SplitScreenChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<any>;
  topic: Topic | null;
  sessionId?: number;
  engagementScore?: number;
  onEngagementThreshold?: () => void;
}

// Helper function to parse code blocks in messages
const parseMessageWithCodeBlocks = (text: string) => {
  if (!text) return [{ type: 'text', content: '' }];

  const parts = [];
  const codeBlockRegex = /```([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    parts.push({
      type: 'code',
      content: match[1].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
};

export const SplitScreenChatInterface: React.FC<SplitScreenChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  topic,
  sessionId,
  engagementScore = 0,
  onEngagementThreshold
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [fullScreenPanel, setFullScreenPanel] = useState<'gemini' | 'together' | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const geminiScrollRef = useRef<HTMLDivElement>(null);
  const togetherScrollRef = useRef<HTMLDivElement>(null);

  // Separate messages by model
  const geminiMessages = messages.filter(msg => msg.sender === 'gemini' || msg.sender === 'user');
  const togetherMessages = messages.filter(msg => msg.sender === 'together' || msg.sender === 'user');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // Handle scroll to detect if user is near bottom
  const handleScroll = useCallback((event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsNearBottom(isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 10);
  }, [messages.length]);

  // Synchronized scrolling between panels
  const handleGeminiScroll = useCallback((event: any) => {
    handleScroll(event);
    if (fullScreenPanel === null && togetherScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const togetherScrollHeight = togetherScrollRef.current.scrollHeight - togetherScrollRef.current.clientHeight;
      togetherScrollRef.current.scrollTop = scrollPercentage * togetherScrollHeight;
    }
  }, [handleScroll, fullScreenPanel]);

  const handleTogetherScroll = useCallback((event: any) => {
    handleScroll(event);
    if (fullScreenPanel === null && geminiScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const geminiScrollHeight = geminiScrollRef.current.scrollHeight - geminiScrollRef.current.clientHeight;
      geminiScrollRef.current.scrollTop = scrollPercentage * geminiScrollHeight;
    }
  }, [handleScroll, fullScreenPanel]);

  const handleSend = async () => {
    if (inputMessage.trim() === '') return;
    
    const message = inputMessage;
    setInputMessage('');
    
    // Send message once - the backend will return responses from both AIs
    await onSendMessage(message);
    
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsNearBottom(true);
  };

  const toggleFullScreen = (panel: 'gemini' | 'together') => {
    setFullScreenPanel(fullScreenPanel === panel ? null : panel);
  };

    const renderMessage = useCallback((message: Message, index?: number) => {
    const parts = parseMessageWithCodeBlocks(message.text);
    const isUser = message.sender === 'user';
    
    return (
             <div key={`${message.id}-${index || 0}-${message.timestamp.getTime()}`} 
            className={`flex gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                 {!isUser && (
           <div className="flex-shrink-0 mt-1">
             <Avatar className={`h-6 w-6 ${message.sender === 'gemini' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
               <AvatarFallback className={`text-white text-xs font-semibold ${message.sender === 'gemini' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                 {message.sender === 'gemini' ? 'G' : 'T'}
               </AvatarFallback>
             </Avatar>
           </div>
         )}
        
                 <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
           <div className={`rounded-2xl px-3 py-2 shadow-sm ${
             isUser 
               ? 'bg-gradient-to-r from-[#2E5BFF] to-[#1E40AF] text-white ml-auto' 
               : message.sender === 'gemini'
                 ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-white border border-blue-500/20 backdrop-blur-sm'
                 : 'bg-gradient-to-r from-green-500/10 to-green-600/10 text-white border border-green-500/20 backdrop-blur-sm'
           }`}>
                         {!isUser && (
               <div className="flex items-center gap-2 mb-1">
                 <span className="font-semibold text-xs text-gray-200">
                   {message.sender === 'gemini' ? 'Gemini AI' : 'Together AI'}
                 </span>
                 {message.responseTime && (
                   <Badge variant="secondary" className="text-xs py-0 px-1.5 bg-white/15 text-gray-200 border border-white/20">
                     {message.responseTime}ms
                   </Badge>
                 )}
               </div>
             )}
            
                         <div className="message-content">
               {parts.map((part, partIndex) => {
                 if (part.type === 'code') {
                   return (
                     <div key={partIndex} className="my-2 relative group">
                       <pre className="bg-black/60 p-2 rounded-lg overflow-x-auto border border-white/20 max-h-32 overflow-y-auto shadow-inner">
                         <code className="text-xs font-mono text-gray-100 leading-relaxed">{part.content}</code>
                       </pre>
                     </div>
                   );
                 } else {
                   return (
                     <p key={partIndex} className={`whitespace-pre-wrap text-xs leading-relaxed ${
                       isUser ? 'text-white' : 'text-gray-100'
                     }`}>
                       {part.content}
                     </p>
                   );
                 }
               })}
             </div>
          </div>
          
                     <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
             <Clock className="h-2 w-2" />
             <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           </div>
        </div>
        
                 {isUser && (
           <div className="flex-shrink-0 mt-1">
             <Avatar className="h-6 w-6 bg-gradient-to-br from-gray-600 to-gray-700">
               <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs font-semibold">You</AvatarFallback>
             </Avatar>
           </div>
         )}
      </div>
    );
  }, []);

     const renderChatPanel = (model: 'gemini' | 'together', messages: Message[], scrollRef: React.RefObject<HTMLDivElement | null>) => {
    const isFullScreen = fullScreenPanel === model;
    const isHidden = fullScreenPanel !== null && fullScreenPanel !== model;
    
    if (isHidden) return null;

         return (
       <motion.div
         key={model}
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         transition={{ duration: 0.2 }}
         className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-gray-900' : 'flex-1'}`}
       >
                 {/* Panel Header */}
         <div className={`p-3 border-b backdrop-blur-sm ${model === 'gemini' ? 'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-600/10' : 'border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/10'}`}>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${model === 'gemini' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                 <Bot className="h-4 w-4 text-white" />
               </div>
               <div>
                 <h3 className={`font-semibold text-sm ${model === 'gemini' ? 'text-blue-300' : 'text-green-300'}`}>
                   {model === 'gemini' ? 'Gemini AI' : 'Together AI'}
                 </h3>
                 <p className="text-xs text-gray-400">
                   {model === 'gemini' ? 'Google\'s advanced model' : 'Open-source reasoning'}
                 </p>
               </div>
             </div>
             <Button
               variant="ghost"
               size="sm"
               onClick={() => toggleFullScreen(model)}
               className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 p-1"
             >
               {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
             </Button>
           </div>
         </div>

                 {/* Messages Area */}
         <Card className="h-[500px] overflow-hidden bg-gradient-to-b from-white/5 to-white/3 border-white/10 relative shadow-inner">
           <ScrollArea 
             ref={scrollRef}
             className="h-full p-4 custom-scrollbar overflow-y-auto"
             onScrollCapture={model === 'gemini' ? handleGeminiScroll : handleTogetherScroll}
           >
                         {messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                 <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${model === 'gemini' ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20' : 'bg-gradient-to-br from-green-500/20 to-green-600/20'}`}>
                   <Bot className={`h-10 w-10 ${model === 'gemini' ? 'text-blue-300' : 'text-green-300'}`} />
                 </div>
                 <h3 className="text-xl font-semibold text-white mb-2">
                   {model === 'gemini' ? 'Gemini AI' : 'Together AI'} Ready
                 </h3>
                 <p className="text-gray-400 max-w-md leading-relaxed">
                   Start chatting to see responses from {model === 'gemini' ? 'Gemini' : 'Together AI'}.
                 </p>
               </div>
             ) : (
               <>
                 {messages.map((message, index) => renderMessage(message, index))}
                 <div ref={messagesEndRef} className="pb-4" />
               </>
             )}
             
             {isLoading && (
               <div className="flex items-center gap-3 text-gray-400 animate-pulse mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${model === 'gemini' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                   <Bot className={`h-4 w-4 ${model === 'gemini' ? 'text-blue-300' : 'text-green-300'}`} />
                 </div>
                 <span className="text-sm font-medium">{model === 'gemini' ? 'Gemini' : 'Together AI'} is thinking...</span>
               </div>
             )}
          </ScrollArea>
        </Card>
      </motion.div>
    );
  };

     return (
     <div className="flex flex-col overflow-hidden">
             {/* Topic Header */}
       {topic && (
         <div className="flex-shrink-0 p-3 bg-gradient-to-r from-[#2E5BFF]/20 to-[#1E40AF]/20 rounded-xl mb-1 border border-[#2E5BFF]/30 backdrop-blur-sm">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="font-semibold text-base text-white mb-1">{topic.title}</h3>
               {topic.description && (
                 <p className="text-xs text-gray-300 leading-relaxed">{topic.description}</p>
               )}
             </div>
             <div className="flex items-center gap-2">
               {sessionId && (
                 <Badge variant="outline" className="bg-white/10 border-white/30 text-white font-medium px-2 py-0.5 text-xs">
                   Session #{sessionId}
                 </Badge>
               )}
               <div className="flex items-center gap-1 text-xs text-gray-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                 <Target className="h-3 w-3 text-[#2E5BFF]" />
                 <span className="font-medium">Engagement: {engagementScore}</span>
               </div>
               {onEngagementThreshold && engagementScore >= 10 && (
                 <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                   <Zap className="h-3 w-3" />
                   <span className="font-medium">Threshold reached!</span>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
      
             {/* Split Screen Layout */}
       <div className="flex gap-4 overflow-hidden mb-1">
         <div key="gemini-panel" className="flex-1 flex flex-col overflow-hidden">
           {renderChatPanel('gemini', geminiMessages, geminiScrollRef)}
         </div>
         <div key="together-panel" className="flex-1 flex flex-col overflow-hidden">
           {renderChatPanel('together', togetherMessages, togetherScrollRef)}
         </div>
       </div>
      
             {/* Input Area */}
       <div className="flex-shrink-0 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 p-3 mt-1 backdrop-blur-sm shadow-lg">
         <div className="relative flex items-end gap-3">
           <Textarea
             ref={inputRef}
             value={inputMessage}
             onChange={(e) => setInputMessage(e.target.value)}
             onKeyDown={handleKeyPress}
             placeholder={topic ? `Ask about ${topic.title}...` : 'Type a message...'}
             className="flex-1 min-h-[36px] max-h-[100px] bg-transparent border-0 text-white placeholder:text-gray-400 focus:ring-0 focus:outline-none resize-none text-sm leading-relaxed"
             disabled={isLoading}
           />
           <Button
             className="bg-gradient-to-r from-[#2E5BFF] to-[#1E40AF] hover:from-[#2343C3] hover:to-[#1E3A8A] rounded-xl w-9 h-9 p-0 flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-200 hover:scale-105"
             size="sm"
             disabled={inputMessage.trim() === '' || isLoading}
             onClick={handleSend}
           >
             <Send className="h-3 w-3" />
           </Button>
         </div>
         <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
           <span className="flex items-center gap-1">
             <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
             Press Enter to send, Shift+Enter for new line
           </span>
           <span className="text-[#2E5BFF] font-medium">Messages sent to both AIs simultaneously</span>
         </div>
       </div>
      
             {/* Scroll to bottom button */}
       {showScrollToBottom && (
         <Button
           className="absolute bottom-20 right-6 bg-gradient-to-r from-[#2E5BFF] to-[#1E40AF] hover:from-[#2343C3] hover:to-[#1E3A8A] rounded-full w-12 h-12 p-0 shadow-xl transition-all duration-200 hover:scale-110"
           onClick={scrollToBottom}
         >
           <MessageSquare className="h-5 w-5" />
         </Button>
       )}
    </div>
  );
};
