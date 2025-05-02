"use client";

import { useState, useEffect } from 'react';
import { Project, ProjectFile } from '@/types';
import ProjectModal from './ProjectModal';
import ProjectManagementToolbar from './ProjectManagementToolbar';
import useProjectManagement from '@/hooks/useProjectManagement';
import { toast } from 'sonner';
import { Project as ApiProject } from '@/services/api';
import { isAuthenticated } from '@/lib/auth-utils';

interface ProjectIntegrationProps {
  currentProject: any;
  setCurrentProject: (project: any) => void;
  setProjectFiles: (files: any[]) => void;
  setActiveFileId: (id: string) => void;
  setOpenFileTabs: (tabs: string[]) => void;
}

const ProjectIntegration: React.FC<ProjectIntegrationProps> = ({
  currentProject,
  setCurrentProject,
  setProjectFiles,
  setActiveFileId,
  setOpenFileTabs
}) => {
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user is authenticated
    setUserAuthenticated(isAuthenticated());
  }, []);
  
  // Helper function to check if we have a valid project
  const hasValidProject = (): boolean => {
    return !!(currentProject && 
              typeof currentProject === 'object' &&
              currentProject.files && 
              Array.isArray(currentProject.files) &&
              currentProject.files.length > 0 && 
              currentProject.mainFile &&
              currentProject.files.some((file: {id: string}) => file.id === currentProject.mainFile) &&
              !currentProject.isNewUnsavedProject);
  };
  
  const {
    isProjectModalOpen,
    projectModalTab,
    openProjectModal,
    closeProjectModal,
    saveProject,
    loadProject,
    importProjectFromFile,
    exportCurrentProject,
    createNewProject
  } = useProjectManagement();

  const handleSaveProject = async (name: string, description: string, project: any) => {
    try {
      // Check if user is authenticated
      if (!userAuthenticated) {
        toast.error('You need to be logged in to save projects');
        // You might want to redirect to login page or open login modal
        return;
      }
      
      const result = await saveProject(name, description, project);
      // Only update if it's a new project (result contains the new project data)
      if (result && 'id' in result) {
        // Update the current project with the server-generated ID if it's a new project
        setCurrentProject({
          ...currentProject,
          id: result.id,
          isNewUnsavedProject: false // Clear the flag after saving
        });
      } else {
        // Even for updates, clear the flag
        setCurrentProject({
          ...currentProject,
          isNewUnsavedProject: false
        });
      }
    } catch (error: any) {
      console.error('Error saving project:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Authentication error. Please log in to save projects.');
        // Redirect to login or show login modal
      } else {
        toast.error('Failed to save project');
      }
    }
  };

  const handleLoadProject = async (project: ApiProject) => {
    try {
      // Check if user is authenticated
      if (!userAuthenticated) {
        toast.error('You need to be logged in to load projects');
        // You might want to redirect to login page or open login modal
        return;
      }
      
      const loadedProject = await loadProject(project);
      
      // Convert API project format to client format
      const clientProject = {
        id: loadedProject.id,
        name: loadedProject.name,
        files: loadedProject.files.map((file: any) => ({
          id: file.id?.toString(),
          name: file.name,
          path: file.path,
          content: file.content || '',
          isDirectory: file.is_directory,
          language: file.language || ''
        })),
        rootDirectory: loadedProject.files.find((file: any) => file.path === '/'),
        mainFile: loadedProject.main_file_id
      };
      
      setCurrentProject(clientProject);
      setProjectFiles(clientProject.files);
      
      // Set active file to main file
      if (clientProject.mainFile) {
        setActiveFileId(clientProject.mainFile);
        setOpenFileTabs([clientProject.mainFile]);
      }
      
      toast.success('Project loaded successfully');
    } catch (error: any) {
      console.error('Error loading project:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Authentication error. Please log in to load projects.');
      } else {
        toast.error('Failed to load project');
      }
    }
  };

  const handleImportProject = async (name: string, description: string, file: File) => {
    try {
      // Check if user is authenticated
      if (!userAuthenticated) {
        toast.error('You need to be logged in to import projects');
        // You might want to redirect to login page or open login modal
        return;
      }
      
      const importedProject = await importProjectFromFile(name, description, file);
      
      // Convert API project format to client format
      const clientProject = {
        id: importedProject.id,
        name: importedProject.name,
        files: importedProject.files.map((file: any) => ({
          id: file.id?.toString(),
          name: file.name,
          path: file.path,
          content: file.content || '',
          isDirectory: file.is_directory,
          language: file.language || ''
        })),
        rootDirectory: importedProject.files.find((file: any) => file.path === '/'),
        mainFile: importedProject.main_file_id
      };
      
      setCurrentProject(clientProject);
      setProjectFiles(clientProject.files);
      
      // Set active file to main file
      if (clientProject.mainFile) {
        setActiveFileId(clientProject.mainFile);
        setOpenFileTabs([clientProject.mainFile]);
      }
      
      toast.success('Project imported successfully');
    } catch (error: any) {
      console.error('Error importing project:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Authentication error. Please log in to import projects.');
      } else {
        toast.error('Failed to import project');
      }
    }
  };

  const handleExportProject = async () => {
    try {
      // Check if user is authenticated
      if (!userAuthenticated) {
        toast.error('You need to be logged in to export projects');
        // You might want to redirect to login page or open login modal
        return;
      }
      
      if (!currentProject.id) {
        toast.error('You need to save the project before exporting');
        openProjectModal('save');
        return;
      }
      
      await exportCurrentProject(currentProject.id);
    } catch (error: any) {
      console.error('Error exporting project:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        toast.error('Authentication error. Please log in to export projects.');
      } else {
        toast.error('Failed to export project');
      }
    }
  };

  const handleNewProject = () => {
    const newProject = createNewProject('New Project');
    setCurrentProject(newProject);
    setProjectFiles(newProject.files);
    
    // Set active file to main file
    setActiveFileId(newProject.mainFile);
    setOpenFileTabs([newProject.mainFile]);
    
    toast.success('New project created');
  };

  return (
    <>
      <ProjectManagementToolbar
        onNewProject={handleNewProject}
        onOpenSaveModal={() => openProjectModal('save')}
        onOpenLoadModal={() => openProjectModal('load')}
        onOpenImportModal={() => openProjectModal('import')}
        onExportProject={handleExportProject}
        hasProject={hasValidProject()}
      />
      
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={closeProjectModal}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onImportProject={handleImportProject}
        currentProject={currentProject}
      />
    </>
  );
};

export default ProjectIntegration; 