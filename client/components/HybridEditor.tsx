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
    let html = markdown;
    
    // Headers (h1-h6)
    html = html.replace(/^#{6}\s+(.*)$/gim, '<h6 class="text-sm font-semibold mb-1 mt-2 text-gray-700">$1</h6>');
    html = html.replace(/^#{5}\s+(.*)$/gim, '<h5 class="text-base font-semibold mb-2 mt-3 text-gray-700">$1</h5>');
    html = html.replace(/^#{4}\s+(.*)$/gim, '<h4 class="text-lg font-semibold mb-2 mt-4 text-gray-800">$1</h4>');
    html = html.replace(/^#{3}\s+(.*)$/gim, '<h3 class="text-xl font-semibold mb-3 mt-5">$1</h3>');
    html = html.replace(/^#{2}\s+(.*)$/gim, '<h2 class="text-2xl font-semibold mb-4 mt-6">$1</h2>');
    html = html.replace(/^#{1}\s+(.*)$/gim, '<h1 class="text-3xl font-bold mb-6 mt-8">$1</h1>');
    
    // Code blocks (```language...```)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || '';
      return `<pre class="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code class="text-sm font-mono block language-${language}">${code.trim()}</code></pre>`;
    });
    
    // Blockquotes (> text)
    html = html.replace(/^>\s+(.*)$/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 italic text-gray-700">$1</blockquote>');
    
    // Horizontal rules (--- or ***)
    html = html.replace(/^(---|\*\*\*)$/gim, '<hr class="border-gray-300 my-6">');
    
    // Task lists (- [ ] item, - [x] item)
    html = html.replace(/^-\s+\[\s\]\s+(.*)$/gim, '<div class="flex items-center my-1"><input type="checkbox" disabled class="mr-2"><span>$1</span></div>');
    html = html.replace(/^-\s+\[x\]\s+(.*)$/gim, '<div class="flex items-center my-1"><input type="checkbox" checked disabled class="mr-2"><span class="line-through text-gray-500">$1</span></div>');
    
    // Unordered lists (- item, * item)
    html = html.replace(/^[-*]\s+(.*)$/gim, '<li class="ml-6 list-disc my-1">$1</li>');
    
    // Ordered lists (1. item)
    html = html.replace(/^\d+\.\s+(.*)$/gim, '<li class="ml-6 list-decimal my-1">$1</li>');
    
    // Wrap consecutive list items in ul/ol tags
    html = html.replace(/(<li class="ml-6 list-disc[^>]*>.*?<\/li>(?:\s*<li class="ml-6 list-disc[^>]*>.*?<\/li>)*)/gim, '<ul class="my-3">$1</ul>');
    html = html.replace(/(<li class="ml-6 list-decimal[^>]*>.*?<\/li>(?:\s*<li class="ml-6 list-decimal[^>]*>.*?<\/li>)*)/gim, '<ol class="my-3">$1</ol>');
    
    // Tables (| col1 | col2 |)
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
      const cellElements = cells.map(cell => `<td class="border border-gray-300 px-3 py-2">${cell}</td>`).join('');
      return `<tr>${cellElements}</tr>`;
    });
    html = html.replace(/(<tr>.*?<\/tr>(?:\s*<tr>.*?<\/tr>)*)/gim, '<table class="border-collapse border border-gray-300 my-4 w-full">$1</table>');
    
    // Images (![alt](url))
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto my-4 rounded-lg shadow-sm">');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800">$1</a>');
    
    // Bold and Italic combinations (***text***)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    
    // Bold (**text** or __text__)
    html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500">$1</del>');
    
    // Inline code (`text`)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-red-600">$1</code>');
    
    // Highlight (==text==)
    html = html.replace(/==(.*?)==/g, '<mark class="bg-yellow-200 px-1 py-0.5 rounded">$1</mark>');
    
    // Brackets [text] (custom syntax)
    html = html.replace(/\[([^\]]+)\]/g, '<span class="text-purple-600 bg-purple-100 px-2 py-1 rounded-full text-sm font-medium">$1</span>');
    
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
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1');
    
    // Code blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*class="[^"]*language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gi, '```$1\n$2\n```');
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```');
    
    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1');
    
    // Horizontal rules
    markdown = markdown.replace(/<hr[^>]*>/gi, '---');
    
    // Task lists
    markdown = markdown.replace(/<div[^>]*><input type="checkbox" checked[^>]*><span[^>]*>(.*?)<\/span><\/div>/gi, '- [x] $1');
    markdown = markdown.replace(/<div[^>]*><input type="checkbox"[^>]*><span[^>]*>(.*?)<\/span><\/div>/gi, '- [ ] $1');
    
    // Lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1');
    });
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1`);
    });
    
    // Tables
    markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gi, (match, content) => {
      return content.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (rowMatch, rowContent) => {
        const cells = rowContent.replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ').trim();
        return cells + '|';
      });
    });
    
    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Bold and Italic combinations
    markdown = markdown.replace(/<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/gi, '***$1***');
    
    // Bold
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    
    // Italic
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    
    // Strikethrough
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    
    // Inline code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Highlight
    markdown = markdown.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==');
    
    // Custom brackets
    markdown = markdown.replace(/<span class="text-purple-600[^>]*>(.*?)<\/span>/gi, '[$1]');
    
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
        data-placeholder={content.trim() === '' ? "点击开始编写 Markdown..." : ""}
      />
      
      {content.trim() === '' && (
        <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
          <div className="space-y-2 text-sm">
            <div>点击开始编写 Markdown...</div>
            <div className="text-xs text-gray-300">
              支持: 标题 # ## ###, **粗体**, *斜体*, ~~删除线~~, `代码`, ==高亮==, 
              <br />
              列表 - 项目, 任务 - [ ] 待办, 引用 > 文字, 表格, 图片等
            </div>
          </div>
        </div>
      )}
      
      {isEditing && (
        <div className="absolute bottom-4 right-4 text-xs text-blue-600 bg-white px-3 py-2 rounded-lg shadow border">
          <div className="font-medium">编辑模式</div>
          <div className="text-gray-500 mt-1">ESC 或点击外部完成编辑</div>
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