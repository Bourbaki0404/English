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

      {content.trim() === "" && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          <div className="space-y-2 text-sm">
            <div>Click to start writing...</div>
            <div className="text-xs text-gray-300">
              Supports: **bold**, *italic*, ~~strikethrough~~, ==highlight==, ```code blocks```
            </div>
          </div>
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
