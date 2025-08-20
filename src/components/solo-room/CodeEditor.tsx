import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Loader, Play, RotateCw, Bug, Square } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: any;
  isExecuting?: boolean;
  onRun?: () => void;
  onFormat?: () => void;
  output?: {
    stdout: string;
    stderr: string;
    executionTime: number;
  } | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'java',
  theme = 'vs-dark',
  options = {},
  isExecuting = false,
  onRun,
  onFormat,
  output
}) => {
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  
  // Default editor options
  const defaultOptions = {
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 14,
    lineHeight: 1.5,
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true
  };
  
  // Combine default options with provided options
  const editorOptions = { ...defaultOptions, ...options };

  // Handle editor initialization
  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);
    
    // Setup auto-completion for Java
    if (language === 'java') {
      monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems: (model: any, position: any) => {
          const suggestions = [
            {
              label: 'sout',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'System.out.println(${1:});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Print to standard output'
            },
            {
              label: 'fori',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'For loop with index'
            },
            {
              label: 'psvm',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'public static void main(String[] args) {\n\t${1:}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Public static void main method'
            },
            {
              label: 'trycatch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'try {\n\t${1:}\n} catch (${2:Exception} e) {\n\t${3:e.printStackTrace();}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Try-catch block'
            }
          ];
          
          // Add common Java classes and methods
          ['String', 'Integer', 'Boolean', 'ArrayList', 'HashMap', 'List', 'Map', 'Math'].forEach(className => {
            suggestions.push({
              label: className,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: className,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: `Java ${className} class`
            });
          });
          
          return { suggestions };
        }
      });
    }
    
    // Setup command for formatting
    if (onFormat) {
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument').run();
        onFormat();
      });
    }
  };

  // Format the output message to add color coding
  const formatOutput = (text: string, isError: boolean = false) => {
    if (!text) return <span className="text-gray-500">No output</span>;
    
    return (
      <span className={isError ? "text-red-400" : "text-green-400"}>
        {text}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-400 mr-2">
            {language === 'java' ? 'Java' : language.toUpperCase()}
          </span>
        </div>
        
        <div className="flex space-x-2">
          {onFormat && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onFormat}
              title="Format code (Alt+Shift+F)"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
          
          {onRun && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onRun}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700"
              title="Execute code via Judge0 API"
            >
              {isExecuting ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-1">Run</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-grow">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={(value) => onChange(value || '')}
          options={editorOptions}
          onMount={handleEditorDidMount}
          loading={
            <div className="h-full w-full flex items-center justify-center bg-[#1E1E1E]">
              <Loader className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          }
        />
      </div>
      
      {/* Output panel */}
      {output !== undefined && (
        <Card className="border-t border-gray-800 bg-gray-900/80 overflow-auto" style={{ maxHeight: '25%', minHeight: '120px' }}>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Output</h3>
              {output?.executionTime !== undefined && (
                <span className="text-xs text-gray-500">
                  Execution time: {output.executionTime}ms
                </span>
              )}
            </div>
            
            <div className="font-mono text-sm overflow-auto max-h-32">
              {output ? (
                <>
                  {output.stdout && (
                    <div className="mb-2">
                      <pre className="whitespace-pre-wrap">{formatOutput(output.stdout)}</pre>
                    </div>
                  )}
                  
                  {output.stderr && (
                    <div>
                      <pre className="whitespace-pre-wrap">{formatOutput(output.stderr, true)}</pre>
                    </div>
                  )}
                  
                  {!output.stdout && !output.stderr && (
                    <span className="text-gray-500">No output</span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">Run your code to see output</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CodeEditor; 