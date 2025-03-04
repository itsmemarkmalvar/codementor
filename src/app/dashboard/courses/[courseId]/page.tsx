"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
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

interface CourseLesson {
  id: number;
  title: string;
  content: string;
  exercise: {
    instructions: string;
    template: string;
  };
}

interface Course {
  title: string;
  lessons: CourseLesson[];
}

// Mock course data
const courseData: Record<string, Course> = {
  "1": {
    title: "Introduction to Java",
    lessons: [
      {
        id: 1,
        title: "Variables and Data Types",
        content: `# Variables and Data Types in Java

In Java, variables are containers for storing data values. Java has several types of variables:

## Primitive Data Types
- int: Stores whole numbers
- double: Stores decimal numbers
- boolean: Stores true/false values
- char: Stores single characters

## Example:
\`\`\`java
int age = 25;
double height = 5.9;
boolean isStudent = true;
char grade = 'A';
\`\`\``,
        exercise: {
          instructions: "Create variables to store your age, height, and student status.",
          template: `
public class Variables {
    public static void main(String[] args) {
        // Create your variables here
        
        // Print your variables
        System.out.println("My age is: ");
        System.out.println("My height is: ");
        System.out.println("I am a student: ");
    }
}`,
        },
      },
    ],
  },
};

export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const course = courseData[courseId];
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState(course?.lessons[currentLessonIndex]?.exercise.template || "");
  const [theme, setTheme] = useState("vs-dark");
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState("output");

  if (!course) {
    return <div>Course not found</div>;
  }

  const currentLesson = course.lessons[currentLessonIndex];

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setCode(value);
    }
  };

  const handleRunCode = () => {
    // Simulate code execution
    setOutput("Program output will appear here...\nExecuting code...");
    setTimeout(() => {
      setOutput("My age is: 25\nMy height is: 5.9\nI am a student: true");
    }, 1000);
  };

  const handleSaveCode = () => {
    // Implement code saving functionality
    console.log("Saving code...");
  };

  const handleShareCode = () => {
    // Implement code sharing functionality
    console.log("Sharing code...");
  };

  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "JavaCode.java";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-lg text-gray-600">{currentLesson.title}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            disabled={currentLessonIndex === 0}
            onClick={() => setCurrentLessonIndex(currentLessonIndex - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentLessonIndex === course.lessons.length - 1}
            onClick={() => setCurrentLessonIndex(currentLessonIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-8rem)]">
        {/* Theory Panel */}
        <ResizablePanel defaultSize={40}>
          <div className="h-full overflow-y-auto p-4 bg-white">
            <div className="prose max-w-none dark:prose-invert">
              <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Code Editor Panel */}
        <ResizablePanel defaultSize={60}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-2 bg-gray-100">
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Theme</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setTheme("vs-dark")}>Dark</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleSaveCode}>Save</Button>
                <Button variant="outline" size="sm" onClick={handleShareCode}>Share</Button>
                <Button variant="outline" size="sm" onClick={handleDownloadCode}>Download</Button>
              </div>
              <Button onClick={handleRunCode}>Run Code</Button>
            </div>

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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="px-2 border-b">
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="console">Console</TabsTrigger>
                  <TabsTrigger value="problems">Problems</TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="p-4 h-[calc(100%-40px)] overflow-auto">
                  <pre className="font-mono text-sm">{output}</pre>
                </TabsContent>
                <TabsContent value="console" className="p-4 h-[calc(100%-40px)] overflow-auto">
                  <pre className="font-mono text-sm">Console output will appear here...</pre>
                </TabsContent>
                <TabsContent value="problems" className="p-4 h-[calc(100%-40px)] overflow-auto">
                  <div className="text-sm">No problems detected</div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 