"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CourseProgress {
  name: string;
  progress: number;
}

interface PracticeStat {
  name: string;
  value: string;
}

interface Achievement {
  title: string;
  description: string;
  date: string;
  icon: string;
}

export default function ProgressPage() {
  const courseProgress: CourseProgress[] = [
    { name: "Introduction to Java", progress: 80 },
    { name: "Control Flow in Java", progress: 45 },
    { name: "Working with Arrays", progress: 20 },
  ];

  const practiceStats: PracticeStat[] = [
    { name: "Challenges Completed", value: "12" },
    { name: "Success Rate", value: "85%" },
    { name: "Time Spent", value: "8.5 hrs" },
  ];

  const achievements: Achievement[] = [
    {
      title: "First Steps",
      description: "Completed your first Java program",
      date: "Feb 28, 2024",
      icon: "🎯",
    },
    {
      title: "Quick Learner",
      description: "Completed 5 exercises in one day",
      date: "Mar 1, 2024",
      icon: "⚡",
    },
    {
      title: "Bug Hunter",
      description: "Fixed 10 code errors successfully",
      date: "Mar 2, 2024",
      icon: "🐛",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Progress</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Course Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseProgress.map((course, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{course.name}</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Practice Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Practice Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {practiceStats.map((stat, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{stat.name}</span>
                  <span className="text-lg font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg space-y-2"
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="font-medium">{achievement.title}</div>
                <div className="text-sm text-gray-600">{achievement.description}</div>
                <div className="text-xs text-gray-500">{achievement.date}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 