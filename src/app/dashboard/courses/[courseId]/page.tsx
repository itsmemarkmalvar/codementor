"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PlayCircle, Book, Clock, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import Link from "next/link";

// Mock lesson data
const lessonData = {
  id: 1,
  title: "Variables and Data Types",
  description: "Learn about different variable types and how to use them in Java",
  duration: "20 minutes",
  content: `In Java, variables are containers for storing data values. Java has several types of variables:
  
  1. Primitive Data Types:
     - int: For integers
     - double: For decimal numbers
     - boolean: For true/false values
     - char: For single characters
  
  2. Reference Data Types:
     - String: For text
     - Arrays: For collections of values
     - Objects: For complex data structures`,
  starterCode: `public class Variables {
    public static void main(String[] args) {
        // Create your variables here
        
        // Print your variables
        System.out.println("My age is: ");
        System.out.println("My height is: ");
        System.out.println("I am a student: ");
    }
}`,
  nextLesson: "Control Flow",
  previousLesson: "Introduction to Java"
};

export default function LessonPage() {
  const [code, setCode] = useState(lessonData.starterCode);
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState("output");
  const [theme, setTheme] = useState("vs-dark");

  const handleRunCode = () => {
    // Mock code execution
    setOutput("Program output will appear here...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">{lessonData.title}</h1>
          <p className="text-gray-400">{lessonData.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{lessonData.duration}</span>
          </div>
          <Button 
            variant="outline"
            className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
          >
            <Book className="h-4 w-4 mr-2" />
            Course Overview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Lesson Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm h-[calc(100vh-12rem)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10" />
            <div className="relative p-6 space-y-6 overflow-y-auto h-full">
              <div className="prose prose-invert max-w-none">
                <div className="text-gray-300 whitespace-pre-line">
                  {lessonData.content}
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
                <Button
                  onClick={handleRunCode}
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Code
                </Button>
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
                    variant={activeTab === "output" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("output")}
                    className={activeTab === "output" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
                  >
                    Output
                  </Button>
                  <Button
                    variant={activeTab === "console" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("console")}
                    className={activeTab === "console" ? "bg-[#2E5BFF] text-white" : "text-gray-400"}
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

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {lessonData.previousLesson}
        </Button>
        <Button
          className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white"
        >
          {lessonData.nextLesson}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 