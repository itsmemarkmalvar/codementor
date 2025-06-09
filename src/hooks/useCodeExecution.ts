import { useState, useCallback } from 'react';
import { executeJavaCode, executeJavaProject } from '@/services/api';
import { toast } from 'sonner';

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

interface CodeOutput {
  stdout: string;
  stderr: string;
  executionTime: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useCodeExecution() {
  const [codeInput, setCodeInput] = useState<string>(`public class HelloWorld {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, Java!");
    }
}`);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [codeOutput, setCodeOutput] = useState<CodeOutput | null>(null);
  const [isFormatting, setIsFormatting] = useState<boolean>(false);

  // Execute single Java file
  const executeCode = useCallback(async (
    code: string = codeInput,
    sessionId?: number | null,
    topicId?: number | null,
    conversationHistory: ConversationMessage[] = []
  ) => {
    if (!code.trim()) {
      toast.error('No code to execute');
      return null;
    }

    setIsExecuting(true);
    setCodeOutput(null);

    try {
      // Format conversation history for the API
      const formattedHistory = 
        Array.isArray(conversationHistory) ? conversationHistory : [];

      // Call the API to execute the code
      const result = await executeJavaCode({
        code,
        session_id: sessionId ?? undefined,
        topic_id: topicId ?? undefined,
        conversation_history: formattedHistory,
      });

      // Set the output
      const output = {
        stdout: result.execution.stdout || '',
        stderr: result.execution.stderr || '',
        executionTime: result.execution.executionTime || 0
      };
      
      setCodeOutput(output);
      
      return {
        output,
        feedback: result.feedback || null,
        success: !result.execution.stderr
      };
    } catch (error) {
      console.error('Error executing code:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Failed to execute code. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Set error output
      const errorOutput = {
        stdout: '',
        stderr: errorMessage,
        executionTime: 0
      };
      
      setCodeOutput(errorOutput);
      toast.error('Code execution failed');
      
      return {
        output: errorOutput,
        feedback: null,
        success: false
      };
    } finally {
      setIsExecuting(false);
    }
  }, [codeInput]);

  // Execute Java project (multiple files)
  const executeProject = useCallback(async (
    project: Project,
    sessionId?: number | null,
    topicId?: number | null,
    conversationHistory: ConversationMessage[] = []
  ) => {
    if (!project || !project.files || project.files.length === 0) {
      toast.error('No project files to execute');
      return null;
    }

    setIsExecuting(true);
    setCodeOutput(null);

    try {
      // Get all Java files from the project
      const filesToCompile = project.files
        .filter(file => file.language === 'java' && !file.isDirectory)
        .map(file => ({
          path: file.path,
          content: file.content
        }));

      // If no Java files found, display error
      if (filesToCompile.length === 0) {
        toast.error('No Java files found in the project');
        return null;
      }

      // Get the main file to run
      const mainFile = project.files.find(file => file.id === project.mainFile);
      if (!mainFile) {
        toast.error('Main file not found');
        return null;
      }

      // Extract the class name from the main file path for execution
      const mainClass = mainFile.path.split('/').pop()?.replace('.java', '') || 'Main';

      // Format conversation history for the API
      const formattedHistory = 
        Array.isArray(conversationHistory) ? conversationHistory : [];

      // Call the API to execute the project
      const result = await executeJavaProject({
        files: filesToCompile,
        main_class: mainClass,
        session_id: sessionId ?? undefined,
        topic_id: topicId ?? undefined,
        conversation_history: formattedHistory
      });

      // Set the output
      const output = {
        stdout: result.execution.stdout || '',
        stderr: result.execution.stderr || '',
        executionTime: result.execution.executionTime || 0
      };
      
      setCodeOutput(output);
      
      return {
        output,
        feedback: result.feedback || null,
        success: !result.execution.stderr
      };
    } catch (error) {
      console.error('Error executing project:', error);
      
      // Create a user-friendly error message
      let errorMessage = 'Failed to execute project. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Set error output
      const errorOutput = {
        stdout: '',
        stderr: errorMessage,
        executionTime: 0
      };
      
      setCodeOutput(errorOutput);
      toast.error('Project execution failed');
      
      return {
        output: errorOutput,
        feedback: null,
        success: false
      };
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Format code using the Monaco editor's built-in formatter
  const formatCode = useCallback(() => {
    setIsFormatting(true);
    // Actual formatting happens through Monaco's formatDocument command
    // This is handled in the CodeEditor component
    setTimeout(() => setIsFormatting(false), 500);
    toast.success('Code formatted');
  }, []);

  return {
    codeInput,
    setCodeInput,
    isExecuting,
    codeOutput,
    isFormatting,
    executeCode,
    executeProject,
    formatCode
  };
}

export default useCodeExecution; 