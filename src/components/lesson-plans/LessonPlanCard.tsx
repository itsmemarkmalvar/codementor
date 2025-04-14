"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Book, CheckCircle, Clock, GraduationCap } from "lucide-react";

interface LessonPlanCardProps {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  topic_name?: string;
  modules_count: number;
  completed_modules?: number;
  index?: number; // For animation staggering
}

export default function LessonPlanCard({
  id,
  title,
  description,
  topic_id,
  topic_name,
  modules_count,
  completed_modules = 0,
  index = 0
}: LessonPlanCardProps) {
  const progress = modules_count > 0 ? Math.round((completed_modules / modules_count) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10 group-hover:opacity-20 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
            <Book className="h-6 w-6 text-[#2E5BFF] group-hover:text-white transition-colors" />
          </div>
          
          {topic_name && (
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2E5BFF]/20 text-[#2E5BFF]">
                <GraduationCap className="h-3 w-3 mr-1" />
                {topic_name}
              </span>
            </div>
          )}
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-[#2E5BFF]">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2E5BFF] to-purple-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-[#2E5BFF]" />
              <span>{completed_modules}/{modules_count} modules</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-[#2E5BFF]" />
              <span>{modules_count * 15} mins</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
} 