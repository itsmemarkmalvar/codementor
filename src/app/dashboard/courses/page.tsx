"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CoursesPage() {
  const courses = [
    {
      id: 1,
      title: "Introduction to Java",
      description: "Learn the basics of Java programming language",
      topics: ["Variables & Data Types", "Basic Syntax", "Input/Output"],
      progress: 0,
    },
    {
      id: 2,
      title: "Control Flow in Java",
      description: "Master control flow statements and loops",
      topics: ["If Statements", "Switch Cases", "Loops"],
      progress: 0,
    },
    {
      id: 3,
      title: "Working with Arrays",
      description: "Understanding arrays and array operations",
      topics: ["Array Basics", "Array Methods", "Array Algorithms"],
      progress: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Java Courses</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                <h3 className="font-medium">Topics covered:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {course.topics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button asChild className="w-full">
                <Link href={`/dashboard/courses/${course.id}`}>
                  Start Learning
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 