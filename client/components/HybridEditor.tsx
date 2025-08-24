import React, { useState, useRef, useEffect, useCallback } from "react";

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
  const [htmlContent, setHtmlContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML for display
  const markdownToHtml = useCallback((markdown: string) => {
    return markdown
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6 mt-8">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-4 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-3 mt-5">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">$1</code>')
      .replace(/==(.*?)==/g, '<span class="bg-yellow-200 px-1 py-0.5 rounded">$1</span>')
      .replace(/\[([^\]]+)\]/g, '<span class="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">[$1]</span>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/\n/g, '<br>');
  }, []);

  // Convert HTML back to markdown
  const htmlToMarkdown = useCallback((html: string) => {
    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1') 
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<span class="bg-yellow-200[^>]*>(.*?)<\/span>/gi, '==$1==')
      .replace(/<span class="text-purple-600[^>]*>\[(.*?)\]<\/span>/gi, '[$1]')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    return markdown;
  }, []);

  // Update HTML when content changes
  useEffect(() => {
    if (!isEditing) {
      setHtmlContent(markdownToHtml(content));
    }
  }, [content, markdownToHtml, isEditing]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current && isEditing) {
      const newHtml = editorRef.current.innerHTML;
      const newMarkdown = htmlToMarkdown(newHtml);
      onChange(newMarkdown);
    }
  }, [isEditing, htmlToMarkdown, onChange]);

  // Handle focus (start editing)
  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle blur (stop editing)
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      const newMarkdown = htmlToMarkdown(newHtml);
      onChange(newMarkdown);
      // Update display
      setHtmlContent(markdownToHtml(newMarkdown));
    }
  }, [htmlToMarkdown, markdownToHtml, onChange]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (onTextSelection) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        onTextSelection(selection.toString());
      }
    }
  }, [onTextSelection]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      editorRef.current?.blur();
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={editorRef}
        className="prose prose-lg max-w-none min-h-[600px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg transition-all"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: "1.7",
          fontSize: "16px",
        }}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        data-placeholder={content.trim() === '' ? "点击开始编写..." : ""}
      />
      
      {content.trim() === '' && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          点击开始编写...
        </div>
      )}
      
      {isEditing && (
        <div className="absolute bottom-4 right-4 text-xs text-blue-600 bg-white px-2 py-1 rounded shadow">
          按 ESC 或点击外部完成编辑
        </div>
      )}

      <style jsx>{`
        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable="true"]:focus:before {
          content: none;
        }
      `}</style>
    </div>
  );
}
