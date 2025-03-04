"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function PracticePage() {
  // Mock data for different sections
  const challenges = [
    {
      id: 1,
      title: "Variables Challenge",
      description: "Practice working with different variable types in Java",
      difficulty: "Easy",
      timeLimit: "15 mins",
      points: 100,
      participants: 150,
      testCases: 5,
    },
    {
      id: 2,
      title: "Control Flow Challenge",
      description: "Test your knowledge of if statements and loops",
      difficulty: "Medium",
      timeLimit: "20 mins",
      points: 200,
      participants: 120,
      testCases: 8,
    },
    {
      id: 3,
      title: "Array Operations",
      description: "Solve problems using arrays and array methods",
      difficulty: "Medium",
      timeLimit: "25 mins",
      points: 250,
      participants: 90,
      testCases: 10,
    },
  ];

  const leaderboard = [
    { rank: 1, name: "John Doe", points: 2500, badges: 15, solved: 45 },
    { rank: 2, name: "Alice Smith", points: 2350, badges: 12, solved: 42 },
    { rank: 3, name: "Bob Johnson", points: 2200, badges: 11, solved: 40 },
    { rank: 4, name: "Emma Davis", points: 2100, badges: 10, solved: 38 },
    { rank: 5, name: "Mike Wilson", points: 2000, badges: 9, solved: 35 },
  ];

  const achievements = [
    {
      id: 1,
      title: "Speed Demon",
      description: "Complete 5 challenges under time limit",
      progress: 80,
      icon: "⚡",
    },
    {
      id: 2,
      title: "Problem Solver",
      description: "Solve 10 medium difficulty problems",
      progress: 60,
      icon: "🧩",
    },
    {
      id: 3,
      title: "Community Helper",
      description: "Review 5 peer solutions",
      progress: 40,
      icon: "👥",
    },
  ];

  const categories = [
    { name: "Basics", count: 15 },
    { name: "Control Flow", count: 12 },
    { name: "Arrays", count: 10 },
    { name: "OOP", count: 8 },
    { name: "Data Structures", count: 6 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">250</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">15</div>
            <div className="text-sm text-gray-500">Challenges Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">5</div>
            <div className="text-sm text-gray-500">Current Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">8</div>
            <div className="text-sm text-gray-500">Badges Earned</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Coding Challenges</h2>
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button key={category.name} variant="outline" size="sm">
                  {category.name} ({category.count})
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      challenge.difficulty === "Easy" 
                        ? "bg-green-100 text-green-700"
                        : challenge.difficulty === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {challenge.difficulty}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Time Limit:</span>
                      <span>{challenge.timeLimit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Points:</span>
                      <span>{challenge.points}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Test Cases:</span>
                      <span>{challenge.testCases}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Participants:</span>
                      <span>{challenge.participants}</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/practice/${challenge.id}`}>
                      Start Challenge
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>Top performers this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`text-lg font-bold ${
                        user.rank === 1 ? "text-yellow-500" :
                        user.rank === 2 ? "text-gray-500" :
                        user.rank === 3 ? "text-orange-500" : ""
                      }`}>
                        #{user.rank}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.points} points</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="font-medium">{user.badges}</span> badges
                      </div>
                      <div>
                        <span className="font-medium">{user.solved}</span> solved
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.id}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">{achievement.icon}</div>
                    <CardTitle>{achievement.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{achievement.description}</CardDescription>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{achievement.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Discussions</CardTitle>
                <CardDescription>Join the conversation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium">Array Challenge Solution Discussion</div>
                      <div className="text-sm text-gray-500 mt-1">
                        15 comments • Last reply 2h ago
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peer Reviews</CardTitle>
                <CardDescription>Help others improve their code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium">Review Needed: Variables Exercise</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Submitted 1h ago • No reviews yet
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 