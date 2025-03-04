"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PracticePage() {
  const challenges = [
    {
      id: 1,
      title: "Variables Challenge",
      description: "Practice working with different variable types in Java",
      difficulty: "Easy",
      estimatedTime: "15 mins",
    },
    {
      id: 2,
      title: "Control Flow Challenge",
      description: "Test your knowledge of if statements and loops",
      difficulty: "Medium",
      estimatedTime: "20 mins",
    },
    {
      id: 3,
      title: "Array Operations",
      description: "Solve problems using arrays and array methods",
      difficulty: "Medium",
      estimatedTime: "25 mins",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Practice Exercises</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
          <Card key={challenge.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{challenge.title}</CardTitle>
                  <CardDescription>{challenge.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Difficulty:</span>
                  <span className={
                    challenge.difficulty === "Easy" 
                      ? "text-green-600" 
                      : challenge.difficulty === "Medium"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }>
                    {challenge.difficulty}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Time:</span>
                  <span>{challenge.estimatedTime}</span>
                </div>
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button asChild className="w-full">
                <Link href={`/dashboard/practice/${challenge.id}`}>
                  Start Challenge
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 