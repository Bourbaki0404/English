import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CursorPosition {
  start: number;
  end: number;
}

interface MarkdownBlock {
  id: string;
  type: 'bold' | 'italic' | 'link' | 'code' | 'highlight' | 'bracket' | 'header';
  start: number;
  end: number;
  rawText: string;
  innerText: string;
  level?: number;
}

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
  className = '' 
}: HybridEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  const displayRef = useRef<HTMLDivElement>(null);
  const hiddenEditableRef = useRef<HTMLDivElement>(null);

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

  // Check if cursor is within a block
  const isCursorInBlock = useCallback((block: MarkdownBlock, cursor: CursorPosition): boolean => {
    return cursor.start >= block.start && cursor.start <= block.end;
  }, []);

  // Get cursor position from hidden contenteditable
  const getCursorPositionFromEditable = useCallback(() => {
    if (!hiddenEditableRef.current) return 0;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(hiddenEditableRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    
    return preCaretRange.toString().length;
  }, []);

  // Set cursor position in hidden contenteditable
  const setCursorPositionInEditable = useCallback((position: number) => {
    if (!hiddenEditableRef.current) return;

    const walker = document.createTreeWalker(
      hiddenEditableRef.current,
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
        if (cursorPosition.start > 0) {
          newContent = content.slice(0, cursorPosition.start - 1) + content.slice(cursorPosition.start);
          newCursor = { start: cursorPosition.start - 1, end: cursorPosition.start - 1 };
        }
      } else {
        newContent = content.slice(0, cursorPosition.start) + content.slice(cursorPosition.end);
        newCursor = { start: cursorPosition.start, end: cursorPosition.start };
      }
    } else if (e.key === 'Delete') {
      if (cursorPosition.start === cursorPosition.end) {
        if (cursorPosition.start < content.length) {
          newContent = content.slice(0, cursorPosition.start) + content.slice(cursorPosition.start + 1);
        }
      } else {
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
    } else if (e.key === 'Enter') {
      newContent = content.slice(0, cursorPosition.start) + '\n' + content.slice(cursorPosition.end);
      newCursor = { start: cursorPosition.start + 1, end: cursorPosition.start + 1 };
    } else if (e.key === 'Tab') {
      newContent = content.slice(0, cursorPosition.start) + '  ' + content.slice(cursorPosition.end);
      newCursor = { start: cursorPosition.start + 2, end: cursorPosition.start + 2 };
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
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

  // Handle clicks on display area
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!displayRef.current || !hiddenEditableRef.current) return;

    // Get the click position relative to the display area
    const displayRect = displayRef.current.getBoundingClientRect();
    const clickX = e.clientX - displayRect.left;
    const clickY = e.clientY - displayRect.top;

    // Use caretRangeFromPoint or caretPositionFromPoint to get position
    let range: Range | null = null;
    
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if ((document as any).caretPositionFromPoint) {
      const caretPos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (caretPos) {
        range = document.createRange();
        range.setStart(caretPos.offsetNode, caretPos.offset);
        range.collapse(true);
      }
    }

    if (range) {
      // Calculate text position by traversing text nodes
      let position = 0;
      const walker = document.createTreeWalker(
        displayRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node = walker.nextNode();
      while (node && node !== range.startContainer) {
        if (node.textContent) {
          position += node.textContent.length;
        }
        node = walker.nextNode();
      }
      
      if (node === range.startContainer) {
        position += range.startOffset;
      }

      // Update cursor position and enter editing mode
      setCursorPosition({ start: position, end: position });
      setIsEditing(true);

      // Update hidden editable and focus it
      if (hiddenEditableRef.current) {
        hiddenEditableRef.current.textContent = content;
        hiddenEditableRef.current.focus();
        setCursorPositionInEditable(position);
      }
    }
  }, [content, setCursorPositionInEditable]);

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

  // Update hidden editable when content changes
  useEffect(() => {
    if (hiddenEditableRef.current && isEditing) {
      hiddenEditableRef.current.textContent = content;
    }
  }, [content, isEditing]);

  // Sync cursor position with hidden editable
  useEffect(() => {
    if (isEditing && hiddenEditableRef.current) {
      setCursorPositionInEditable(cursorPosition.start);
    }
  }, [cursorPosition, isEditing, setCursorPositionInEditable]);

  // Render content with mixed formatting
  const renderContent = useCallback(() => {
    const blocks = parseMarkdownBlocks(content);
    const lines = content.split('\n');
    
    // Determine which blocks should show raw text based on cursor position
    const blocksToShowRaw = new Set<string>();
    if (isEditing) {
      blocks.forEach(block => {
        if (isCursorInBlock(block, cursorPosition)) {
          blocksToShowRaw.add(block.id);
        }
      });
    }
    
    return lines.map((line, lineIndex) => {
      const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(b => b.type === 'header' && b.start >= lineStart && b.end <= lineEnd);
        const showRaw = block && blocksToShowRaw.has(block.id);
        
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
            {isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd && (
              <span className="animate-pulse">|</span>
            )}
          </HeaderTag>
        );
      }

      if (line.trim() === '') {
        return (
          <div key={lineIndex} className="mb-2 min-h-[1em]">
            {isEditing && cursorPosition.start === lineStart && (
              <span className="animate-pulse">|</span>
            )}
          </div>
        );
      }

      // Get blocks for this line
      const lineBlocks = blocks.filter(
        (block) =>
          (block.start >= lineStart && block.start < lineEnd) ||
          (block.end > lineStart && block.end <= lineEnd) ||
          (block.start < lineStart && block.end > lineEnd)
      ).sort((a, b) => a.start - b.start);

      if (lineBlocks.length === 0) {
        // Plain text line with cursor handling
        if (isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd) {
          const cursorPos = cursorPosition.start - lineStart;
          const textBefore = line.substring(0, cursorPos);
          const textAfter = line.substring(cursorPos);
          
          return (
            <p key={lineIndex} className="mb-3 leading-relaxed">
              {textBefore && <span>{textBefore}</span>}
              <span className="animate-pulse">|</span>
              {textAfter && <span>{textAfter}</span>}
            </p>
          );
        } else {
          return (
            <p key={lineIndex} className="mb-3 leading-relaxed">
              {line}
            </p>
          );
        }
      }

      // Build line with mixed content and cursor
      const elements: React.ReactNode[] = [];
      let currentPos = 0;
      let hasAddedCursor = false;

      for (let charPos = 0; charPos <= line.length; charPos++) {
        // Add cursor if it belongs at this position
        if (isEditing && cursorPosition.start === lineStart + charPos && !hasAddedCursor) {
          elements.push(<span key="cursor" className="animate-pulse">|</span>);
          hasAddedCursor = true;
        }

        if (charPos < line.length) {
          // Find if current position is start of a block
          const blockAtPos = lineBlocks.find(block => 
            block.start === lineStart + charPos
          );

          if (blockAtPos) {
            const showRaw = blocksToShowRaw.has(blockAtPos.id);
            
            if (showRaw) {
              // Show raw text
              elements.push(
                <span key={blockAtPos.id}>
                  {blockAtPos.rawText}
                </span>
              );
            } else {
              // Show formatted content
              let formattedElement: React.ReactNode;
              
              switch (blockAtPos.type) {
                case 'bold':
                  formattedElement = <strong key={blockAtPos.id}>{blockAtPos.innerText}</strong>;
                  break;
                case 'italic':
                  formattedElement = <em key={blockAtPos.id}>{blockAtPos.innerText}</em>;
                  break;
                case 'link':
                  formattedElement = (
                    <a key={blockAtPos.id} href="#" className="text-blue-600 underline">
                      {blockAtPos.innerText}
                    </a>
                  );
                  break;
                case 'code':
                  formattedElement = (
                    <code key={blockAtPos.id} className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">
                      {blockAtPos.innerText}
                    </code>
                  );
                  break;
                case 'highlight':
                  formattedElement = (
                    <span key={blockAtPos.id} className="bg-yellow-200 px-1 py-0.5 rounded">
                      {blockAtPos.innerText}
                    </span>
                  );
                  break;
                case 'bracket':
                  formattedElement = (
                    <span key={blockAtPos.id} className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">
                      [{blockAtPos.innerText}]
                    </span>
                  );
                  break;
                default:
                  formattedElement = <span key={blockAtPos.id}>{blockAtPos.innerText}</span>;
              }
              
              elements.push(formattedElement);
            }
            
            // Skip past the block
            charPos += blockAtPos.end - blockAtPos.start - 1;
          } else {
            // Find next block or end of line
            const nextBlock = lineBlocks.find(block => block.start > lineStart + charPos);
            const endPos = nextBlock ? nextBlock.start - lineStart : line.length;
            
            if (endPos > charPos) {
              const textSegment = line.substring(charPos, endPos);
              elements.push(
                <span key={`text-${charPos}`}>
                  {textSegment}
                </span>
              );
              charPos = endPos - 1;
            }
          }
        }
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  }, [content, cursorPosition, isEditing, parseMarkdownBlocks, isCursorInBlock]);

  return (
    <div className={`relative ${className}`}>
      {/* Display area */}
      <div
        ref={displayRef}
        className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: '1.6',
          fontSize: '16px',
        }}
        onClick={handleClick}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {renderContent()}
        {!isEditing && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
            Click to edit
          </div>
        )}
      </div>

      {/* Hidden contenteditable for accurate cursor positioning */}
      <div
        ref={hiddenEditableRef}
        contentEditable
        suppressContentEditableWarning
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          lineHeight: '1.6',
        }}
        onInput={(e) => {
          const newContent = e.currentTarget.textContent || '';
          onChange(newContent);
        }}
        onSelectionChange={() => {
          const pos = getCursorPositionFromEditable();
          setCursorPosition({ start: pos, end: pos });
        }}
      />
    </div>
  );
}
