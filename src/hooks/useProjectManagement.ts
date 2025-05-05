import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Project,
  ProjectFile,
  createProject,
  getProject,
  updateProject,
  importProject,
  exportProject,
  testUpdateProject,
  addProjectFile,
  updateProjectFile
} from '@/services/api';

interface ProjectHookResult {
  isProjectModalOpen: boolean;
  projectModalTab: 'save' | 'load' | 'import';
  openProjectModal: (tab: 'save' | 'load' | 'import') => void;
  closeProjectModal: () => void;
  saveProject: (name: string, description: string, currentProject: any) => Promise<Project | void>;
  loadProject: (project: Project) => Promise<Project>;
  importProjectFromFile: (name: string, description: string, file: File) => Promise<Project>;
  exportCurrentProject: (projectId: string | number) => Promise<void>;
  createNewProject: (name: string) => any;
}

export default function useProjectManagement(): ProjectHookResult {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<'save' | 'load' | 'import'>('save');

  const openProjectModal = useCallback((tab: 'save' | 'load' | 'import') => {
    setProjectModalTab(tab);
    setIsProjectModalOpen(true);
  }, []);

  const closeProjectModal = useCallback(() => {
    setIsProjectModalOpen(false);
  }, []);

  // Convert the client-side project format to the API format
  const prepareProjectData = (name: string, description: string, clientProject: any): Project => {
    console.log('Converting client project to API format:', clientProject);
    
    // Extract all files from the project, flattening the structure
    const files: ProjectFile[] = clientProject.files.map((file: any) => {
      console.log('Processing file:', file.name, 'path:', file.path);
      
      // Determine parent path based on file path
      let parentPath = null;
      if (file.path !== '/') {
        const pathParts = file.path.split('/');
        pathParts.pop(); // Remove filename
        parentPath = pathParts.join('/') || '/';
        console.log('Calculated parent path:', parentPath, 'for file:', file.path);
      }
      
      return {
        name: file.name,
        path: file.path,
        content: file.isDirectory ? null : (file.content || ''),
        is_directory: !!file.isDirectory,
        language: file.language || null,
        parent_path: parentPath
      };
    });

    console.log('Processed files for API:', files.length);
    console.log('Sample files:', files.slice(0, 3));
    
    return {
      name,
      description,
      main_file_id: clientProject.mainFile,
      files
    };
  };

  // Convert API project format to client-side format
  const prepareClientProject = (apiProject: Project): any => {
    // Sort files to ensure directories are processed first
    const sortedFiles = [...apiProject.files].sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return 0;
    });

    // Create a map of files and directories
    const fileMap: Record<string, any> = {};
    
    // First pass - create all file objects
    sortedFiles.forEach(file => {
      fileMap[file.path] = {
        id: file.id?.toString() || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: file.name,
        path: file.path,
        content: file.content || '',
        isDirectory: file.is_directory,
        language: file.language || '',
        children: file.is_directory ? [] : undefined
      };
    });

    // Second pass - build the tree structure
    sortedFiles.forEach(file => {
      if (file.parent_path && fileMap[file.parent_path] && fileMap[file.path]) {
        if (fileMap[file.parent_path].children) {
          fileMap[file.parent_path].children.push(fileMap[file.path]);
        }
      }
    });

    // Find root directory (should be '/')
    const rootFile = sortedFiles.find(file => file.path === '/');
    
    // Create flat list of all files
    const flatFiles = Object.values(fileMap);
    
    // Determine main file (either from metadata or first Java file)
    let mainFileId = apiProject.main_file_id;
    if (!mainFileId) {
      const firstJavaFile = flatFiles.find(file => !file.isDirectory && file.path.endsWith('.java'));
      if (firstJavaFile) {
        mainFileId = firstJavaFile.id;
      }
    }

    return {
      id: apiProject.id,
      name: apiProject.name,
      files: flatFiles,
      rootDirectory: rootFile ? fileMap[rootFile.path] : null,
      mainFile: mainFileId,
    };
  };

  const saveProject = useCallback(async (name: string, description: string, clientProject: any) => {
    try {
      // This is a new project that hasn't been saved to the server yet
      const projectData = prepareProjectData(name, description, clientProject);
      console.log(`Creating new project "${name}" with ${projectData.files.length} files`);
      console.log('Project data:', projectData);
      
      // Ensure projectData files are correctly formatted
      projectData.files = projectData.files.map(file => ({
        name: file.name,
        path: file.path,
        is_directory: !!file.is_directory,
        content: file.is_directory ? undefined : (file.content || ''),
        language: file.language,
        parent_path: file.parent_path
      })) as ProjectFile[];
      
      const savedProject = await createProject(projectData);
      console.log(`Project created with ID: ${savedProject.id}, returned files:`, savedProject.files);
      toast.success('Project saved successfully');
      
      // Return the server's representation
      return savedProject;
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(`Failed to save project: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }, []);

  const loadProject = useCallback(async (project: Project): Promise<Project> => {
    try {
      // Fetch the full project with all its files
      const fullProject = await getProject(project.id!);
      return fullProject;
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
      throw error;
    }
  }, []);

  const importProjectFromFile = useCallback(async (name: string, description: string, file: File): Promise<Project> => {
    try {
      const importedProject = await importProject(name, description, file);
      toast.success('Project imported successfully');
      return importedProject;
    } catch (error) {
      console.error('Error importing project:', error);
      toast.error('Failed to import project');
      throw error;
    }
  }, []);

  const exportCurrentProject = useCallback(async (projectId: string | number) => {
    try {
      await exportProject(projectId);
      // No need for toast as the browser will download the file automatically
    } catch (error) {
      console.error('Error exporting project:', error);
      toast.error('Failed to export project');
      throw error;
    }
  }, []);

  const createNewProject = useCallback((name: string = 'New Project') => {
    // Generate a simple Java project structure
    const generateId = () => 'temp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    
    const mainFileId = generateId();
    const srcDirId = generateId();
    const rootDirId = generateId();
    
    const mainFile = {
      id: mainFileId,
      name: 'Main.java',
      path: '/src/Main.java',
      content: `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n        System.out.println("Hello, Java!");\n    }\n}`,
      isDirectory: false,
      language: 'java'
    };
    
    const srcDir = {
      id: srcDirId,
      name: 'src',
      path: '/src',
      isDirectory: true,
      language: null,
      children: [mainFile]
    };
    
    const rootDir = {
      id: rootDirId,
      name: name,
      path: '/',
      isDirectory: true,
      language: null,
      children: [srcDir]
    };
    
    // Create a flattened list of all files and directories
    const files = [rootDir, srcDir, mainFile];
    
    console.log('Created new project structure with files:', files);
    
    return {
      id: null, // No ID until saved to the server
      name: name,
      files: files,
      rootDirectory: rootDir,
      mainFile: mainFileId
    };
  }, []);

  return {
    isProjectModalOpen,
    projectModalTab,
    openProjectModal,
    closeProjectModal,
    saveProject,
    loadProject,
    importProjectFromFile,
    exportCurrentProject,
    createNewProject
  };
} 