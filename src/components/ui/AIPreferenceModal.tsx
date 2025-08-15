import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, Code, Brain, Trophy } from 'lucide-react';

interface AIPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (choice: string, reason?: string) => void;
  sessionId?: number;
  isLoading?: boolean;
}

const AI_OPTIONS = [
  {
    id: 'gemini',
    name: 'Gemini AI',
    description: 'Google\'s advanced language model',
    icon: Brain,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open-source model with strong reasoning',
    icon: MessageSquare,
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  {
    id: 'both',
    name: 'Both AIs',
    description: 'Both models were equally helpful',
    icon: Star,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  {
    id: 'neither',
    name: 'Neither AI',
    description: 'Neither model was particularly helpful',
    icon: Code,
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
];

export function AIPreferenceModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  sessionId, 
  isLoading = false 
}: AIPreferenceModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const handleSubmit = () => {
    if (selectedChoice) {
      onSubmit(selectedChoice, reason.trim() || undefined);
      // Reset form
      setSelectedChoice('');
      setReason('');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedChoice('');
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900/95 border border-white/10 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Which AI helped you most?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            After completing your quiz/practice, please let us know which AI tutor was most helpful. 
            This helps us improve the learning experience for everyone.
          </p>

          {/* AI Choice Options */}
          <div className="grid grid-cols-2 gap-3">
            {AI_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedChoice === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedChoice(option.id)}
                  disabled={isLoading}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    isSelected 
                      ? `${option.color} border-current` 
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{option.name}</span>
                  </div>
                  <p className="text-xs opacity-80">{option.description}</p>
                </button>
              );
            })}
          </div>

          {/* Optional Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Optional: Why did you choose this AI? (helps us improve)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., 'Gemini explained concepts more clearly' or 'Together AI gave better code examples'"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Badge variant="outline" className="bg-white/5 border-white/10">
                Session #{sessionId}
              </Badge>
              <span>Your feedback helps improve our AI tutors</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedChoice || isLoading}
              className="flex-1 bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 text-white"
            >
              {isLoading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
