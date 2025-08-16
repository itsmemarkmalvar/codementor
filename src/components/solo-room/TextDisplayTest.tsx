import React from 'react';

// Test component to verify text display solution
export const TextDisplayTest: React.FC = () => {
  const testMessages = [
    {
      id: 1,
      text: "This is a normal message that should display properly without any cropping issues.",
      sender: 'gemini' as const,
      timestamp: new Date()
    },
    {
      id: 2,
      text: "This is a very long message that contains a lot of text and should test the word wrapping capabilities of our bulletproof solution. It should handle long sentences and paragraphs without any horizontal overflow or text cropping issues.",
      sender: 'together' as const,
      timestamp: new Date()
    },
    {
      id: 3,
      text: "This message contains a very long word: supercalifragilisticexpialidocious and should still display properly without breaking the layout.",
      sender: 'gemini' as const,
      timestamp: new Date()
    },
    {
      id: 4,
      text: "This message contains code:\n\n```javascript\nfunction veryLongFunctionNameWithManyParameters(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {\n    return param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10;\n}\n```\n\nAnd should display the code block properly without horizontal overflow.",
      sender: 'together' as const,
      timestamp: new Date()
    },
    {
      id: 5,
      text: "This message contains a very long URL: https://www.verylongdomainname.com/very/long/path/to/some/resource/with/many/parameters?param1=value1&param2=value2&param3=value3&param4=value4&param5=value5",
      sender: 'gemini' as const,
      timestamp: new Date()
    }
  ];

  const parseMessageWithCodeBlocks = (text: string) => {
    if (!text) return [{ type: 'text', content: '' }];

    const parts = [];
    const codeBlockRegex = /```([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      parts.push({
        type: 'code',
        content: match[1].trim()
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts;
  };

  return (
    <div className="split-screen-chat p-4 bg-gray-900 min-h-screen">
      <h2 className="text-white text-xl font-bold mb-4">Text Display Test - Bulletproof Solution</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gemini Panel */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-3">Gemini AI Panel</h3>
          <div className="space-y-3">
            {testMessages.filter(msg => msg.sender === 'gemini').map((message) => {
              const parts = parseMessageWithCodeBlocks(message.text);
              return (
                <div key={message.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    G
                  </div>
                  <div className="message-bubble bg-blue-500/10 border border-blue-500/20 rounded-2xl px-3 py-2">
                    <div className="message-content">
                      {parts.map((part, partIndex) => {
                        if (part.type === 'code') {
                          return (
                            <div key={partIndex} className="my-2">
                              <pre className="bg-black/60 p-2 rounded-lg overflow-x-auto border border-white/20 max-h-32 overflow-y-auto">
                                <code className="text-xs font-mono text-gray-100">{part.content}</code>
                              </pre>
                            </div>
                          );
                        } else {
                          return (
                            <p key={partIndex} className="whitespace-pre-wrap text-xs leading-relaxed text-gray-100">
                              {part.content}
                            </p>
                          );
                        }
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Together AI Panel */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-3">Together AI Panel</h3>
          <div className="space-y-3">
            {testMessages.filter(msg => msg.sender === 'together').map((message) => {
              const parts = parseMessageWithCodeBlocks(message.text);
              return (
                <div key={message.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    T
                  </div>
                  <div className="message-bubble bg-green-500/10 border border-green-500/20 rounded-2xl px-3 py-2">
                    <div className="message-content">
                      {parts.map((part, partIndex) => {
                        if (part.type === 'code') {
                          return (
                            <div key={partIndex} className="my-2">
                              <pre className="bg-black/60 p-2 rounded-lg overflow-x-auto border border-white/20 max-h-32 overflow-y-auto">
                                <code className="text-xs font-mono text-gray-100">{part.content}</code>
                              </pre>
                            </div>
                          );
                        } else {
                          return (
                            <p key={partIndex} className="whitespace-pre-wrap text-xs leading-relaxed text-gray-100">
                              {part.content}
                            </p>
                          );
                        }
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white font-semibold mb-2">Test Results:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>✅ Normal text messages should display without cropping</li>
          <li>✅ Long paragraphs should wrap properly</li>
          <li>✅ Very long words should break appropriately</li>
          <li>✅ Code blocks should have horizontal scroll if needed</li>
          <li>✅ Long URLs should wrap without breaking layout</li>
          <li>✅ Both panels should maintain consistent spacing</li>
        </ul>
      </div>
    </div>
  );
};
