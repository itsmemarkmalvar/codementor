import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star, Clock, Bookmark, BookOpen, FileVideo, FileText, Laptop } from "lucide-react";
import Link from "next/link";

interface PracticeResource {
  id: number;
  title: string;
  description: string;
  url: string;
  type: string;
  source: string;
  is_premium: boolean;
  difficulty_level: string;
  estimated_time_minutes: number;
  thumbnail_url?: string;
  is_official: boolean;
  rating: number;
  views: number;
  relevance_score?: number;
}

interface PracticeResourcesListProps {
  resources: PracticeResource[];
  isLoading?: boolean;
}

const ResourceTypeIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'article':
      return <FileText className="h-4 w-4" />;
    case 'video':
      return <FileVideo className="h-4 w-4" />;
    case 'documentation':
      return <BookOpen className="h-4 w-4" />;
    case 'course':
      return <Laptop className="h-4 w-4" />;
    default:
      return <Bookmark className="h-4 w-4" />;
  }
};

export function PracticeResourcesList({ resources, isLoading = false }: PracticeResourcesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-md p-4 animate-pulse">
            <div className="h-5 bg-slate-600 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No learning resources available for this problem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {resources.map((resource) => (
        <div 
          key={resource.id} 
          className="border rounded-md p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ResourceTypeIcon type={resource.type} />
                <span className="text-xs text-muted-foreground capitalize">{resource.type}</span>
                {resource.is_premium && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-none">Premium</Badge>
                )}
                {resource.is_official && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-none">Official</Badge>
                )}
              </div>
              <h3 className="font-medium text-sm">{resource.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
              
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-yellow-400" />
                  <span>{resource.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{resource.estimated_time_minutes} min</span>
                </div>
                {resource.relevance_score !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-green-400">Relevance: {Math.round(resource.relevance_score * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            <Link 
              href={resource.url} 
              target="_blank" 
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              <span>Open</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
} 