"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Code, Timer, Trophy, Star, Users, Zap, Brain, Target, Flame } from "lucide-react";
import Link from "next/link";

const challenges = [
  {
    id: 1,
    title: "Binary Search Implementation",
    difficulty: "Medium",
    timeLimit: "45 minutes",
    points: 100,
    participants: 1234,
    completionRate: "68%",
    category: "Algorithms",
    image: "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
  },
  {
    id: 2,
    title: "Linked List Reversal",
    difficulty: "Easy",
    timeLimit: "30 minutes",
    points: 75,
    participants: 2156,
    completionRate: "82%",
    category: "Data Structures",
    image: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20",
  },
  {
    id: 3,
    title: "Dynamic Programming Challenge",
    difficulty: "Hard",
    timeLimit: "60 minutes",
    points: 150,
    participants: 876,
    completionRate: "45%",
    category: "Advanced",
    image: "bg-gradient-to-br from-orange-500/20 to-yellow-500/20",
  },
];

const categories = [
  {
    name: "Algorithms",
    count: 45,
    icon: Brain,
    color: "from-blue-500/20 to-purple-500/20",
  },
  {
    name: "Data Structures",
    count: 38,
    icon: Code,
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    name: "Problem Solving",
    count: 62,
    icon: Target,
    color: "from-orange-500/20 to-yellow-500/20",
  },
  {
    name: "Daily Challenges",
    count: 15,
    icon: Flame,
    color: "from-pink-500/20 to-rose-500/20",
  },
];

export default function PracticePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Practice Arena</h1>
        <p className="text-gray-400">Challenge yourself with coding problems</p>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group">
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{category.name}</h3>
                  <category.icon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{category.count}</p>
                <p className="text-sm text-gray-400">Available Problems</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Featured Challenges */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Featured Challenges</h2>
          <Button 
            variant="outline" 
            className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
          >
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              <Link href={`/dashboard/practice/${challenge.id}`}>
                <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all h-full">
                  <div className={`absolute inset-0 ${challenge.image} opacity-10`} />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            challenge.difficulty === "Easy" ? "bg-emerald-500/20 text-emerald-400" :
                            challenge.difficulty === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>
                            {challenge.difficulty}
                          </span>
                          <span className="text-xs text-gray-400">{challenge.category}</span>
                        </div>
                        <h3 className="font-semibold text-white">{challenge.title}</h3>
                      </div>
                      <Zap className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4" />
                          <span>{challenge.timeLimit}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-4 w-4" />
                          <span>{challenge.points} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{challenge.participants}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4" />
                          <span>{challenge.completionRate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 