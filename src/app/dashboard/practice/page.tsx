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
import { api, API_URL } from "@/services/api";

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
  resources: any[];
  category_name?: string;
  category_id?: number;
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
  subcategories: any[];
}

export default function PracticePage() {
  const [categories, setCategories] = useState<PracticeCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<PracticeCategory[]>([]);
  const [allProblems, setAllProblems] = useState<PracticeProblem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<PracticeProblem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("categories");

  // Fetch practice data
  useEffect(() => {
    const fetchPracticeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching practice data from:', `${API_URL}/practice/all-data`);
        const response = await api.get(`/practice/all-data`);
        
        console.log('API Response:', response.data);
        
        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Failed to fetch practice data');
        }

        const practiceData = response.data.data || [];
        
        // Flatten all problems from all categories
        const problems = practiceData.flatMap((category: PracticeCategory) => 
          category.problems.map(problem => ({
            ...problem,
            category_name: category.name,
            category_id: category.id
          }))
        );

        setCategories(practiceData);
        setFilteredCategories(practiceData);
        setAllProblems(problems);
        setFilteredProblems(problems);
        
        console.log('Loaded categories:', practiceData.length);
        console.log('Loaded problems:', problems.length);
        
      } catch (error: any) {
        console.error('Error fetching practice data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load practice data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeData();
  }, []);

  // Filter data when search or filters change
  useEffect(() => {
    let filteredCats = [...categories];
    let filteredProbs = [...allProblems];
    
    // Apply category filter
    if (selectedCategory) {
      filteredCats = filteredCats.filter(cat => cat.id === selectedCategory);
      filteredProbs = filteredProbs.filter(prob => prob.category_id === selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredCats = filteredCats.filter(cat => 
        cat.name.toLowerCase().includes(query) || 
        cat.description.toLowerCase().includes(query)
      );
      
      filteredProbs = filteredProbs.filter(prob => 
        prob.title.toLowerCase().includes(query) || 
        prob.description.toLowerCase().includes(query) ||
        prob.topic_tags.some(tag => tag.toLowerCase().includes(query)) ||
        prob.learning_concepts.some(concept => concept.toLowerCase().includes(query))
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filteredCats = filteredCats.filter(cat => 
        cat.problems.some(prob => prob.difficulty_level === difficultyFilter)
      );
      filteredProbs = filteredProbs.filter(prob => prob.difficulty_level === difficultyFilter);
    }
    
    // Apply type filter (based on topic tags)
    if (typeFilter !== 'all') {
      filteredCats = filteredCats.filter(cat => 
        cat.problems.some(prob => prob.topic_tags.includes(typeFilter))
      );
      filteredProbs = filteredProbs.filter(prob => prob.topic_tags.includes(typeFilter));
    }
    
    setFilteredCategories(filteredCats);
    setFilteredProblems(filteredProbs);
  }, [searchQuery, difficultyFilter, typeFilter, selectedCategory, categories, allProblems]);

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
            <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Practice Data</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/80">
              Try Again
            </Button>
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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Practice Challenges
            </h1>
            <p className="text-gray-400 mt-2">
              Sharpen your Java skills with hands-on coding challenges and problems
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search practice problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            
            <Select value={selectedCategory?.toString() || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : parseInt(value))}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="categories">Categories ({filteredCategories.length})</TabsTrigger>
            <TabsTrigger value="problems">All Problems ({filteredProblems.length})</TabsTrigger>
          </TabsList>
          
          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            {loading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-white/5 backdrop-blur-sm animate-pulse h-[200px]"></Card>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No categories found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCategories.map((category, index) => (
                  <motion.div
                    key={category.id}
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
                            <h3 className="font-semibold text-white">{category.name}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2">{category.description}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#2E5BFF]/20">
                            {category.icon === 'Brain' && <Brain className="h-6 w-6 text-[#2E5BFF]" />}
                            {category.icon === 'Code' && <Code className="h-6 w-6 text-[#2E5BFF]" />}
                            {category.icon === 'Target' && <Target className="h-6 w-6 text-[#2E5BFF]" />}
                            {!['Brain', 'Code', 'Target'].includes(category.icon) && <BookOpen className="h-6 w-6 text-[#2E5BFF]" />}
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center gap-1">
                              <Code className="h-4 w-4 text-[#2E5BFF]" />
                              <span className="text-gray-400">{category.total_problems} problems</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-[#2E5BFF]" />
                              <span className="text-gray-400">Level {category.required_level}+</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Difficulty Distribution */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries(category.problem_counts).map(([difficulty, count]) => (
                            <Badge key={difficulty} className={`${getDifficultyColor(difficulty)} border-0`}>
                              {difficulty}: {count}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Action Button */}
                        <Link href={`/dashboard/practice/${category.id}`}>
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
          
          {/* Problems Tab */}
          <TabsContent value="problems" className="space-y-6">
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
                                <Badge variant="outline" className="text-[#2E5BFF] border-[#2E5BFF]/30">
                                  {problem.category_name}
                                </Badge>
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
                                <span>{problem.estimated_time_minutes}m</span>
                                <span>{problem.success_rate}% success rate</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-gray-400 text-sm">{problem.points} pts</span>
                              </div>
                              <Link href={`/dashboard/practice/problems/${problem.id}`}>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 