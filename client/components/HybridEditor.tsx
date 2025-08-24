import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  Highlighter, 
  Palette,
  Type,
  X 
} from "lucide-react";

interface HybridEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTextSelection?: (text: string) => void;
  className?: string;
}

const TEXT_COLORS = [
  { name: "默认", value: "", class: "" },
  { name: "红色", value: "red", class: "text-red-600" },
  { name: "蓝色", value: "blue", class: "text-blue-600" },
  { name: "绿色", value: "green", class: "text-green-600" },
  { name: "紫色", value: "purple", class: "text-purple-600" },
  { name: "橙色", value: "orange", class: "text-orange-600" },
  { name: "粉色", value: "pink", class: "text-pink-600" },
  { name: "灰色", value: "gray", class: "text-gray-600" },
];

const HIGHLIGHT_COLORS = [
  { name: "无高亮", value: "", class: "" },
  { name: "黄色", value: "yellow", class: "bg-yellow-200" },
  { name: "绿色", value: "green", class: "bg-green-200" },
  { name: "蓝色", value: "blue", class: "bg-blue-200" },
  { name: "紫色", value: "purple", class: "bg-purple-200" },
  { name: "粉色", value: "pink", class: "bg-pink-200" },
  { name: "橙色", value: "orange", class: "bg-orange-200" },
];

