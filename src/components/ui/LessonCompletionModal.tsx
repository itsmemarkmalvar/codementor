import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, HelpCircle, ArrowRight, BookOpen, MessageSquare } from 'lucide-react';

interface LessonCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onRequestClarification: (request: string) => void;
  lessonTitle?: string;
  sessionId?: number;
  isLoading?: boolean;
}

export function LessonCompletionModal({
  isOpen,
  onClose,
  onProceed,
  onRequestClarification,
  lessonTitle = 'this lesson',
  sessionId,
  isLoading = false
}: LessonCompletionModalProps) {
  const [clarificationRequest, setClarificationRequest] = useState<string>('');
  const [showClarificationForm, setShowClarificationForm] = useState(false);

  const handleProceed = () => {
    onProceed();
    handleClose();
  };

  const handleRequestClarification = () => {
    if (clarificationRequest.trim()) {
      onRequestClarification(clarificationRequest.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setClarificationRequest('');
      setShowClarificationForm(false);
      onClose();
    }
  };

  const handleNeedHelp = () => {
    setShowClarificationForm(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900/95 border border-white/10 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Lesson Complete!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Great job completing {lessonTitle}!
            </h3>
            <p className="text-sm text-gray-300">
              You've successfully completed this lesson. What would you like to do next?
            </p>
          </div>

          {!showClarificationForm ? (
            <div className="space-y-3">
              {/* Proceed Button */}
              <Button
                onClick={handleProceed}
                disabled={isLoading}
                className="w-full bg-[#2E5BFF] hover:bg-[#2E5BFF]/90 text-white h-12"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Next Lesson
              </Button>

              {/* Need Help Button */}
              <Button
                variant="outline"
                onClick={handleNeedHelp}
                disabled={isLoading}
                className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 h-12"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                I need clarification
              </Button>

              {/* Skip Button */}
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="w-full text-gray-400 hover:text-white hover:bg-white/5"
              >
                I'll decide later
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MessageSquare className="h-4 w-4" />
                <span>What specific part would you like clarified?</span>
              </div>

              <Textarea
                value={clarificationRequest}
                onChange={(e) => setClarificationRequest(e.target.value)}
                placeholder="e.g., 'I'm still confused about inheritance' or 'Can you explain polymorphism with more examples?'"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 resize-none"
                rows={4}
                disabled={isLoading}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowClarificationForm(false)}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRequestClarification}
                  disabled={!clarificationRequest.trim() || isLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Request Clarification'}
                </Button>
              </div>
            </div>
          )}

          {/* Session Info */}
          {sessionId && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2 border-t border-white/10">
              <Badge variant="outline" className="bg-white/5 border-white/10">
                Session #{sessionId}
              </Badge>
              <span>Your feedback helps improve our lessons</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
