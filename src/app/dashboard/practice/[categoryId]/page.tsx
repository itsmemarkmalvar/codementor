"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Code, Timer, Star, Brain, Target, BookOpen, AlertCircle, Play, ArrowLeft, Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";

interface PracticeProblem {
  id: number;
  title: string;
  description: string;
  difficulty_level: string;
  points: number;
  estimated_time_minutes: number;
  complexity_tags: string[];
  topic_tags: string[];
  learning_concepts: string[];
  success_rate: number;
  starter_code?: string;
  test_cases?: any[];
  hints?: string[];
}

interface PracticeCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  required_level: number;
  problem_counts: Record<string, number>;
  total_problems: number;
  problems: PracticeProblem[];
}

export default function CategoryPracticePage() {
  const params = useParams();
  const categoryId = parseInt(params.categoryId as string);
  
  const [category, setCategory] = useState<PracticeCategory | null>(null);
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<PracticeProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("difficulty");

  // Fetch category and problems
  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get category data from the all-data endpoint and filter for this category
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/practice/all-data`);
        
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch practice data');
        }

        const categories = response.data.data || [];
        const categoryData = categories.find((cat: PracticeCategory) => cat.id === categoryId);
        
        if (!categoryData) {
          throw new Error('Category not found');
        }

        setCategory(categoryData);
        setProblems(categoryData.problems || []);
        setFilteredProblems(categoryData.problems || []);
        
      } catch (error: any) {
        console.error('Error fetching category data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load category data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchCategoryData();
    }
  }, [categoryId]);

  // Filter and sort problems
  useEffect(() => {
    let filtered = [...problems];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(problem => 
        problem.title.toLowerCase().includes(query) || 
        problem.description.toLowerCase().includes(query) ||
        problem.topic_tags.some(tag => tag.toLowerCase().includes(query)) ||
        problem.learning_concepts.some(concept => concept.toLowerCase().includes(query))
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(problem => problem.difficulty_level === difficultyFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'difficulty':
        const difficultyOrder = ['beginner', 'easy', 'medium', 'hard', 'expert'];
        filtered.sort((a, b) => 
          difficultyOrder.indexOf(a.difficulty_level) - difficultyOrder.indexOf(b.difficulty_level)
        );
        break;
      case 'points':
        filtered.sort((a, b) => b.points - a.points);
        break;
      case 'time':
        filtered.sort((a, b) => a.estimated_time_minutes - b.estimated_time_minutes);
        break;
      case 'success_rate':
        filtered.sort((a, b) => b.success_rate - a.success_rate);
        break;
    }
    
    setFilteredProblems(filtered);
  }, [searchQuery, difficultyFilter, sortBy, problems]);

  // Get difficulty color
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

  // Get type icon
  const getTypeIcon = (tags: string[]) => {
    if (tags.includes('algorithms')) return Brain;
    if (tags.includes('data-structures')) return Code;
    if (tags.includes('problem-solving')) return Target;
    return BookOpen;
  };

  // Get type color
  const getTypeColor = (tags: string[]) => {
    if (tags.includes('algorithms')) return 'bg-blue-500/20 text-blue-400';
    if (tags.includes('data-structures')) return 'bg-emerald-500/20 text-emerald-400';
    if (tags.includes('problem-solving')) return 'bg-orange-500/20 text-orange-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-[#0A1929] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Category</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="space-x-4">
              <Link href="/dashboard/practice">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Practice
                </Button>
              </Link>
              <Button onClick={() => window.location.reload()} className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1929] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/practice">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-64 bg-white/10 animate-pulse rounded"></div>
                  <div className="h-4 w-96 bg-white/5 animate-pulse rounded"></div>
                </div>
              ) : category ? (
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {category.name}
                  </h1>
                  <p className="text-gray-400 mt-2">{category.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>{category.total_problems} problems</span>
                    <span>Level {category.required_level}+ required</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="difficulty">By Difficulty</SelectItem>
                <SelectItem value="points">By Points</SelectItem>
                <SelectItem value="time">By Time</SelectItem>
                <SelectItem value="success_rate">By Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Problems List */}
        <div className="space-y-6">
          {loading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[120px]"></Card>
              ))}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-12">
              <Code className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No problems found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem, index) => {
                const TypeIcon = getTypeIcon(problem.topic_tags);
                return (
                  <motion.div
                    key={problem.id}
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
                              <Badge className={`${getTypeColor(problem.topic_tags)} border-0`}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {problem.topic_tags[0] || 'coding'}
                              </Badge>
                              <Badge className={`${getDifficultyColor(problem.difficulty_level)} border-0`}>
                                {problem.difficulty_level}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-white">{problem.title}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2">{problem.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {problem.estimated_time_minutes}m
                              </span>
                              <span>{problem.success_rate}% success rate</span>
                              {problem.hints && (
                                <span>{problem.hints.length} hints available</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-gray-400 text-sm">{problem.points} pts</span>
                            </div>
                            <Link href={`/dashboard/practice/${problem.id}`}>
                              <Button size="sm" className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80 text-white">
                                <Play className="h-4 w-4 mr-1" />
                                Solve
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
        </div>
      </div>
    </div>
  );
} 