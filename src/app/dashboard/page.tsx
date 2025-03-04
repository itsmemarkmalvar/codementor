"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Book, Code, GraduationCap, LineChart, Star, Trophy, Users } from "lucide-react";

const stats = [
  {
    title: "Courses Enrolled",
    value: "12",
    change: "+2 this week",
    icon: Book,
    color: "from-blue-500/20 to-purple-500/20"
  },
  {
    title: "Practice Problems",
    value: "156",
    change: "+23 solved",
    icon: Code,
    color: "from-emerald-500/20 to-teal-500/20"
  },
  {
    title: "Current Streak",
    value: "7 days",
    change: "Best: 15 days",
    icon: Trophy,
    color: "from-orange-500/20 to-yellow-500/20"
  },
  {
    title: "Total Points",
    value: "2,450",
    change: "+350 this month",
    icon: Star,
    color: "from-pink-500/20 to-rose-500/20"
  }
];

const activities = [
  {
    title: "Java Fundamentals",
    type: "Course Progress",
    description: "Completed Module 3: Object-Oriented Programming",
    time: "2 hours ago",
    icon: Book,
    color: "bg-blue-500/20"
  },
  {
    title: "Daily Challenge",
    type: "Practice",
    description: "Solved: Binary Tree Level Order Traversal",
    time: "5 hours ago",
    icon: Code,
    color: "bg-emerald-500/20"
  },
  {
    title: "Achievement Unlocked",
    type: "Milestone",
    description: "Problem Solver: Completed 150 challenges",
    time: "1 day ago",
    icon: Trophy,
    color: "bg-orange-500/20"
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Welcome back, User!</h1>
        <p className="text-gray-400">Track your progress and continue learning</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <stat.icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                  <p className="mt-1 text-sm text-gray-400">{stat.change}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${activity.color}`}>
                      <activity.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                      <p className="text-xs text-gray-400">{activity.type}</p>
                      <p className="text-sm text-gray-300">{activity.description}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Learning Progress</h3>
              <GraduationCap className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Java Fundamentals</span>
                  <span className="text-white">75%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Python Basics</span>
                  <span className="text-white">45%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Community Stats */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Community Stats</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">256</p>
                <p className="text-sm text-gray-400">Solutions Shared</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">124</p>
                <p className="text-sm text-gray-400">Helpful Votes</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">15</p>
                <p className="text-sm text-gray-400">Forum Posts</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">8</p>
                <p className="text-sm text-gray-400">Code Reviews</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 