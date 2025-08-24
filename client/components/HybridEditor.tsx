import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  X,
} from "lucide-react";

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
  const [selectedText, setSelectedText] = useState("");
  const [selection, setSelection] = useState<Range | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML for display (only closed syntax)
  const markdownToHtml = useCallback((markdown: string) => {
    let html = markdown;

    // Headers (h1-h6)
    html = html.replace(
      /^#{6}\s+(.*)$/gim,
      '<h6 class="text-sm font-semibold mb-2 mt-3">$1</h6>',
    );
    html = html.replace(
      /^#{5}\s+(.*)$/gim,
      '<h5 class="text-base font-semibold mb-2 mt-3">$1</h5>',
    );
    html = html.replace(
      /^#{4}\s+(.*)$/gim,
      '<h4 class="text-lg font-semibold mb-3 mt-4">$1</h4>',
    );
    html = html.replace(
      /^#{3}\s+(.*)$/gim,
      '<h3 class="text-xl font-semibold mb-3 mt-5">$1</h3>',
    );
    html = html.replace(
      /^#{2}\s+(.*)$/gim,
      '<h2 class="text-2xl font-semibold mb-4 mt-6">$1</h2>',
    );
    html = html.replace(
      /^#{1}\s+(.*)$/gim,
      '<h1 class="text-3xl font-bold mb-6 mt-8">$1</h1>',
    );

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

    // Inline code (`text`)
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-red-600">$1</code>',
    );


    // Line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  }, []);

  // Convert HTML back to markdown
  const htmlToMarkdown = useCallback((html: string) => {
    let markdown = html;

    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1");
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1");
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1");
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1");
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1");
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1");

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

    // Inline code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");


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

  // Calculate toolbar position based on selection
  const calculateToolbarPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    // Position toolbar below the selection
    const x = rect.left + rect.width / 2 - editorRect.left;
    const y = rect.bottom - editorRect.top + 8; // 8px gap below selection

    setToolbarPosition({ x, y });
  }, []);

  // Handle clicks outside toolbar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking inside toolbar or its dropdowns
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking inside editor and there's still selected text
      if (editorRef.current && editorRef.current.contains(target)) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          return;
        }
      }

      // Close toolbar and clear selection
      setShowToolbar(false);
      setSelectedText("");
      setSelection(null);
    };

    if (showToolbar) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showToolbar]);

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
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't blur if clicking on toolbar
      if (
        toolbarRef.current &&
        toolbarRef.current.contains(e.relatedTarget as Node)
      ) {
        return;
      }

      // Small delay to allow toolbar interactions
      setTimeout(() => {
        if (!showToolbar) {
          setIsEditing(false);
          if (editorRef.current) {
            const newHtml = editorRef.current.innerHTML;
            const newMarkdown = htmlToMarkdown(newHtml);
            onChange(newMarkdown);
            setHtmlContent(markdownToHtml(newMarkdown));
          }
        }
      }, 100);
    },
    [htmlToMarkdown, markdownToHtml, onChange, showToolbar],
  );

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      const selectedTextValue = sel.toString().trim();
      setSelectedText(selectedTextValue);
      setSelection(sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
      setShowToolbar(true);
      calculateToolbarPosition();
      if (onTextSelection) {
        onTextSelection(selectedTextValue);
      }
    } else {
      setSelectedText("");
      setSelection(null);
      setShowToolbar(false);
    }
  }, [onTextSelection, calculateToolbarPosition]);

  // Apply formatting to selected text
  const applyFormatting = useCallback(
    (type: string, value?: string) => {
      if (!selection || !selectedText) return;

      const selectedRange = selection.cloneRange();
      let newText = selectedText;

      switch (type) {
        case "bold":
          newText = `**${selectedText}**`;
          break;
        case "italic":
          newText = `*${selectedText}*`;
          break;
      }

      // Replace selected text
      selectedRange.deleteContents();
      selectedRange.insertNode(document.createTextNode(newText));

      // Update content
      if (editorRef.current) {
        const newHtml = editorRef.current.innerHTML;
        const newMarkdown = htmlToMarkdown(newHtml);
        onChange(newMarkdown);
        setHtmlContent(markdownToHtml(newMarkdown));
      }

      // Don't clear selection immediately - let user continue formatting

      // Keep focus on editor
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    [selection, selectedText, htmlToMarkdown, markdownToHtml, onChange],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowToolbar(false);
      setSelectedText("");
      setSelection(null);
    }
  }, []);

  // Prevent toolbar from losing focus when clicking buttons
  const handleToolbarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Formatting Toolbar - positioned near selected text */}
      {isEditing && selectedText && showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center space-x-2 z-50"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
            transform: "translateX(-50%)",
          }}
          onMouseDown={handleToolbarMouseDown}
        >
          {/* Bold */}
          <button
            onClick={() => applyFormatting("bold")}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Bold"
          >
            <Bold size={18} />
          </button>

          {/* Italic */}
          <button
            onClick={() => applyFormatting("italic")}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Italic"
          >
            <Italic size={18} />
          </button>


          <div className="w-px h-6 bg-gray-300" />

          {/* Close */}
          <button
            onClick={() => {
              setShowToolbar(false);
              setSelectedText("");
              setSelection(null);
            }}
            className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-500"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        ref={editorRef}
        className="prose prose-lg max-w-none min-h-[600px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg transition-all"
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
        onKeyDown={handleKeyDown}
        data-placeholder={
          content.trim() === "" ? "Click to start writing..." : ""
        }
      />

      {content.trim() === "" && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          <div className="space-y-2 text-sm">
            <div>Click to start writing...</div>
            <div className="text-xs text-gray-300">
              Supports: Headers #, **bold**, *italic*, ~~strikethrough~~,
              <br />
              `code`, and ```code blocks```
            </div>
          </div>
        </div>
      )}

      {isEditing && !selectedText && (
        <div className="absolute bottom-4 right-4 text-xs text-blue-600 bg-white px-3 py-2 rounded-lg shadow border">
          <div className="font-medium">Edit Mode</div>
          <div className="text-gray-500 mt-1">
            Select text to show formatting toolbar
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
