"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Book, Clock, Code, Star, Users, PlayCircle, CheckCircle, BookOpen } from "lucide-react";
import Link from "next/link";

const courses = [
  {
    id: 1,
    title: "Java Programming Fundamentals",
    description: "Learn the core concepts of Java programming language",
    progress: 75,
    totalLessons: 24,
    completedLessons: 18,
    students: 1234,
    rating: 4.8,
    image: "bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20",
    icon: Code,
  },
  {
    id: 2,
    title: "Python for Beginners",
    description: "Start your programming journey with Python",
    progress: 45,
    totalLessons: 20,
    completedLessons: 9,
    students: 2156,
    rating: 4.9,
    image: "bg-gradient-to-br from-emerald-500/20 to-[#2E5BFF]/20",
    icon: Book,
  },
  {
    id: 3,
    title: "Data Structures & Algorithms",
    description: "Master the fundamentals of DSA",
    progress: 30,
    totalLessons: 30,
    completedLessons: 9,
    students: 1876,
    rating: 4.7,
    image: "bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20",
    icon: BookOpen,
  },
];

const featuredCourses = [
  {
    id: 4,
    title: "Web Development Bootcamp",
    description: "Full-stack web development with modern technologies",
    duration: "12 weeks",
    level: "Intermediate",
    image: "bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20",
    icon: Code,
  },
  {
    id: 5,
    title: "Machine Learning Basics",
    description: "Introduction to ML algorithms and applications",
    duration: "8 weeks",
    level: "Advanced",
    image: "bg-gradient-to-br from-purple-500/20 to-[#2E5BFF]/20",
    icon: Book,
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Your Courses</h1>
        <p className="text-gray-400">Continue your learning journey</p>
      </div>

      {/* Current Courses */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">In Progress</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/dashboard/courses/${course.id}`}>
                <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group">
                  <div className={`absolute inset-0 ${course.image} opacity-10 group-hover:opacity-20 transition-opacity`} />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white">{course.title}</h3>
                        <p className="text-sm text-gray-400">{course.description}</p>
                      </div>
                      <course.icon className="h-6 w-6 text-[#2E5BFF] group-hover:text-white transition-colors" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-[#2E5BFF]">{course.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-[#2E5BFF]" />
                        <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-[#2E5BFF]" />
                        <span>{course.students}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-[#2E5BFF]" />
                        <span>{course.rating}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured Courses */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Featured Courses</h2>
          <Button 
            variant="outline" 
            className="border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
          >
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featuredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all">
                <div className={`absolute inset-0 ${course.image} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-white">{course.title}</h3>
                      <p className="text-sm text-gray-400">{course.description}</p>
                    </div>
                    <course.icon className="h-6 w-6 text-[#2E5BFF] group-hover:text-white transition-colors" />
                  </div>
                  <div className="mt-4 flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-[#2E5BFF]" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4 text-[#2E5BFF]" />
                      <span>{course.level}</span>
                    </div>
                  </div>
                  <Button className="mt-4 w-full bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white transition-colors">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Learning
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 