export default function HybridEditor({
  content,
  onChange,
  onTextSelection,
  className = "",
}: HybridEditorProps) {
  const [htmlContent, setHtmlContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selection, setSelection] = useState<Range | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML for display (只保留封闭语法)
  const markdownToHtml = useCallback((markdown: string) => {
    let html = markdown;
    
    // Headers (h1-h3 only, 简化)
    html = html.replace(/^#{3}\s+(.*)$/gim, '<h3 class="text-xl font-semibold mb-3 mt-5">$1</h3>');
    html = html.replace(/^#{2}\s+(.*)$/gim, '<h2 class="text-2xl font-semibold mb-4 mt-6">$1</h2>');
    html = html.replace(/^#{1}\s+(.*)$/gim, '<h1 class="text-3xl font-bold mb-6 mt-8">$1</h1>');
    
    // Code blocks (```...```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code class="text-sm font-mono block">$1</code></pre>');
    
    // Bold and Italic combinations (***text***)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    
    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Underline (__text__)
    html = html.replace(/__(.*?)__/g, '<u class="underline">$1</u>');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500">$1</del>');
    
    // Inline code (`text`)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-red-600">$1</code>');
    
    // Colored text {color:text}
    html = html.replace(/\{(\w+):(.*?)\}/g, '<span class="text-$1-600">$2</span>');
    
    // Highlight with colors {highlight-color:text}
    html = html.replace(/\{highlight-(\w+):(.*?)\}/g, '<span class="bg-$1-200 px-1 py-0.5 rounded">$2</span>');
    
    // Default highlight ==text==
    html = html.replace(/==(.*?)==/g, '<mark class="bg-yellow-200 px-1 py-0.5 rounded">$1</mark>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }, []);

  // Convert HTML back to markdown
  const htmlToMarkdown = useCallback((html: string) => {
    let markdown = html;
    
    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1');
    
    // Code blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```');
    
    // Bold and Italic combinations
    markdown = markdown.replace(/<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/gi, '***$1***');
    
    // Bold
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    
    // Italic
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    
    // Underline
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
    
    // Strikethrough
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    
    // Inline code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Colored text
    markdown = markdown.replace(/<span class="text-(\w+)-600[^>]*>(.*?)<\/span>/gi, '{$1:$2}');
    
    // Highlight with colors
    markdown = markdown.replace(/<span class="bg-(\w+)-200[^>]*>(.*?)<\/span>/gi, '{highlight-$1:$2}');
    
    // Default highlight
    markdown = markdown.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==');
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Clean up
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<div[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/div>/gi, '');
    markdown = markdown.replace(/<p[^>]*>/gi, '');
    markdown = markdown.replace(/<\/p>/gi, '\n');
    markdown = markdown.replace(/\n\n+/g, '\n\n');
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
    // 延迟失焦，给工具栏操作时间
    setTimeout(() => {
      if (!showColorPicker && !showHighlightPicker) {
        setIsEditing(false);
        if (editorRef.current) {
          const newHtml = editorRef.current.innerHTML;
          const newMarkdown = htmlToMarkdown(newHtml);
          onChange(newMarkdown);
          setHtmlContent(markdownToHtml(newMarkdown));
        }
      }
    }, 200);
  }, [htmlToMarkdown, markdownToHtml, onChange, showColorPicker, showHighlightPicker]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      setSelectedText(sel.toString());
      setSelection(sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
      if (onTextSelection) {
        onTextSelection(sel.toString());
      }
    } else {
      setSelectedText("");
      setSelection(null);
    }
  }, [onTextSelection]);

  // Apply formatting to selected text
  const applyFormatting = useCallback((type: string, value?: string) => {
    if (!selection || !selectedText) return;

    const selectedRange = selection;
    let newText = selectedText;

    switch (type) {
      case 'bold':
        newText = `**${selectedText}**`;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        break;
      case 'underline':
        newText = `__${selectedText}__`;
        break;
      case 'highlight':
        newText = value ? `{highlight-${value}:${selectedText}}` : `==${selectedText}==`;
        break;
      case 'color':
        newText = value ? `{${value}:${selectedText}}` : selectedText;
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

    // Clear selection
    setSelectedText("");
    setSelection(null);
    setShowColorPicker(false);
    setShowHighlightPicker(false);
  }, [selection, selectedText, htmlToMarkdown, markdownToHtml, onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      editorRef.current?.blur();
      setShowColorPicker(false);
      setShowHighlightPicker(false);
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Formatting Toolbar */}
      {isEditing && selectedText && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center space-x-2 z-50">
          {/* Bold */}
          <button
            onClick={() => applyFormatting('bold')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="粗体"
          >
            <Bold size={18} />
          </button>

          {/* Italic */}
          <button
            onClick={() => applyFormatting('italic')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="斜体"
          >
            <Italic size={18} />
          </button>

          {/* Underline */}
          <button
            onClick={() => applyFormatting('underline')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="下划线"
          >
            <Underline size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300" />

          {/* Text Color */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
              }}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="文字颜色"
            >
              <Type size={18} />
            </button>

            {showColorPicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 min-w-[200px]">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => applyFormatting('color', color.value)}
                    className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${color.class}`}
                    title={color.name}
                  >
                    文字
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
              }}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="高亮"
            >
              <Highlighter size={18} />
            </button>

            {showHighlightPicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1 min-w-[180px]">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => applyFormatting('highlight', color.value)}
                    className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${color.class}`}
                    title={color.name}
                  >
                    高亮
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Close */}
          <button
            onClick={() => {
              setSelectedText("");
              setSelection(null);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-500"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        ref={editorRef}
        className="prose prose-lg max-w-none min-h-[600px] p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg transition-all border border-gray-200"
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
        data-placeholder={content.trim() === '' ? "点击开始编写..." : ""}
      />
      
      {content.trim() === '' && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          <div className="space-y-2 text-sm">
            <div>点击开始编写...</div>
            <div className="text-xs text-gray-300">
              支持: 标题 # ## ###, **粗体**, *斜体*, __下划线__, ~~删除线~~, 
              <br />
              `代码`, ==高亮==, 彩色文字, 链接等
            </div>
          </div>
        </div>
      )}
      
      {isEditing && !selectedText && (
        <div className="absolute bottom-4 right-4 text-xs text-blue-600 bg-white px-3 py-2 rounded-lg shadow border">
          <div className="font-medium">编辑模式</div>
          <div className="text-gray-500 mt-1">选择文字显示格式工具栏</div>
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
