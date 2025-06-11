"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertCircle, BookOpen, Brain, CheckCircle, Code, PenSquare, PlayCircle, Star, Target } from "lucide-react";
import { useState } from "react";

interface ExerciseCardProps {
  id: number;
  title: string;
  description: string;
  type: string;
  points: number;
  is_completed?: boolean;
  difficulty?: "beginner" | "intermediate" | "advanced" | number;
  onStart: (id: number) => void;
  index?: number; // For animation staggering
}

export default function ExerciseCard({
  id,
  title,
  description,
  type,
  points,
  is_completed = false,
  difficulty = "beginner",
  onStart,
  index = 0
}: ExerciseCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  
  // Convert number difficulty to string
  const getDifficultyString = (diff: "beginner" | "intermediate" | "advanced" | number): "beginner" | "intermediate" | "advanced" => {
    if (typeof diff === 'number') {
      switch (diff) {
        case 1:
        case 2:
          return "beginner";
        case 3:
          return "intermediate";
        case 4:
        case 5:
        default:
          return "advanced";
      }
    }
    return diff;
  };
  
  const difficultyString = getDifficultyString(difficulty);
  
  const difficultyColor = {
    beginner: "text-green-500",
    intermediate: "text-yellow-500",
    advanced: "text-red-500"
  };
  
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      'coding': Code,
      'multiple_choice': Target,
      'fill_in_blank': BookOpen,
      'debugging': AlertCircle,
      'code_review': Brain,
      // Legacy types for backward compatibility
      'code': Code,
      'text': PenSquare,
      'quiz': Star
    };
    return icons[type] || Code;
  };
  
  const TypeIcon = getTypeIcon(type);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10 group-hover:opacity-20 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                <TypeIcon className="h-5 w-5 text-[#2E5BFF]" />
                <h3 className="font-semibold text-white">{title}</h3>
                {is_completed && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className={`${difficultyColor[difficultyString]}`}>
                {difficultyString.charAt(0).toUpperCase() + difficultyString.slice(1)}
              </span>
              <div className="flex items-center space-x-1 text-yellow-500">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{points} points</span>
              </div>
            </div>
            
            <Button
              onClick={() => onStart(id)}
              variant={isHovering ? "default" : "outline"}
              className={
                isHovering 
                  ? "bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white transition-colors" 
                  : "border-[#2E5BFF] text-[#2E5BFF] hover:bg-[#2E5BFF] hover:text-white transition-colors"
              }
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {is_completed ? "Review" : "Start"}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
} 