"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Code, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";

interface ModuleCardProps {
  id: number;
  plan_id: number;
  title: string;
  description: string;
  order_index: number;
  is_completed?: boolean;
  is_locked?: boolean;
  estimated_minutes?: number;
  exercise_count?: number;
  index?: number; // For animation staggering
}

export default function ModuleCard({
  id,
  plan_id,
  title,
  description,
  order_index,
  is_completed = false,
  is_locked = false,
  estimated_minutes = 15,
  exercise_count = 0,
  index = 0
}: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={is_locked ? '#' : `/dashboard/lesson-plans/${plan_id}/${id}`}>
        <Card 
          className={`relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm transition-all group ${
            is_locked 
              ? 'opacity-70 cursor-not-allowed' 
              : 'hover:bg-white/10 cursor-pointer'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#2E5BFF]/20 text-xs text-[#2E5BFF] font-medium">
                    {order_index + 1}
                  </span>
                  <h3 className="font-semibold text-white">{title}</h3>
                </div>
                <p className="text-sm text-gray-400">{description}</p>
              </div>

              {is_locked ? (
                <Lock className="h-6 w-6 text-gray-500" />
              ) : is_completed ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <PlayCircle className="h-6 w-6 text-[#2E5BFF] group-hover:text-white transition-colors" />
              )}
            </div>
            
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-[#2E5BFF]" />
                <span>{estimated_minutes} mins</span>
              </div>
              {exercise_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Code className="h-4 w-4 text-[#2E5BFF]" />
                  <span>{exercise_count} exercises</span>
                </div>
              )}
              {is_completed && (
                <div className="flex items-center space-x-1 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
} 