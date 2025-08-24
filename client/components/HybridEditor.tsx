import React, { useState, useRef, useCallback } from "react";

interface HybridEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTextSelection?: (text: string) => void;
  className?: string;
}

export default function HybridEditor({
  content,
  onChange,
  onTextSelection,
  className = "",
}: HybridEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleTextSelection = useCallback(() => {
    if (onTextSelection && textareaRef.current) {
      const selection = textareaRef.current.value.substring(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      );
      if (selection) {
        onTextSelection(selection);
      }
    }
  }, [onTextSelection]);

  // Simple markdown parser for preview
  const parseMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">$1</code>')
      .replace(/==(.*?)==/g, '<span class="bg-yellow-200 px-1 py-0.5 rounded">$1</span>')
      .replace(/\[([^\]]+)\]/g, '<span class="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">[$1]</span>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`relative border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 text-sm rounded ${
              !isPreview
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 text-sm rounded ${
              isPreview
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            预览
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Markdown Editor
        </div>
      </div>

      {/* Content Area */}
      <div className="relative" style={{ height: "600px" }}>
        {isPreview ? (
          // Preview mode
          <div
            className="p-4 h-full overflow-auto prose prose-lg max-w-none"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: "1.6",
            }}
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(content) || '<p class="text-gray-400">暂无内容...</p>',
            }}
          />
        ) : (
          // Edit mode
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onSelect={handleTextSelection}
            onMouseUp={handleTextSelection}
            placeholder="在这里开始写 Markdown..."
            className="w-full h-full p-4 border-none resize-none focus:outline-none"
            style={{
              fontFamily: "system-ui, -apple-system, Menlo, Monaco, 'Courier New', monospace",
              fontSize: "16px",
              lineHeight: "1.6",
              backgroundColor: "transparent",
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-xs text-gray-500">
        <div>
          {content.length} 字符
        </div>
        <div>
          {isPreview ? "预览模式" : "编辑模式"}
        </div>
      </div>
    </div>
  );
}
