"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";

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
      // Add more lessons here
    ],
  },
  // Add more courses here
};

export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const course = courseData[courseId];
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [code, setCode] = useState(course?.lessons[currentLessonIndex]?.exercise.template || "");

  if (!course) {
    return <div>Course not found</div>;
  }

  const currentLesson = course.lessons[currentLessonIndex];

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setCode(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="space-x-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lesson Content */}
        <Card>
          <CardHeader>
            <CardTitle>{currentLesson.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none dark:prose-invert">
              <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Code Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Practice Exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-medium mb-2">Instructions:</h3>
                <p>{currentLesson.exercise.instructions}</p>
              </div>
              <div className="h-[400px] border rounded-lg overflow-hidden">
                <Editor
                  height="400px"
                  defaultLanguage="java"
                  value={code}
                  onChange={handleEditorChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              <Button className="w-full">Run Code</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 