"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PlayCircle, Book, Clock, CheckCircle, ArrowLeft, ArrowRight, Timer, Star, Users, Brain, LightbulbIcon, Code } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import Link from "next/link";

// Mock challenge data
const challengeData = {
  id: 1,
  title: "Variables in Java",
  description: "Create variables to store personal information and print them to the console",
  difficulty: "Easy",
  points: 100,
  timeLimit: "30 minutes",
  requirements: [
    "Create an integer variable for age",
    "Create a double variable for height",
    "Create a boolean variable for student status",
    "Print all variables with appropriate labels"
  ],
  tips: [
    "Use appropriate data types for each variable",
    "Follow Java naming conventions",
    "Remember to initialize all variables"
  ],
  testCases: [
    {
      input: "Default test case",
      expectedOutput: [
        "My age is: 25",
        "My height is: 5.9",
        "I am a student: true"
      ]
    }
  ],
  hints: [
    "Remember that integer values don't need decimal points",
    "Double values can store decimal numbers",
    "Boolean values can only be true or false"
  ],
  starterCode: `public class Variables {
    public static void main(String[] args) {
        // Create your variables here
        
        // Print your variables
        System.out.println("My age is: ");
        System.out.println("My height is: ");
        System.out.println("I am a student: ");
    }
}`
};

export default function ChallengePage() {
  const [code, setCode] = useState(challengeData.starterCode);
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState("instructions");
  const [activeRightTab, setActiveRightTab] = useState("output");
  const [theme, setTheme] = useState("vs-dark");
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const handleRunCode = () => {
    // Mock code execution
    setOutput("Running test cases...\n\nTest Case 1:\nExpected Output:\nMy age is: 25\nMy height is: 5.9\nI am a student: true\n\nYour Output:\n" + code);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400">
              {challengeData.difficulty}
            </span>
            <div className="flex items-center space-x-2 text-gray-400">
              <Timer className="h-4 w-4" />
              <span>{challengeData.timeLimit}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <Star className="h-4 w-4 text-[#2E5BFF]" />
              <span>{challengeData.points} points</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{challengeData.title}</h1>
          <p className="text-gray-400">{challengeData.description}</p>
        </div>
        <Button 
          className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
          onClick={() => setIsRunning(true)}
        >
          Start Challenge
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Instructions and Test Cases */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-[calc(100vh-12rem)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
            <div className="relative p-6 space-y-4 h-full flex flex-col">
              <div className="flex items-center space-x-2">
                <Button
                  variant={activeTab === "instructions" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("instructions")}
                  className={activeTab === "instructions" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
                >
                  Instructions
                </Button>
                <Button
                  variant={activeTab === "testCases" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("testCases")}
                  className={activeTab === "testCases" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
                >
                  Test Cases
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeTab === "instructions" ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Requirements:</h3>
                      <ul className="space-y-2">
                        {challengeData.requirements.map((req, index) => (
                          <li key={index} className="flex items-start space-x-2 text-gray-300">
                            <CheckCircle className="h-5 w-5 text-[#2E5BFF] mt-0.5" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Tips:</h3>
                      <ul className="space-y-2">
                        {challengeData.tips.map((tip, index) => (
                          <li key={index} className="flex items-start space-x-2 text-gray-300">
                            <Brain className="h-5 w-5 text-[#2E5BFF] mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {challengeData.testCases.map((testCase, index) => (
                      <div key={index} className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">Test Case {index + 1}</h3>
                        <div className="bg-black/30 rounded p-4">
                          <p className="text-gray-400 mb-2">Expected Output:</p>
                          <pre className="text-sm text-gray-300">
                            {testCase.expectedOutput.join('\n')}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showHint && (
                <div className="mt-4 p-4 bg-[#2E5BFF]/10 rounded-lg">
                  <p className="text-gray-300">
                    <LightbulbIcon className="h-5 w-5 text-[#2E5BFF] inline mr-2" />
                    {challengeData.hints[currentHint]}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
                  onClick={() => {
                    setShowHint(true);
                    setCurrentHint((prev) => (prev + 1) % challengeData.hints.length);
                  }}
                >
                  <LightbulbIcon className="h-4 w-4 mr-2" />
                  Show Hint
                </Button>
                <div className="text-xl font-mono text-[#2E5BFF]">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Right Panel - Code Editor */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-[calc(100vh-12rem)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
            <div className="relative p-6 space-y-4 h-full flex flex-col">
              {/* Editor Controls */}
              <div className="flex items-center justify-between">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="bg-white/10 border-0 rounded text-sm text-gray-300 focus:ring-[#2E5BFF]"
                >
                  <option value="vs-dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                </select>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleRunCode}
                    className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Submit Solution
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 overflow-hidden rounded border border-white/10">
                <Editor
                  height="100%"
                  defaultLanguage="java"
                  theme={theme}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Output Section */}
              <div className="h-32">
                <div className="flex items-center space-x-2 mb-2">
                  <Button
                    variant={activeRightTab === "output" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveRightTab("output")}
                    className={activeRightTab === "output" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
                  >
                    Output
                  </Button>
                  <Button
                    variant={activeRightTab === "console" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveRightTab("console")}
                    className={activeRightTab === "console" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
                  >
                    Console
                  </Button>
                </div>
                <div className="bg-black/30 rounded p-4 h-full overflow-y-auto">
                  <pre className="text-sm text-gray-300">{output}</pre>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 