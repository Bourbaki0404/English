import React, { useState, useRef, useEffect, useCallback } from 'react';

interface MarkdownBlock {
  id: string;
  type: 'bold' | 'italic' | 'link' | 'code' | 'highlight' | 'bracket' | 'header';
  start: number;
  end: number;
  rawText: string;
  innerText: string;
  level?: number;
}

interface ContentEditableEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTextSelection?: (text: string) => void;
  className?: string;
}

export default function ContentEditableEditor({ 
  content, 
  onChange, 
  onTextSelection,
  className = '' 
}: ContentEditableEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorBlockIds, setCursorBlockIds] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);

  // Update content ref when prop changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Parse markdown blocks
  const parseMarkdownBlocks = useCallback((text: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    let blockId = 0;

    // Headers
    text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content, offset) => {
      blocks.push({
        id: `header-${blockId++}`,
        type: 'header',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: content,
        level: hashes.length,
      });
      return match;
    });

    // Bold **text**
    text.replace(/\*\*(.*?)\*\*/g, (match, group, offset) => {
      blocks.push({
        id: `bold-${blockId++}`,
        type: 'bold',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: group,
      });
      return match;
    });

    // Italic *text* (not part of bold)
    text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (match, group, offset) => {
      blocks.push({
        id: `italic-${blockId++}`,
        type: 'italic',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: group,
      });
      return match;
    });

    // Links [text](url)
    text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url, offset) => {
      blocks.push({
        id: `link-${blockId++}`,
        type: 'link',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: linkText,
      });
      return match;
    });

    // Code `text`
    text.replace(/`([^`]+)`/g, (match, group, offset) => {
      blocks.push({
        id: `code-${blockId++}`,
        type: 'code',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: group,
      });
      return match;
    });

    // Highlight ==text==
    text.replace(/==(.*?)==/g, (match, group, offset) => {
      blocks.push({
        id: `highlight-${blockId++}`,
        type: 'highlight',
        start: offset,
        end: offset + match.length,
        rawText: match,
        innerText: group,
      });
      return match;
    });

    // Brackets [text]
    text.replace(/\[([^\]]+)\]/g, (match, group, offset) => {
      const nextChar = text[offset + match.length];
      if (nextChar !== '(') {
        blocks.push({
          id: `bracket-${blockId++}`,
          type: 'bracket',
          start: offset,
          end: offset + match.length,
          rawText: match,
          innerText: group,
        });
      }
      return match;
    });

    return blocks.sort((a, b) => a.start - b.start);
  }, []);

  // Get cursor position in text
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    
    return preCaretRange.toString().length;
  }, []);

  // Set cursor position in text
  const setCursorPosition = useCallback((position: number) => {
    if (!editorRef.current) return;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let node = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent?.length || 0;
      if (currentPos + nodeLength >= position) {
        const range = document.createRange();
        const selection = window.getSelection();
        const offset = position - currentPos;
        
        range.setStart(node, Math.min(offset, nodeLength));
        range.collapse(true);
        
        selection?.removeAllRanges();
        selection?.addRange(range);
        break;
      }
      currentPos += nodeLength;
      node = walker.nextNode();
    }
  }, []);

  // Handle cursor movement to update which blocks should show raw
  const handleSelectionChange = useCallback(() => {
    if (!isEditing) return;

    const cursorPos = getCursorPosition();
    const blocks = parseMarkdownBlocks(contentRef.current);
    const newCursorBlockIds = new Set<string>();

    blocks.forEach(block => {
      if (cursorPos >= block.start && cursorPos <= block.end) {
        newCursorBlockIds.add(block.id);
      }
    });

    setCursorBlockIds(newCursorBlockIds);
  }, [isEditing, getCursorPosition, parseMarkdownBlocks]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerText || '';
    contentRef.current = newContent;
    onChange(newContent);
  }, [onChange]);

  // Handle text selection for quiz generation
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString();
      onTextSelection?.(selectedText);
    }
  }, [onTextSelection]);

  // Handle clicks to enter edit mode
  const handleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 0);
    }
  }, [isEditing]);

  // Handle leaving edit mode
  const handleBlur = useCallback(() => {
    // Don't exit edit mode immediately, let user continue editing
    // setIsEditing(false);
  }, []);

  // Handle escape key to exit edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      editorRef.current?.blur();
    }
  }, []);

  // Set up selection change listener
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // Render content with mixed formatting
  const renderContent = useCallback(() => {
    const blocks = parseMarkdownBlocks(content);
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(b => b.type === 'header' && b.start >= lineStart && b.end <= lineEnd);
        const showRaw = block && cursorBlockIds.has(block.id);
        
        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const className = {
          1: 'text-2xl font-bold mb-4 mt-6',
          2: 'text-xl font-semibold mb-3 mt-5',
          3: 'text-lg font-semibold mb-2 mt-4',
          4: 'text-base font-semibold mb-2 mt-3',
          5: 'text-sm font-semibold mb-1 mt-2',
          6: 'text-xs font-semibold mb-1 mt-2'
        }[level] || 'text-base font-semibold mb-2 mt-3';

        return (
          <HeaderTag key={lineIndex} className={className}>
            {showRaw ? line : headerText}
          </HeaderTag>
        );
      }

      if (line.trim() === '') {
        return <div key={lineIndex} className="mb-2 min-h-[1em]"></div>;
      }

      // Get blocks for this line
      const lineBlocks = blocks.filter(
        (block) =>
          (block.start >= lineStart && block.start < lineEnd) ||
          (block.end > lineStart && block.end <= lineEnd) ||
          (block.start < lineStart && block.end > lineEnd)
      ).sort((a, b) => a.start - b.start);

      if (lineBlocks.length === 0) {
        return (
          <p key={lineIndex} className="mb-3 leading-relaxed">
            {line}
          </p>
        );
      }

      // Build line with mixed content
      const elements: React.ReactNode[] = [];
      let currentPos = 0;

      lineBlocks.forEach((block, blockIndex) => {
        const blockStartInLine = Math.max(0, block.start - lineStart);
        const blockEndInLine = Math.min(line.length, block.end - lineStart);

        // Add text before block
        if (blockStartInLine > currentPos) {
          const beforeText = line.substring(currentPos, blockStartInLine);
          elements.push(<span key={`before-${blockIndex}`}>{beforeText}</span>);
        }

        // Add block
        const showRaw = cursorBlockIds.has(block.id);
        
        if (showRaw) {
          elements.push(<span key={block.id}>{block.rawText}</span>);
        } else {
          let blockElement: React.ReactNode;
          
          switch (block.type) {
            case 'bold':
              blockElement = <strong key={block.id}>{block.innerText}</strong>;
              break;
            case 'italic':
              blockElement = <em key={block.id}>{block.innerText}</em>;
              break;
            case 'link':
              blockElement = (
                <a key={block.id} href="#" className="text-blue-600 underline">
                  {block.innerText}
                </a>
              );
              break;
            case 'code':
              blockElement = (
                <code key={block.id} className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">
                  {block.innerText}
                </code>
              );
              break;
            case 'highlight':
              blockElement = (
                <span key={block.id} className="bg-yellow-200 px-1 py-0.5 rounded">
                  {block.innerText}
                </span>
              );
              break;
            case 'bracket':
              blockElement = (
                <span key={block.id} className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">
                  [{block.innerText}]
                </span>
              );
              break;
            default:
              blockElement = <span key={block.id}>{block.innerText}</span>;
          }
          
          elements.push(blockElement);
        }

        currentPos = blockEndInLine;
      });

      // Add remaining text
      if (currentPos < line.length) {
        const afterText = line.substring(currentPos);
        elements.push(<span key="after">{afterText}</span>);
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  }, [content, cursorBlockIds, parseMarkdownBlocks]);

  return (
    <div className={`relative ${className}`}>
      {isEditing ? (
        <div
          ref={editorRef}
          className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors outline-none"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            fontSize: '16px',
            whiteSpace: 'pre-wrap'
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseUp={handleMouseUp}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
        />
      ) : (
        <div
          className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            fontSize: '16px',
          }}
          onClick={handleClick}
          onMouseUp={handleMouseUp}
        >
          {renderContent()}
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
            Click to edit
          </div>
        </div>
      )}
    </div>
  );
}
