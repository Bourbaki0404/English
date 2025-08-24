import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CursorPosition {
  start: number;
  end: number;
}

interface MarkdownBlock {
  id: string;
  type: 'bold' | 'italic' | 'link' | 'code' | 'highlight' | 'bracket' | 'header' | 'text';
  start: number;
  end: number;
  rawText: string;
  innerText: string;
  level?: number; // for headers
}

interface ObsidianLikeEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTextSelection?: (text: string) => void;
  className?: string;
}

export default function ObsidianLikeEditor({ 
  content, 
  onChange, 
  onTextSelection,
  className = '' 
}: ObsidianLikeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

  // Parse markdown to identify format blocks
  const parseMarkdownBlocks = useCallback((text: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    let blockId = 0;

    // Headers (# ## ###)
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

    // Italic *text*
    text.replace(/\*(.*?)\*/g, (match, group, offset) => {
      // Skip if it's part of a bold (**text**)
      const isBold = text.substring(Math.max(0, offset - 1), offset + match.length + 1).includes('**');
      if (!isBold) {
        blocks.push({
          id: `italic-${blockId++}`,
          type: 'italic',
          start: offset,
          end: offset + match.length,
          rawText: match,
          innerText: group,
        });
      }
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

    // Inline code `text`
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

    // Bracket annotations [text]
    text.replace(/\[([^\]]+)\]/g, (match, group, offset) => {
      // Skip if it's part of a link
      const nextChar = text[offset + match.length];
      const isLink = nextChar === '(';
      if (!isLink) {
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

  // Check if cursor is within a specific block
  const isCursorInBlock = useCallback((block: MarkdownBlock, cursor: CursorPosition): boolean => {
    return (cursor.start >= block.start && cursor.start <= block.end) ||
           (cursor.end >= block.start && cursor.end <= block.end) ||
           (cursor.start <= block.start && cursor.end >= block.end);
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditing) return;

    e.preventDefault();
    let newContent = content;
    let newCursor = { ...cursorPosition };

    if (e.key === 'Escape') {
      setIsEditing(false);
      return;
    }

    if (e.key === 'Backspace') {
      if (cursorPosition.start === cursorPosition.end) {
        // Single character delete
        if (cursorPosition.start > 0) {
          newContent = content.slice(0, cursorPosition.start - 1) + content.slice(cursorPosition.start);
          newCursor = { start: cursorPosition.start - 1, end: cursorPosition.start - 1 };
        }
      } else {
        // Delete selection
        newContent = content.slice(0, cursorPosition.start) + content.slice(cursorPosition.end);
        newCursor = { start: cursorPosition.start, end: cursorPosition.start };
      }
    } else if (e.key === 'Delete') {
      if (cursorPosition.start === cursorPosition.end) {
        // Single character delete forward
        if (cursorPosition.start < content.length) {
          newContent = content.slice(0, cursorPosition.start) + content.slice(cursorPosition.start + 1);
        }
      } else {
        // Delete selection
        newContent = content.slice(0, cursorPosition.start) + content.slice(cursorPosition.end);
        newCursor = { start: cursorPosition.start, end: cursorPosition.start };
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.shiftKey) {
        newCursor = { start: cursorPosition.start, end: Math.max(0, cursorPosition.end - 1) };
      } else {
        const pos = cursorPosition.start === cursorPosition.end 
          ? Math.max(0, cursorPosition.start - 1)
          : cursorPosition.start;
        newCursor = { start: pos, end: pos };
      }
    } else if (e.key === 'ArrowRight') {
      if (e.shiftKey) {
        newCursor = { start: cursorPosition.start, end: Math.min(content.length, cursorPosition.end + 1) };
      } else {
        const pos = cursorPosition.start === cursorPosition.end 
          ? Math.min(content.length, cursorPosition.end + 1)
          : cursorPosition.end;
        newCursor = { start: pos, end: pos };
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Find current line and move up/down
      const lines = content.split('\n');
      let currentPos = 0;
      let currentLine = 0;
      let posInLine = 0;

      for (let i = 0; i < lines.length; i++) {
        if (currentPos + lines[i].length >= cursorPosition.start) {
          currentLine = i;
          posInLine = cursorPosition.start - currentPos;
          break;
        }
        currentPos += lines[i].length + 1; // +1 for newline
      }

      if (e.key === 'ArrowUp' && currentLine > 0) {
        const targetLine = currentLine - 1;
        const targetLineStart = lines.slice(0, targetLine).join('\n').length + (targetLine > 0 ? 1 : 0);
        const targetPos = Math.min(targetLineStart + posInLine, targetLineStart + lines[targetLine].length);
        newCursor = { start: targetPos, end: targetPos };
      } else if (e.key === 'ArrowDown' && currentLine < lines.length - 1) {
        const targetLine = currentLine + 1;
        const targetLineStart = lines.slice(0, targetLine).join('\n').length + 1;
        const targetPos = Math.min(targetLineStart + posInLine, targetLineStart + lines[targetLine].length);
        newCursor = { start: targetPos, end: targetPos };
      }
    } else if (e.key === 'Enter') {
      newContent = content.slice(0, cursorPosition.start) + '\n' + content.slice(cursorPosition.end);
      newCursor = { start: cursorPosition.start + 1, end: cursorPosition.start + 1 };
    } else if (e.key === 'Tab') {
      newContent = content.slice(0, cursorPosition.start) + '  ' + content.slice(cursorPosition.end);
      newCursor = { start: cursorPosition.start + 2, end: cursorPosition.start + 2 };
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Regular character input
      newContent = content.slice(0, cursorPosition.start) + e.key + content.slice(cursorPosition.end);
      newCursor = { start: cursorPosition.start + 1, end: cursorPosition.start + 1 };
    }

    if (newContent !== content) {
      onChange(newContent);
    }
    if (newCursor.start !== cursorPosition.start || newCursor.end !== cursorPosition.end) {
      setCursorPosition(newCursor);
    }
  }, [isEditing, content, cursorPosition, onChange]);

  // Handle clicks to position cursor
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isEditing) {
      setIsEditing(true);
    }

    // Calculate click position and set cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      let offset = range.startOffset;

      // Find position in original content
      let contentPosition = 0;
      if (editorRef.current) {
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );

        let currentNode = walker.nextNode();
        while (currentNode && currentNode !== textNode) {
          if (currentNode.textContent) {
            contentPosition += currentNode.textContent.length;
          }
          currentNode = walker.nextNode();
        }
        contentPosition += offset;
      }

      setCursorPosition({ start: contentPosition, end: contentPosition });
    }

    // Focus the editor to capture keyboard events
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [isEditing]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (!isEditing) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        const selectedText = selection.toString();
        setSelectedText(selectedText);
        onTextSelection?.(selectedText);
      }
    }
  }, [isEditing, onTextSelection]);

  // Focus editor when entering edit mode
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isEditing]);

  // Render mixed content (raw for cursor blocks, formatted for others)
  const renderMixedContent = useCallback(() => {
    const blocks = parseMarkdownBlocks(content);
    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Calculate line start position in full content
      const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(b => b.type === 'header' && b.start >= lineStart && b.end <= lineEnd);
        const showRaw = block && isCursorInBlock(block, cursorPosition) && isEditing;
        
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
          <HeaderTag 
            key={lineIndex} 
            className={`${className} ${showRaw ? 'bg-gray-100 px-2 py-1 rounded font-mono' : ''} cursor-text`}
            onClick={handleClick}
          >
            {showRaw ? line : headerText}
            {isEditing && block && isCursorInBlock(block, cursorPosition) && (
              <span className="animate-pulse">|</span>
            )}
          </HeaderTag>
        );
      }

      if (line.trim() === '') {
        return <div key={lineIndex} className="mb-2 min-h-[1em] cursor-text" onClick={handleClick}></div>;
      }

      // Get blocks that affect this line
      const lineBlocks = blocks.filter(
        (block) =>
          (block.start >= lineStart && block.start < lineEnd) ||
          (block.end > lineStart && block.end <= lineEnd) ||
          (block.start < lineStart && block.end > lineEnd)
      );

      if (lineBlocks.length === 0) {
        // No formatting in this line
        return (
          <p key={lineIndex} className="mb-3 leading-relaxed cursor-text" onClick={handleClick}>
            {line}
            {isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd && (
              <span className="animate-pulse">|</span>
            )}
          </p>
        );
      }

      // Build mixed content with raw/formatted blocks
      const elements: JSX.Element[] = [];
      let lastPos = 0;

      const sortedLineBlocks = lineBlocks
        .map((block) => ({
          ...block,
          startInLine: Math.max(0, block.start - lineStart),
          endInLine: Math.min(line.length, block.end - lineStart),
        }))
        .sort((a, b) => a.startInLine - b.startInLine);

      sortedLineBlocks.forEach((block, blockIndex) => {
        // Add text before block
        if (block.startInLine > lastPos) {
          const beforeText = line.substring(lastPos, block.startInLine);
          const beforeTextStart = lineStart + lastPos;
          const beforeTextEnd = lineStart + block.startInLine;

          // Check if cursor is in this text segment
          if (isEditing && cursorPosition.start >= beforeTextStart && cursorPosition.start <= beforeTextEnd) {
            const cursorPos = cursorPosition.start - beforeTextStart;
            const textBefore = beforeText.substring(0, cursorPos);
            const textAfter = beforeText.substring(cursorPos);

            if (textBefore) {
              elements.push(
                <span key={`before-${blockIndex}-1`} className="cursor-text" onClick={handleClick}>
                  {textBefore}
                </span>
              );
            }
            elements.push(
              <span key="cursor" className="animate-pulse">|</span>
            );
            if (textAfter) {
              elements.push(
                <span key={`before-${blockIndex}-2`} className="cursor-text" onClick={handleClick}>
                  {textAfter}
                </span>
              );
            }
          } else {
            elements.push(
              <span key={`before-${blockIndex}`} className="cursor-text" onClick={handleClick}>
                {beforeText}
              </span>
            );
          }
        }

        if (block.startInLine < lastPos) return;

        const showRaw = isCursorInBlock(block, cursorPosition) && isEditing;
        const blockElement = showRaw ? (
          <span
            key={`block-${block.id}`}
            className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm border cursor-text"
            onClick={handleClick}
          >
            {block.rawText}
            {isEditing && isCursorInBlock(block, cursorPosition) && (
              <span className="animate-pulse">|</span>
            )}
          </span>
        ) : (
          <span key={`block-${block.id}`} className="cursor-text" onClick={handleClick}>
            {block.type === 'bold' && <strong>{block.innerText}</strong>}
            {block.type === 'italic' && <em>{block.innerText}</em>}
            {block.type === 'link' && (
              <a href="#" className="text-blue-600 underline" onClick={(e) => e.preventDefault()}>
                {block.innerText}
              </a>
            )}
            {block.type === 'code' && (
              <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">
                {block.innerText}
              </code>
            )}
            {block.type === 'highlight' && (
              <span className="bg-yellow-200 px-1 py-0.5 rounded">
                {block.innerText}
              </span>
            )}
            {block.type === 'bracket' && (
              <span className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">
                [{block.innerText}]
              </span>
            )}
          </span>
        );

        elements.push(blockElement);
        lastPos = block.endInLine;
      });

      // Add remaining text after last block
      if (lastPos < line.length) {
        const afterText = line.substring(lastPos);
        const afterTextStart = lineStart + lastPos;
        const afterTextEnd = lineStart + line.length;

        // Check if cursor is in this text segment
        if (isEditing && cursorPosition.start >= afterTextStart && cursorPosition.start <= afterTextEnd) {
          const cursorPos = cursorPosition.start - afterTextStart;
          const textBefore = afterText.substring(0, cursorPos);
          const textAfter = afterText.substring(cursorPos);

          if (textBefore) {
            elements.push(
              <span key="after-1" className="cursor-text" onClick={handleClick}>
                {textBefore}
              </span>
            );
          }
          elements.push(
            <span key="cursor" className="animate-pulse">|</span>
          );
          if (textAfter) {
            elements.push(
              <span key="after-2" className="cursor-text" onClick={handleClick}>
                {textAfter}
              </span>
            );
          }
        } else {
          elements.push(
            <span key="after" className="cursor-text" onClick={handleClick}>
              {afterText}
            </span>
          );
        }
      }

      // Handle cursor at the very end of the line (after all content)
      if (isEditing && cursorPosition.start === lineEnd && elements.length > 0) {
        // Check if cursor wasn't already added
        const hasCursor = elements.some(el => React.isValidElement(el) && el.key === 'cursor');
        if (!hasCursor) {
          elements.push(
            <span key="cursor" className="animate-pulse">|</span>
          );
        }
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed cursor-text" onClick={handleClick}>
          {elements}
        </p>
      );
    });
  }, [content, cursorPosition, isEditing, parseMarkdownBlocks, isCursorInBlock, handleClick]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={editorRef}
        className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors outline-none"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: '1.6',
          fontSize: '16px',
        }}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        contentEditable={false}
      >
        {renderMixedContent()}
        {!isEditing && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
            Click to edit
          </div>
        )}
      </div>
      
      {/* Hidden textarea for better keyboard input handling */}
      <textarea
        ref={hiddenInputRef}
        className="absolute -left-[9999px] opacity-0"
        value=""
        onChange={() => {}}
        tabIndex={-1}
      />
    </div>
  );
}
