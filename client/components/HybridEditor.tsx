import React, { useState, useRef, useEffect, useCallback } from "react";
import { Edit3 } from "lucide-react";

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
  const [showRawText, setShowRawText] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML for display (only supported syntax)
  const markdownToHtml = useCallback((markdown: string) => {
    let html = markdown;

    // Code blocks (```...```)
    html = html.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code class="text-sm font-mono block">$1</code></pre>',
    );

    // Bold and Italic combinations (***text***)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");

    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic (*text*)
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Strikethrough (~~text~~)
    html = html.replace(
      /~~(.*?)~~/g,
      '<del class="line-through text-gray-500">$1</del>',
    );

    // Highlight ==text==
    html = html.replace(
      /==(.*?)==/g,
      '<mark class="bg-yellow-200 px-1 py-0.5 rounded">$1</mark>',
    );

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  }, []);

  // Convert HTML back to markdown
  const htmlToMarkdown = useCallback((html: string) => {
    let markdown = html;

    // Code blocks
    markdown = markdown.replace(
      /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi,
      "```\n$1\n```",
    );

    // Bold and Italic combinations
    markdown = markdown.replace(
      /<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/gi,
      "***$1***",
    );

    // Bold
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");

    // Italic
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");

    // Strikethrough
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, "~~$1~~");

    // Highlight
    markdown = markdown.replace(/<mark[^>]*>(.*?)<\/mark>/gi, "==$1==");

    // Clean up
    markdown = markdown.replace(/<br\s*\/?>/gi, "\n");
    markdown = markdown.replace(/<div[^>]*>/gi, "\n");
    markdown = markdown.replace(/<\/div>/gi, "");
    markdown = markdown.replace(/<p[^>]*>/gi, "");
    markdown = markdown.replace(/<\/p>/gi, "\n");
    markdown = markdown.replace(/\n\n+/g, "\n\n");
    markdown = markdown.trim();

    return markdown;
  }, []);


  // Update HTML when content changes
  useEffect(() => {
    if (!isEditing) {
      setHtmlContent(markdownToHtml(content));
    }
  }, [content, markdownToHtml, isEditing]);

  // Toggle between raw text and preview mode
  const toggleMode = useCallback(() => {
    setShowRawText(!showRawText);
    if (isEditing && editorRef.current) {
      // Save current content before switching modes
      const newHtml = editorRef.current.innerHTML;
      const newMarkdown = htmlToMarkdown(newHtml);
      onChange(newMarkdown);
    }
  }, [showRawText, isEditing, htmlToMarkdown, onChange]);

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
      setHtmlContent(markdownToHtml(newMarkdown));
    }
  }, [htmlToMarkdown, markdownToHtml, onChange]);

  // Handle text selection for callback
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim() && onTextSelection) {
      onTextSelection(sel.toString().trim());
    }
  }, [onTextSelection]);

  return (
    <div className={`relative ${className}`}>
      {showRawText ? (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[600px] p-6 focus:outline-none rounded-lg transition-all resize-none font-mono text-sm border-0 bg-transparent"
          style={{
            fontFamily: "'Fira Code', 'SF Mono', Consolas, monospace",
            lineHeight: "1.5",
          }}
          placeholder="Type your markdown here..."
        />
      ) : (
        <div
          ref={editorRef}
          className="prose prose-lg max-w-none min-h-[600px] p-6 focus:outline-none rounded-lg transition-all"
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: "1.7",
            fontSize: "16px",
            width: "100%",
          }}
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseUp={handleMouseUp}
          data-placeholder={
            content.trim() === "" ? "Click to start writing..." : ""
          }
        />
      )}

      {content.trim() === "" && !showRawText && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          <div className="space-y-2 text-sm">
            <div>Click to start writing...</div>
            <div className="text-xs text-gray-300">
              Supports: **bold**, *italic*, ~~strikethrough~~, ==highlight==, ```code blocks```
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleMode}
        className="absolute bottom-4 right-4 w-10 h-10 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center group"
        title={showRawText ? "Switch to preview mode" : "Switch to raw text mode"}
      >
        <Edit3
          size={16}
          className={`transition-colors duration-200 ${
            showRawText
              ? "text-blue-600"
              : "text-gray-500 group-hover:text-gray-700"
          }`}
        />
      </button>

      <style jsx>{`
        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        [contenteditable="true"]:focus:before {
          content: none;
        }

        /* Custom scrollbar */
        [contenteditable="true"] {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        [contenteditable="true"]::-webkit-scrollbar {
          width: 8px;
        }

        [contenteditable="true"]::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        [contenteditable="true"]::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        [contenteditable="true"]::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
