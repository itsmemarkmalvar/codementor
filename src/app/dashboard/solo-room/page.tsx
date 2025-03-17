"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  User, 
  Bot, 
  Code, 
  BookOpen, 
  Clock, 
  Settings as SettingsIcon, 
  ChevronRight, 
  BarChart, 
  CheckCircle, 
  Star,
  Zap
} from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Topic {
  id: number;
  title: string;
  progress: number;
  icon: React.ReactNode;
}

interface Session {
  id: number;
  date: string;
  topic: string;
  duration: string;
}

const SoloRoomPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'topics' | 'sessions' | 'settings'>('chat');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Sample topics data
  const topics: Topic[] = [
    { 
      id: 1, 
      title: 'Java Basics', 
      progress: 65, 
      icon: <BookOpen className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 2, 
      title: 'Object-Oriented Programming', 
      progress: 40, 
      icon: <Code className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 3, 
      title: 'Data Structures', 
      progress: 25, 
      icon: <BarChart className="h-5 w-5 text-[#2E5BFF]" /> 
    },
    { 
      id: 4, 
      title: 'Algorithms', 
      progress: 10, 
      icon: <Zap className="h-5 w-5 text-[#2E5BFF]" /> 
    },
  ];
  
  // Sample previous sessions
  const previousSessions: Session[] = [
    { id: 1, date: '2023-06-15', topic: 'Java Basics', duration: '45 min' },
    { id: 2, date: '2023-06-12', topic: 'Variables and Data Types', duration: '30 min' },
    { id: 3, date: '2023-06-10', topic: 'Control Flow', duration: '60 min' },
  ];
  
  // AI tutor preferences
  const [tutorPreferences, setTutorPreferences] = useState({
    responseLength: 'medium',
    codeExamples: true,
    explanationDetail: 'detailed',
    challengeDifficulty: 'medium',
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: Date.now(),
        text: "I'm here to help you learn Java programming. What would you like to know?",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setActiveTab('chat');
    
    // Simulate a message about the selected topic
    const botResponse: Message = {
      id: Date.now(),
      text: `Let's learn about ${topic.title}. What specific aspect would you like to explore?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([botResponse]);
  };
  
  const handleSessionSelect = (session: Session) => {
    setActiveTab('chat');
    
    // Simulate loading a previous session
    const botResponse: Message = {
      id: Date.now(),
      text: `Welcome back to our session on ${session.topic}. Would you like to continue where we left off?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([botResponse]);
  };
  
  const handlePreferenceChange = (key: string, value: any) => {
    setTutorPreferences({
      ...tutorPreferences,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center space-x-2">
        <Code className="h-6 w-6 text-[#2E5BFF]" />
        <h1 className="text-2xl font-bold">AI Tutor Solo Room</h1>
      </div>
      
      <p className="text-gray-400">
        Practice coding with your personal AI tutor. Ask questions, get feedback, and improve your Java programming skills.
      </p>
      
      {/* Progress Overview */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Your Learning Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Topics Covered</p>
              <p className="text-xl font-bold">4/12</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Exercises Completed</p>
              <p className="text-xl font-bold">24/50</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Learning Hours</p>
              <p className="text-xl font-bold">12.5</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#2E5BFF]/20 flex items-center justify-center">
              <Star className="h-5 w-5 text-[#2E5BFF]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Streak</p>
              <p className="text-xl font-bold">5 days</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Interface */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="flex flex-wrap border-b border-white/10">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Bot className="h-5 w-5" />
            <span>Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'topics' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Topics</span>
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'sessions' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Clock className="h-5 w-5" />
            <span>Sessions</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 flex items-center space-x-2 ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Preferences</span>
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-[60vh]">
          {/* Left Panel - Changes based on active tab */}
          <section className="w-full md:w-2/5 p-4 border-b md:border-b-0 md:border-r border-white/10 flex flex-col overflow-hidden">
            {activeTab === 'chat' && (
              <>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  {selectedTopic ? selectedTopic.title : 'Chat with AI Tutor'}
                </h2>
                {selectedTopic && (
                  <div className="mb-4 bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm font-medium">{selectedTopic.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-[#2E5BFF] h-2 rounded-full" 
                        style={{ width: `${selectedTopic.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="flex-1 bg-white/5 rounded-lg p-4 overflow-y-auto mb-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-[#2E5BFF]" />
                        <p>Start chatting with your AI tutor to learn Java programming</p>
                      </div>
                    )}
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start space-x-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.sender === 'bot' && (
                          <div className="w-8 h-8 rounded-full bg-[#2E5BFF] flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === 'user'
                              ? 'bg-[#2E5BFF] text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {message.sender === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 min-h-[42px]">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] border border-white/10"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-[#2E5BFF] text-white px-4 py-2 rounded-lg hover:bg-[#1E4BEF] transition flex items-center space-x-2 whitespace-nowrap flex-shrink-0 w-[100px]"
                  >
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </button>
                </div>
              </>
            )}
            
            {activeTab === 'topics' && (
              <>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  Learning Topics
                </h2>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {topics.map((topic) => (
                      <motion.div
                        key={topic.id}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTopicSelect(topic)}
                        className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            {topic.icon}
                            <span>{topic.title}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Progress</span>
                            <span className="text-xs font-medium">{topic.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div 
                              className="bg-[#2E5BFF] h-1.5 rounded-full" 
                              style={{ width: `${topic.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'sessions' && (
              <>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  Previous Sessions
                </h2>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {previousSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSessionSelect(session)}
                        className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{session.topic}</p>
                            <p className="text-sm text-gray-400">{session.date} • {session.duration}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'settings' && (
              <>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2 text-[#2E5BFF]" />
                  AI Tutor Preferences
                </h2>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Response Length</label>
                      <select 
                        value={tutorPreferences.responseLength}
                        onChange={(e) => handlePreferenceChange('responseLength', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                        style={{ color: 'white', backgroundColor: '#1a2e42' }}
                      >
                        <option value="brief" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Brief</option>
                        <option value="medium" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Medium</option>
                        <option value="detailed" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Detailed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Include Code Examples</label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreferenceChange('codeExamples', true)}
                          className={`px-3 py-1 rounded-lg ${
                            tutorPreferences.codeExamples 
                              ? 'bg-[#2E5BFF] text-white' 
                              : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handlePreferenceChange('codeExamples', false)}
                          className={`px-3 py-1 rounded-lg ${
                            !tutorPreferences.codeExamples 
                              ? 'bg-[#2E5BFF] text-white' 
                              : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Explanation Detail</label>
                      <select 
                        value={tutorPreferences.explanationDetail}
                        onChange={(e) => handlePreferenceChange('explanationDetail', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                        style={{ color: 'white', backgroundColor: '#1a2e42' }}
                      >
                        <option value="basic" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Basic</option>
                        <option value="intermediate" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Intermediate</option>
                        <option value="detailed" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Detailed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Challenge Difficulty</label>
                      <select 
                        value={tutorPreferences.challengeDifficulty}
                        onChange={(e) => handlePreferenceChange('challengeDifficulty', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5BFF] appearance-none"
                        style={{ color: 'white', backgroundColor: '#1a2e42' }}
                      >
                        <option value="easy" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Easy</option>
                        <option value="medium" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Medium</option>
                        <option value="hard" style={{ color: 'white', backgroundColor: '#1a2e42' }}>Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
          
          {/* Right Panel - Code Editor */}
          <section className="w-full md:w-3/5 p-4 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Code className="h-5 w-5 mr-2 text-[#2E5BFF]" />
              Code Editor
            </h2>
            <div className="flex-1 bg-white/5 rounded-lg p-4 overflow-hidden flex flex-col">
              <div className="flex-1 font-mono text-sm overflow-y-auto">
                <pre className="text-gray-300">
                  <code>
{`// Java code editor
public class HelloWorld {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, Java!");
    }
}`}
                  </code>
                </pre>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="bg-[#2E5BFF] text-white px-4 py-2 rounded-lg hover:bg-[#1E4BEF] transition flex items-center space-x-2">
                  <Code className="h-5 w-5" />
                  <span>Run Code</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SoloRoomPage; 