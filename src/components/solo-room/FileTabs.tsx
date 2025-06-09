import React from 'react';
import { cn } from '@/lib/utils';
import { X, FileCode } from 'lucide-react';

interface ProjectFile {
  id: string;
  name: string;
  content: string;
  path: string;
  language: string;
  isDirectory?: boolean;
}

interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  rootDirectory: ProjectFile;
  mainFile: string;
  isNewUnsavedProject?: boolean;
}

interface FileTabsProps {
  project: Project | null;
  openFileTabs: string[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({
  project,
  openFileTabs,
  activeFileId,
  onFileSelect,
  onTabClose
}) => {
  if (!project) {
    return <div className="h-10 border-b border-gray-800 bg-gray-900"></div>;
  }
  
  // Get file details from project
  const getFileById = (fileId: string): ProjectFile | undefined => {
    return project.files.find(file => file.id === fileId);
  };
  
  // Get file icon based on language
  const getFileIcon = (file: ProjectFile) => {
    if (file.language === 'java') {
      return <FileCode className="h-4 w-4 text-orange-500" />;
    }
    return <FileCode className="h-4 w-4 text-gray-400" />;
  };
  
  return (
    <div className="h-10 border-b border-gray-800 bg-gray-900 flex overflow-x-auto">
      {openFileTabs.length === 0 ? (
        <div className="px-4 flex items-center text-gray-500 text-sm">
          No files open
        </div>
      ) : (
        openFileTabs.map(fileId => {
          const file = getFileById(fileId);
          if (!file) return null;
          
          const isActive = fileId === activeFileId;
          
          return (
            <div 
              key={fileId} 
              className={cn(
                "h-full flex items-center px-3 border-r border-gray-800 text-sm cursor-pointer group",
                isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50"
              )}
              onClick={() => onFileSelect(fileId)}
            >
              <span className="mr-2">{getFileIcon(file)}</span>
              <span>{file.name}</span>
              <button 
                className={cn(
                  "ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100",
                  isActive ? "hover:bg-gray-700" : "hover:bg-gray-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(fileId);
                }}
              >
                <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default FileTabs; 