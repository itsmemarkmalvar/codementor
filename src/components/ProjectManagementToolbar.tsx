"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, FolderOpen, Upload, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectManagementToolbarProps {
  onNewProject: () => void;
  onOpenSaveModal: () => void;
  onOpenLoadModal: () => void;
  onOpenImportModal: () => void;
  onExportProject: () => Promise<void>;
  hasProject: boolean;
}

const ProjectManagementToolbar: React.FC<ProjectManagementToolbarProps> = ({
  onNewProject,
  onOpenSaveModal,
  onOpenLoadModal,
  onOpenImportModal,
  onExportProject,
  hasProject
}) => {
  const handleExport = async () => {
    try {
      await onExportProject();
    } catch (error) {
      console.error('Error exporting project:', error);
      toast.error('Failed to export project');
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline" 
        size="sm"
        onClick={onNewProject}
        className="bg-white/5 hover:bg-white/10 text-white border-white/10"
        title="Create a new project"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        New
      </Button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSaveModal}
              disabled={!hasProject}
              className="bg-white/5 hover:bg-white/10 text-white border-white/10 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!hasProject 
              ? "You need to create a new project using the New button, then click Save to name and save it" 
              : "Save the current project"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenLoadModal}
        className="bg-white/5 hover:bg-white/10 text-white border-white/10"
        title="Load a previously saved project"
      >
        <FolderOpen className="h-4 w-4 mr-1.5" />
        Load
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenImportModal}
        className="bg-white/5 hover:bg-white/10 text-white border-white/10"
        title="Import a project from a ZIP file"
      >
        <Upload className="h-4 w-4 mr-1.5" />
        Import
      </Button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!hasProject}
              className="bg-white/5 hover:bg-white/10 text-white border-white/10 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!hasProject 
              ? "Create a project first using the New button" 
              : "Export the current project as a ZIP file"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ProjectManagementToolbar; 