import React, { useState } from 'react';
import { 
  FolderOpen, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define types
interface ProjectFile {
  id: string;
  name: string;
  content: string;
  path: string;
  language: string;
  isDirectory?: boolean;
  children?: ProjectFile[];
}

interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  rootDirectory: ProjectFile;
  mainFile: string;
  isNewUnsavedProject?: boolean;
}

interface FileExplorerProps {
  project: Project | null;
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onCreateNewFile: () => void;
  onDeleteFile: (fileId: string) => void;
  setNewFileName: (name: string) => void;
  setNewFileParentPath: (path: string) => void;
  setShowNewFileDialog: (show: boolean) => void;
  setIsCreatingDirectory: (isDir: boolean) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  activeFileId,
  onFileSelect,
  onCreateNewFile,
  onDeleteFile,
  setNewFileName,
  setNewFileParentPath,
  setShowNewFileDialog,
  setIsCreatingDirectory
}) => {
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);
  
  const handleToggleDirectory = (dirId: string) => {
    setExpandedDirs(prev => 
      prev.includes(dirId) 
        ? prev.filter(id => id !== dirId)
        : [...prev, dirId]
    );
  };
  
  const getFileIcon = (file: ProjectFile) => {
    if (file.isDirectory) {
      return expandedDirs.includes(file.id) 
        ? <FolderOpen className="h-4 w-4 text-yellow-400" />
        : <FolderOpen className="h-4 w-4 text-yellow-400 opacity-70" />;
    }
    
    if (file.name.endsWith('.java')) {
      return <FileCode className="h-4 w-4 text-orange-500" />;
    }
    
    return <FileCode className="h-4 w-4 text-gray-400" />;
  };
  
  const renderFileTree = (file: ProjectFile, level = 0) => {
    const isExpanded = file.isDirectory && expandedDirs.includes(file.id);
    
    return (
      <div key={file.id} className="file-tree-item">
        <div 
          className={cn(
            "flex items-center py-1 px-2 text-sm rounded-sm hover:bg-white/5 cursor-pointer",
            activeFileId === file.id && !file.isDirectory ? "bg-blue-900/20" : "",
            "ml-" + level
          )}
          onClick={() => file.isDirectory ? handleToggleDirectory(file.id) : onFileSelect(file.id)}
        >
          {file.isDirectory ? (
            <span className="mr-1">
              {isExpanded ? 
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : 
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
            </span>
          ) : (
            <span className="w-3.5 mr-1"></span>
          )}
          
          <span className="mr-1.5">{getFileIcon(file)}</span>
          <span className={cn(
            "text-sm", 
            file.isDirectory ? "text-gray-300 font-medium" : "text-gray-400"
          )}>
            {file.name}
          </span>
          
          {!file.isDirectory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file.id);
              }}
              className="ml-auto text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {file.isDirectory && isExpanded && file.children && (
          <div className="pl-4">
            {file.children.map(child => renderFileTree(child, level + 2))}
            
            <div 
              className="flex items-center py-1 px-2 text-sm text-gray-500 hover:text-blue-400 cursor-pointer"
              onClick={() => handleNewFile(false, file.path)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>New File</span>
            </div>
            
            <div 
              className="flex items-center py-1 px-2 text-sm text-gray-500 hover:text-blue-400 cursor-pointer"
              onClick={() => handleNewFile(true, file.path)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>New Folder</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const handleNewFile = (isDirectory: boolean, parentPath: string = '/') => {
    setIsCreatingDirectory(isDirectory);
    setNewFileParentPath(parentPath);
    setNewFileName('');
    setShowNewFileDialog(true);
  };
  
  if (!project) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        No project loaded
      </div>
    );
  }
  
  return (
    <div className="file-explorer p-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm font-medium text-white">Project Files</h3>
        <button
          onClick={() => handleNewFile(false, '/')}
          className="text-gray-400 hover:text-blue-400"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <div className="file-tree">
        {project.rootDirectory && renderFileTree(project.rootDirectory)}
        
        {(!project.rootDirectory || !project.rootDirectory.children || project.rootDirectory.children.length === 0) && (
          <div className="text-center p-4 text-gray-500 text-sm">
            Empty project. Add files to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer; 