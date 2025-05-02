// Project-related types
export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirectory?: boolean;
  language?: string;
  parentPath?: string;
  children?: ProjectFile[];
}

export interface Project {
  id?: string | number;
  name: string;
  description?: string;
  mainFile: string;
  files: ProjectFile[];
  rootDirectory: ProjectFile;
}

// Interface for the conversation messages
export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot' | 'ai';
  timestamp: Date;
  code?: string;
} 