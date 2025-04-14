"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Code, Timer, Trophy, Star, Users, Zap, Brain, Target, Flame, Filter, Search, BookOpen, AlertCircle, ArrowUpDown, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  problem_counts: Record<string, number>;
  total_problems: number;
  required_level: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty_level: string;
  estimated_time_minutes: number;
  points: number;
  topic_tags: string[];
  success_rate: number;
  attempts_count: number;
  user_status?: string;
  user_points?: number;
  is_featured: boolean;
}

// Get icon component by name
const getIconByName = (iconName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    'Brain': Brain,
    'Code': Code,
    'Target': Target,
    'Flame': Flame,
    'BookOpen': BookOpen,
    'Zap': Zap
  };
  
  return iconMap[iconName] || Code;
};

export default function PracticePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sort, setSort] = useState("difficulty_asc");
  const [activeTab, setActiveTab] = useState("categories");

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/practice/categories`);
        if (response.data.status === 'success') {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load practice categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch problems when category is selected
  useEffect(() => {
    const fetchProblems = async () => {
      if (!selectedCategory) return;
      
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/practice/categories/${selectedCategory}/problems`,
          { params: { sort } }
        );
        
        if (response.data.status === 'success') {
          setProblems(response.data.data.data);
          setFilteredProblems(response.data.data.data);
        }
      } catch (error) {
        console.error("Error fetching problems:", error);
        toast.error("Failed to load practice problems");
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [selectedCategory, sort]);

  // Filter problems when search or difficulty filter changes
  useEffect(() => {
    if (!problems.length) return;
    
    let filtered = [...problems];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(problem => 
        problem.title.toLowerCase().includes(query) || 
        problem.description.toLowerCase().includes(query) ||
        (problem.topic_tags && problem.topic_tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(problem => problem.difficulty_level === difficultyFilter);
    }
    
    setFilteredProblems(filtered);
  }, [searchQuery, difficultyFilter, problems]);

  // Handle category selection
  const selectCategory = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setActiveTab("problems");
  };

  // Get difficulty color based on level
  const getDifficultyColor = (level: string) => {
    const colors: Record<string, string> = {
      'beginner': 'bg-emerald-500/20 text-emerald-400',
      'easy': 'bg-green-500/20 text-green-400',
      'medium': 'bg-yellow-500/20 text-yellow-400',
      'hard': 'bg-orange-500/20 text-orange-400',
      'expert': 'bg-red-500/20 text-red-400'
    };
    
    return colors[level] || 'bg-gray-500/20 text-gray-400';
  };
  
  // Convert time in minutes to readable format
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Practice Arena</h1>
        <p className="text-gray-400">Challenge yourself with Java coding problems</p>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="problems" disabled={!selectedCategory}>Problems</TabsTrigger>
        </TabsList>
        
        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {loading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[140px]"></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category, index) => {
                const Icon = getIconByName(category.icon);
                
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => selectCategory(category.id)}
                  >
                    <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group">
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10`} />
                      <div className="relative p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">{category.name}</h3>
                          <Icon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-white">{category.total_problems}</p>
                        <p className="text-sm text-gray-400">Available Problems</p>
                        
                        {/* Difficulty distribution */}
                        <div className="mt-4 flex items-center space-x-1">
                          {Object.entries(category.problem_counts).map(([level, count]) => (
                            <div 
                              key={level}
                              className={`h-1 flex-1 rounded-full ${getDifficultyColor(level).split(' ')[0]}`} 
                              title={`${level}: ${count} problems`}
                            />
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Problems Tab */}
        <TabsContent value="problems" className="space-y-6">
          {selectedCategory && (
            <>
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-1 max-w-md items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search problems..."
                    className="bg-white/5 border-white/10 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white w-[140px]">
                      <Filter className="h-4 w-4 mr-2 text-gray-400" />
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E293B] border-white/10 text-white">
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white w-[140px]">
                      <ArrowUpDown className="h-4 w-4 mr-2 text-gray-400" />
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E293B] border-white/10 text-white">
                      <SelectItem value="difficulty_asc">Easiest First</SelectItem>
                      <SelectItem value="difficulty_desc">Hardest First</SelectItem>
                      <SelectItem value="popularity">Most Popular</SelectItem>
                      <SelectItem value="success_rate">Highest Success</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Problem Cards */}
              {loading ? (
                // Loading skeleton
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[180px]"></Card>
                  ))}
                </div>
              ) : filteredProblems.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredProblems.map((problem, index) => (
                    <motion.div
                      key={problem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={`/dashboard/practice/${problem.id}`}>
                        <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all h-full">
                          <div className="absolute top-2 right-2">
                            {problem.is_featured && (
                              <Badge className="bg-[#2E5BFF] text-white">Featured</Badge>
                            )}
                            {problem.user_status === 'completed' && (
                              <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          <div className="relative p-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(problem.difficulty_level)}`}>
                                    {problem.difficulty_level.charAt(0).toUpperCase() + problem.difficulty_level.slice(1)}
                                  </span>
                                  {problem.topic_tags && problem.topic_tags.length > 0 && (
                                    <span className="text-xs text-gray-400">{problem.topic_tags.join(', ')}</span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-white">{problem.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2">{problem.description}</p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between text-sm text-gray-400">
                                <div className="flex items-center space-x-2">
                                  <Timer className="h-4 w-4" />
                                  <span>{formatTime(problem.estimated_time_minutes)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Trophy className="h-4 w-4" />
                                  <span>{problem.points} pts</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-400">
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4" />
                                  <span>{problem.attempts_count || 0} attempts</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Star className="h-4 w-4" />
                                  <span>{Math.round(problem.success_rate || 0)}% success</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No problems found</h3>
                  <p className="text-gray-400">
                    {searchQuery || difficultyFilter !== 'all' 
                      ? "Try adjusting your filters or search query"
                      : "There are no problems in this category yet"}
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 