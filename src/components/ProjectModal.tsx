"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project, ProjectFile, getProjects } from '@/services/api';
import { Save, FolderOpen, Upload, Download, FileCode, Search, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (name: string, description: string, currentProject: any) => Promise<void>;
  onLoadProject: (project: Project) => Promise<void>;
  onImportProject: (name: string, description: string, file: File) => Promise<void>;
  currentProject: any;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSaveProject,
  onLoadProject,
  onImportProject,
  currentProject
}) => {
  const [activeTab, setActiveTab] = useState('save');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch saved projects when the modal opens
  useEffect(() => {
    if (isOpen && (activeTab === 'load' || activeTab === 'save')) {
      fetchSavedProjects();
    }
  }, [isOpen, activeTab]);

  // Set default project name based on current project
  useEffect(() => {
    if (isOpen && currentProject) {
      setProjectName(currentProject.name || 'My Project');
    }
  }, [isOpen, currentProject]);

  const fetchSavedProjects = async () => {
    try {
      setIsLoading(true);
      const projects = await getProjects();
      setSavedProjects(projects || []);
    } catch (error) {
      console.error('Error fetching saved projects:', error);
      toast.error('Failed to load saved projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      setIsLoading(true);
      await onSaveProject(projectName, projectDescription, currentProject);
      onClose();
      toast.success('Project saved successfully');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project to load');
      return;
    }

    try {
      setIsLoading(true);
      const projectToLoad = savedProjects.find(p => p.id === selectedProjectId);
      if (projectToLoad) {
        await onLoadProject(projectToLoad);
        onClose();
        toast.success('Project loaded successfully');
      } else {
        toast.error('Project not found');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    if (!importFile) {
      toast.error('Please select a ZIP file to import');
      return;
    }

    try {
      setIsLoading(true);
      await onImportProject(projectName, projectDescription, importFile);
      onClose();
      toast.success('Project imported successfully');
    } catch (error) {
      console.error('Error importing project:', error);
      toast.error('Failed to import project');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = searchQuery
    ? savedProjects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : savedProjects;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-[#1a2e42] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileCode className="h-5 w-5 text-[#2E5BFF]" />
            Project Management
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save, load, or import Java projects
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="save" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="save" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Project
            </TabsTrigger>
            <TabsTrigger value="load" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Load Project
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Project
            </TabsTrigger>
          </TabsList>

          <TabsContent value="save" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="bg-white/5 border-white/10 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  className="bg-white/5 border-white/10 focus:border-blue-500 min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                onClick={handleSaveProject}
                disabled={isLoading}
                className="bg-[#2E5BFF] hover:bg-blue-600"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="load" className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white/5 border-white/10 focus:border-blue-500"
                />
              </div>

              <div className="border border-white/10 rounded-md overflow-hidden">
                {isLoading ? (
                  <div className="p-8 flex justify-center items-center">
                    <Loader className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="max-h-[250px] overflow-y-auto">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors ${
                          selectedProjectId === project.id ? 'bg-white/10' : ''
                        }`}
                        onClick={() => setSelectedProjectId(project.id ?? '')}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{project.name}</h3>
                          <span className="text-xs text-gray-400">
                            {project.files?.length || 0} files
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    {searchQuery
                      ? 'No projects match your search'
                      : 'No saved projects yet'}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleLoadProject}
                disabled={!selectedProjectId || isLoading}
                className="bg-[#2E5BFF] hover:bg-blue-600"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Load Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-name">Project Name</Label>
                <Input
                  id="import-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="bg-white/5 border-white/10 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-description">Description (Optional)</Label>
                <Textarea
                  id="import-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  className="bg-white/5 border-white/10 focus:border-blue-500 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-file">Select ZIP File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="import-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="bg-white/5 border-white/10 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Only ZIP files containing Java project files are supported
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleImportProject}
                disabled={!importFile || isLoading}
                className="bg-[#2E5BFF] hover:bg-blue-600"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal; 