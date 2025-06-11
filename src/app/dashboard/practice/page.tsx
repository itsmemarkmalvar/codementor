"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Code, Timer, Trophy, Star, Brain, Target, BookOpen, AlertCircle, Check, Play, ChevronRight, Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { getTopics, getLessonPlans, getLessonModules, getLessonExercises } from "@/services/api";

interface Topic {
  id: number;
  title: string;
  description: string;
  difficulty_level: string;
}

interface Exercise {
  id: number;
  module_id: number;
  title: string;
  description: string;
  instructions: string;
  type: string;
  difficulty: number;
  points: number;
  order_index: number;
  is_required: boolean;
  module_title?: string;
  lesson_title?: string;
  topic_title?: string;
  lesson_plan_id?: number;
}

interface ModuleWithExercises {
  id: number;
  title: string;
  description: string;
  lesson_plan_id: number;
  lesson_title?: string;
  topic_id?: number;
  topic_title?: string;
  exercises: Exercise[];
  estimated_minutes: number;
}

export default function PracticePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [modules, setModules] = useState<ModuleWithExercises[]>([]);
  const [filteredModules, setFilteredModules] = useState<ModuleWithExercises[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("modules");

  // Fetch topics and exercises when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all topics
        const topicsData = await getTopics();
        setTopics(topicsData);
        
        // Get all lesson plans for all topics
        const allModulesData: ModuleWithExercises[] = [];
        const allExercisesData: Exercise[] = [];
        
        for (const topic of topicsData) {
          try {
            const lessonPlans = await getLessonPlans(topic.id);
            
            for (const plan of lessonPlans) {
              try {
                const modulesData = await getLessonModules(plan.id);
                
                for (const module of modulesData) {
                  try {
                    const exercisesData = await getLessonExercises(module.id);
                    
                                         const moduleWithExercises: ModuleWithExercises = {
                       ...module,
                       lesson_title: plan.title,
                       topic_id: topic.id,
                       topic_title: topic.title,
                       exercises: exercisesData.map((ex: any) => ({
                         ...ex,
                         module_title: module.title,
                         lesson_title: plan.title,
                         topic_title: topic.title,
                         lesson_plan_id: plan.id
                       }))
                     };
                    
                    allModulesData.push(moduleWithExercises);
                    allExercisesData.push(...moduleWithExercises.exercises);
                  } catch (error) {
                    console.error(`Error fetching exercises for module ${module.id}:`, error);
                  }
                }
              } catch (error) {
                console.error(`Error fetching modules for plan ${plan.id}:`, error);
              }
            }
          } catch (error) {
            console.error(`Error fetching lesson plans for topic ${topic.id}:`, error);
          }
        }
        
        setModules(allModulesData);
        setFilteredModules(allModulesData);
        setAllExercises(allExercisesData);
        setFilteredExercises(allExercisesData);
        
      } catch (error) {
        console.error("Error fetching practice data:", error);
        toast.error("Failed to load practice data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data when search or filters change
  useEffect(() => {
    let filteredMods = [...modules];
    let filteredExs = [...allExercises];
    
    // Apply topic filter
    if (selectedTopic) {
      filteredMods = filteredMods.filter(mod => mod.topic_id === selectedTopic);
      filteredExs = filteredExs.filter(ex => ex.topic_title === topics.find(t => t.id === selectedTopic)?.title);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredMods = filteredMods.filter(mod => 
        mod.title.toLowerCase().includes(query) || 
        mod.description.toLowerCase().includes(query) ||
        mod.lesson_title?.toLowerCase().includes(query) ||
        mod.topic_title?.toLowerCase().includes(query)
      );
      
      filteredExs = filteredExs.filter(ex => 
        ex.title.toLowerCase().includes(query) || 
        ex.description.toLowerCase().includes(query) ||
        ex.module_title?.toLowerCase().includes(query) ||
        ex.lesson_title?.toLowerCase().includes(query) ||
        ex.topic_title?.toLowerCase().includes(query)
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      const diffLevel = parseInt(difficultyFilter);
      filteredMods = filteredMods.filter(mod => 
        mod.exercises.some(ex => ex.difficulty === diffLevel)
      );
      filteredExs = filteredExs.filter(ex => ex.difficulty === diffLevel);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filteredMods = filteredMods.filter(mod => 
        mod.exercises.some(ex => ex.type === typeFilter)
      );
      filteredExs = filteredExs.filter(ex => ex.type === typeFilter);
    }
    
    setFilteredModules(filteredMods);
    setFilteredExercises(filteredExs);
  }, [searchQuery, difficultyFilter, typeFilter, selectedTopic, modules, allExercises, topics]);

  // Get difficulty color based on level
  const getDifficultyColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-emerald-500/20 text-emerald-400',
      2: 'bg-green-500/20 text-green-400',
      3: 'bg-yellow-500/20 text-yellow-400',
      4: 'bg-orange-500/20 text-orange-400',
      5: 'bg-red-500/20 text-red-400'
    };
    
    return colors[level] || 'bg-gray-500/20 text-gray-400';
  };

  const getDifficultyText = (level: number) => {
    const texts: Record<number, string> = {
      1: 'Beginner',
      2: 'Easy', 
      3: 'Medium',
      4: 'Hard',
      5: 'Expert'
    };
    return texts[level] || 'Unknown';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      'coding': Code,
      'multiple_choice': Target,
      'fill_in_blank': BookOpen,
      'debugging': AlertCircle,
      'code_review': Brain
    };
    return icons[type] || Code;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'coding': 'bg-blue-500/20 text-blue-400',
      'multiple_choice': 'bg-purple-500/20 text-purple-400',
      'fill_in_blank': 'bg-indigo-500/20 text-indigo-400',
      'debugging': 'bg-orange-500/20 text-orange-400',
      'code_review': 'bg-pink-500/20 text-pink-400'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="h-6 w-6 text-[#2E5BFF]" />
          Practice Arena
        </h1>
        <p className="text-gray-400">Master programming concepts with hands-on exercises from your lessons</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search exercises and modules..."
            className="pl-10 bg-white/5 border-white/10 focus:border-[#2E5BFF] text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          
          <Select value={selectedTopic?.toString() || "all"} onValueChange={(value) => setSelectedTopic(value === "all" ? null : parseInt(value))}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  {topic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="1">Beginner</SelectItem>
              <SelectItem value="2">Easy</SelectItem>
              <SelectItem value="3">Medium</SelectItem>
              <SelectItem value="4">Hard</SelectItem>
              <SelectItem value="5">Expert</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="coding">Coding</SelectItem>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="fill_in_blank">Fill in Blank</SelectItem>
              <SelectItem value="debugging">Debugging</SelectItem>
              <SelectItem value="code_review">Code Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="modules">By Modules ({filteredModules.length})</TabsTrigger>
          <TabsTrigger value="exercises">All Exercises ({filteredExercises.length})</TabsTrigger>
        </TabsList>
        
        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          {loading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[200px]"></Card>
              ))}
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No modules found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredModules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[#2E5BFF] border-[#2E5BFF]/30">
                              {module.topic_title}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-white">{module.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-2">{module.description}</p>
                          <p className="text-xs text-gray-500">from {module.lesson_title}</p>
                        </div>
                        <BookOpen className="h-6 w-6 text-[#2E5BFF] group-hover:text-white transition-colors" />
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-1">
                            <Code className="h-4 w-4 text-[#2E5BFF]" />
                            <span className="text-gray-400">{module.exercises.length} exercises</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4 text-[#2E5BFF]" />
                            <span className="text-gray-400">{module.estimated_minutes}m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-gray-400">{module.exercises.reduce((sum, ex) => sum + ex.points, 0)} pts</span>
                        </div>
                      </div>
                      
                      {/* Exercise Types */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[...new Set(module.exercises.map(ex => ex.type))].map(type => {
                          const TypeIcon = getTypeIcon(type);
                          return (
                            <Badge key={type} className={`${getTypeColor(type)} border-0`}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {type.replace('_', ' ')}
                            </Badge>
                          );
                        })}
                      </div>
                      
                      {/* Action Button */}
                      <Link href={`/dashboard/lesson-plans/${module.lesson_plan_id}/${module.id}`}>
                        <Button className="w-full bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
                          <Play className="h-4 w-4 mr-2" />
                          Start Practice
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Exercises Tab */}
        <TabsContent value="exercises" className="space-y-6">
          {loading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[120px]"></Card>
              ))}
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12">
              <Code className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No exercises found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExercises.map((exercise, index) => {
                const TypeIcon = getTypeIcon(exercise.type);
                return (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="relative overflow-hidden border-[#2E5BFF]/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2E5BFF]/20 to-purple-500/20 opacity-10 group-hover:opacity-20 transition-opacity" />
                      <div className="relative p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-[#2E5BFF] border-[#2E5BFF]/30">
                                {exercise.topic_title}
                              </Badge>
                              <Badge className={`${getTypeColor(exercise.type)} border-0`}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {exercise.type.replace('_', ' ')}
                              </Badge>
                              <Badge className={`${getDifficultyColor(exercise.difficulty)} border-0`}>
                                {getDifficultyText(exercise.difficulty)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-white">{exercise.title}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2">{exercise.description}</p>
                            <p className="text-xs text-gray-500">
                              {exercise.module_title} • {exercise.lesson_title}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-gray-400 text-sm">{exercise.points} pts</span>
                            </div>
                            <Link href={`/dashboard/lesson-plans/${exercise.lesson_plan_id}/${exercise.module_id}`}>
                              <Button size="sm" className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 