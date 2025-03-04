"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  // Mock data for demonstration
  const recentProgress = [
    { id: 1, topic: "Variables and Data Types", progress: 80 },
    { id: 2, topic: "Control Flow Statements", progress: 60 },
    { id: 3, topic: "Arrays", progress: 30 },
  ];

  const recentActivities = [
    { id: 1, action: "Completed lesson", topic: "Introduction to Variables", time: "2 hours ago" },
    { id: 2, action: "Started lesson", topic: "Control Flow Basics", time: "3 hours ago" },
    { id: 3, action: "Completed exercise", topic: "Data Types Practice", time: "1 day ago" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <Button asChild>
          <Link href="/dashboard/courses">Continue Learning</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProgress.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.topic}</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="h-2 w-2 mt-2 rounded-full bg-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.topic}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-24">
              <Link href="/dashboard/courses">
                <div className="text-center">
                  <div className="text-lg font-medium">Start New Lesson</div>
                  <div className="text-sm text-gray-500">Continue your learning journey</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24">
              <Link href="/dashboard/practice">
                <div className="text-center">
                  <div className="text-lg font-medium">Practice Exercises</div>
                  <div className="text-sm text-gray-500">Test your knowledge</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24">
              <Link href="/dashboard/progress">
                <div className="text-center">
                  <div className="text-lg font-medium">View Progress</div>
                  <div className="text-sm text-gray-500">Track your achievements</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 