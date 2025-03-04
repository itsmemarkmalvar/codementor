"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Award, Book, Calendar, CheckCircle, Clock, Code, Star, Target, Trophy, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Learning Hours",
    value: "48h",
    change: "+5h this week",
    icon: Clock,
    color: "from-[#2E5BFF]/20 to-purple-500/20"
  },
  {
    title: "Completion Rate",
    value: "85%",
    change: "+2% from last month",
    icon: Target,
    color: "from-purple-500/20 to-[#2E5BFF]/20"
  },
  {
    title: "Achievements",
    value: "12",
    change: "2 new this month",
    icon: Trophy,
    color: "from-[#2E5BFF]/20 to-purple-500/20"
  },
  {
    title: "Current Rank",
    value: "Gold",
    change: "Top 15%",
    icon: Award,
    color: "from-purple-500/20 to-[#2E5BFF]/20"
  }
];

const achievements = [
  {
    title: "Quick Learner",
    description: "Complete 5 lessons in one day",
    progress: 80,
    icon: TrendingUp,
    color: "bg-[#2E5BFF]/20",
  },
  {
    title: "Code Master",
    description: "Solve 50 practice problems",
    progress: 65,
    icon: Code,
    color: "bg-[#2E5BFF]/20",
  },
  {
    title: "Consistent Coder",
    description: "Maintain a 7-day streak",
    progress: 100,
    icon: Calendar,
    color: "bg-[#2E5BFF]/20",
  }
];

const recentProgress = [
  {
    title: "Java Fundamentals",
    type: "Course",
    milestone: "Completed Module 5: Exception Handling",
    time: "2 days ago",
    icon: Book,
    color: "bg-[#2E5BFF]/20"
  },
  {
    title: "Algorithm Challenge",
    type: "Practice",
    milestone: "Solved: Graph Traversal Problem",
    time: "3 days ago",
    icon: Code,
    color: "bg-[#2E5BFF]/20"
  },
  {
    title: "Gold Badge Earned",
    type: "Achievement",
    milestone: "Completed 30 Challenges",
    time: "1 week ago",
    icon: Star,
    color: "bg-[#2E5BFF]/20"
  }
];

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Learning Progress</h1>
        <p className="text-gray-400">Track your achievements and growth</p>
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
            <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <stat.icon className="h-5 w-5 text-[#2E5BFF]" />
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

      {/* Achievements */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Achievements</h2>
          <Button 
            variant="outline" 
            className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
          >
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${achievement.color}`}>
                      <achievement.icon className="h-5 w-5 text-[#2E5BFF]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-white">{achievement.title}</h3>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-[#2E5BFF]">{achievement.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500"
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Progress */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Progress</h2>
        <div className="space-y-4">
          {recentProgress.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <item.icon className="h-5 w-5 text-[#2E5BFF]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <span className="text-xs text-gray-400">{item.time}</span>
                      </div>
                      <p className="text-xs text-gray-400">{item.type}</p>
                      <p className="text-sm text-gray-300">{item.milestone}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 