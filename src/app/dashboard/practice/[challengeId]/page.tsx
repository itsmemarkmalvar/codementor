"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// Mock challenge data
const challengeData = {
  id: 1,
  title: "Variables Challenge",
  description: `# Variables in Java

Create variables to store personal information and print them to the console.

## Requirements:
1. Create an integer variable for age
2. Create a double variable for height
3. Create a boolean variable for student status
4. Print all variables with appropriate labels

## Tips:
- Use appropriate data types for each variable
- Follow Java naming conventions
- Remember to initialize all variables
`,
  difficulty: "Easy",
  timeLimit: 900, // 15 minutes in seconds
  points: 100,
  testCases: [
    {
      id: 1,
      description: "Variables should be properly declared",
      input: "",
      expectedOutput: "",
      isHidden: false,
    },
    {
      id: 2,
      description: "Output should contain age information",
      input: "",
      expectedOutput: "My age is:",
      isHidden: false,
    },
    {
      id: 3,
      description: "Output should contain height information",
      input: "",
      expectedOutput: "My height is:",
      isHidden: false,
    },
  ],
  hints: [
    "Remember to use 'int' for whole numbers",
    "Use 'double' for decimal numbers",
    "Boolean variables can only be true or false",
  ],
  template: `public class Variables {
    public static void main(String[] args) {
        // Create your variables here
        
        // Print your variables
        System.out.println("My age is: ");
        System.out.println("My height is: ");
        System.out.println("I am a student: ");
    }
}`,
  solution: `public class Variables {
    public static void main(String[] args) {
        int age = 20;
        double height = 5.9;
        boolean isStudent = true;
        
        System.out.println("My age is: " + age);
        System.out.println("My height is: " + height);
        System.out.println("I am a student: " + isStudent);
    }
}`,
};

export default function ChallengePage() {
  const [code, setCode] = useState(challengeData.template);
  const [theme, setTheme] = useState("vs-dark");
  const [timeLeft, setTimeLeft] = useState(challengeData.timeLimit);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("instructions");
  const [output, setOutput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; message: string }>>([]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Handle time up
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setCode(value);
    }
  };

  const handleStartChallenge = () => {
    setIsRunning(true);
  };

  const handleRunCode = () => {
    setOutput("Running code...");
    // Simulate code execution
    setTimeout(() => {
      setOutput("My age is: 20\nMy height is: 5.9\nI am a student: true");
      // Simulate test results
      setTestResults([
        { passed: true, message: "Variables declared correctly" },
        { passed: true, message: "Age output format is correct" },
        { passed: false, message: "Height output format needs correction" },
      ]);
      setActiveTab("output");
    }, 1000);
  };

  const handleShowHint = () => {
    setShowHint(true);
    if (currentHintIndex < challengeData.hints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    }
  };

  const handleSubmit = () => {
    // Implement submission logic
    console.log("Submitting solution...");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{challengeData.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className={`px-2 py-1 rounded ${
                  challengeData.difficulty === "Easy" 
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {challengeData.difficulty}
                </span>
                <span>•</span>
                <span>{challengeData.points} points</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-mono">
                {formatTime(timeLeft)}
              </div>
              {!isRunning ? (
                <Button onClick={handleStartChallenge}>Start Challenge</Button>
              ) : (
                <Button variant="destructive">End Challenge</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-12rem)]">
          {/* Left Panel */}
          <ResizablePanel defaultSize={40}>
            <Card className="h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                    <TabsTrigger value="testCases">Test Cases</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="instructions" className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: challengeData.description }} />
                    {showHint && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800">Hint {currentHintIndex + 1}:</h3>
                        <p className="text-sm text-blue-700">{challengeData.hints[currentHintIndex]}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleShowHint}
                      disabled={currentHintIndex >= challengeData.hints.length}
                    >
                      {showHint ? "Next Hint" : "Show Hint"}
                    </Button>
                  </TabsContent>
                  <TabsContent value="testCases">
                    <div className="space-y-4">
                      {challengeData.testCases.map((testCase, index) => (
                        <div
                          key={testCase.id}
                          className="p-4 rounded-lg border"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">Test Case {index + 1}</h3>
                            {testResults[index] && (
                              <div className={`text-sm ${
                                testResults[index].passed ? "text-green-600" : "text-red-600"
                              }`}>
                                {testResults[index].passed ? "Passed" : "Failed"}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {testCase.description}
                          </p>
                          {testResults[index] && (
                            <p className="text-sm text-gray-600 mt-2">
                              {testResults[index].message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel */}
          <ResizablePanel defaultSize={60}>
            <Card className="h-full">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Theme</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setTheme("vs-dark")}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Light
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleRunCode}>
                      Run Tests
                    </Button>
                    <Button onClick={handleSubmit}>Submit Solution</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100%-4rem)]">
                <div className="flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="java"
                    value={code}
                    onChange={handleEditorChange}
                    theme={theme}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      suggestOnTriggerCharacters: true,
                      formatOnPaste: true,
                      formatOnType: true,
                    }}
                  />
                </div>
                <div className="h-[200px] border-t">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="px-4 border-b">
                      <TabsTrigger value="output">Output</TabsTrigger>
                      <TabsTrigger value="console">Console</TabsTrigger>
                    </TabsList>
                    <TabsContent value="output" className="p-4">
                      <pre className="font-mono text-sm whitespace-pre-wrap">
                        {output}
                      </pre>
                    </TabsContent>
                    <TabsContent value="console" className="p-4">
                      <pre className="font-mono text-sm text-gray-500">
                        Console output will appear here...
                      </pre>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
} 