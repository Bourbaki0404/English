import React, { useState, useRef, useEffect, useCallback } from "react";

interface CursorPosition {
  start: number;
  end: number;
}

interface MarkdownBlock {
  id: string;
  type: "bold" | "italic" | "link" | "code" | "highlight" | "bracket" | "header";
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
  className = "",
}: HybridEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [cursorBlinkVisible, setCursorBlinkVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

  // Cursor blinking effect
  useEffect(() => {
    if (!isEditing) return;
    
    const interval = setInterval(() => {
      setCursorBlinkVisible(prev => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, [isEditing]);

  // Parse markdown blocks
  const parseMarkdownBlocks = useCallback((text: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    let blockId = 0;

    // Headers
    text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content, offset) => {
      blocks.push({
        id: `header-${blockId++}`,
        type: "header",
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
        type: "bold",
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
        type: "italic",
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
        type: "link",
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
        type: "code",
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
        type: "highlight",
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
      if (nextChar !== "(") {
        blocks.push({
          id: `bracket-${blockId++}`,
          type: "bracket",
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
  const isCursorInBlock = useCallback(
    (block: MarkdownBlock, cursor: CursorPosition): boolean => {
      return cursor.start >= block.start && cursor.start <= block.end;
    },
    [],
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditing) {
        if (e.key === 'Enter' || e.key === ' ' || e.key.length === 1) {
          setIsEditing(true);
          setCursorPosition({ start: 0, end: 0 });
          e.preventDefault();
          setTimeout(() => {
            if (hiddenInputRef.current) {
              hiddenInputRef.current.focus();
            }
          }, 0);
          return;
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      
      let newContent = content;
      let newCursor = { ...cursorPosition };

      if (e.key === "Escape") {
        setIsEditing(false);
        if (hiddenInputRef.current) {
          hiddenInputRef.current.blur();
        }
        return;
      }

      if (e.key === "Backspace") {
        if (cursorPosition.start === cursorPosition.end) {
          if (cursorPosition.start > 0) {
            newContent =
              content.slice(0, cursorPosition.start - 1) +
              content.slice(cursorPosition.start);
            newCursor = {
              start: cursorPosition.start - 1,
              end: cursorPosition.start - 1,
            };
          }
        } else {
          newContent =
            content.slice(0, cursorPosition.start) +
            content.slice(cursorPosition.end);
          newCursor = {
            start: cursorPosition.start,
            end: cursorPosition.start,
          };
        }
      } else if (e.key === "Delete") {
        if (cursorPosition.start === cursorPosition.end) {
          if (cursorPosition.start < content.length) {
            newContent =
              content.slice(0, cursorPosition.start) +
              content.slice(cursorPosition.start + 1);
          }
        } else {
          newContent =
            content.slice(0, cursorPosition.start) +
            content.slice(cursorPosition.end);
          newCursor = {
            start: cursorPosition.start,
            end: cursorPosition.start,
          };
        }
      } else if (e.key === "ArrowLeft") {
        if (e.shiftKey) {
          newCursor = {
            start: cursorPosition.start,
            end: Math.max(0, cursorPosition.end - 1),
          };
        } else {
          const pos = cursorPosition.start === cursorPosition.end
            ? Math.max(0, cursorPosition.start - 1)
            : cursorPosition.start;
          newCursor = { start: pos, end: pos };
        }
      } else if (e.key === "ArrowRight") {
        if (e.shiftKey) {
          newCursor = {
            start: cursorPosition.start,
            end: Math.min(content.length, cursorPosition.end + 1),
          };
        } else {
          const pos = cursorPosition.start === cursorPosition.end
            ? Math.min(content.length, cursorPosition.end + 1)
            : cursorPosition.end;
          newCursor = { start: pos, end: pos };
        }
      } else if (e.key === "ArrowUp") {
        const currentLineStart = content.lastIndexOf('\n', cursorPosition.start - 1) + 1;
        if (currentLineStart > 0) {
          const prevLineStart = content.lastIndexOf('\n', currentLineStart - 2) + 1;
          const currentOffset = cursorPosition.start - currentLineStart;
          const prevLineEnd = currentLineStart - 1;
          const newPos = Math.min(prevLineStart + currentOffset, prevLineEnd);
          newCursor = { start: newPos, end: newPos };
        } else {
          newCursor = { start: 0, end: 0 };
        }
      } else if (e.key === "ArrowDown") {
        const currentLineStart = content.lastIndexOf('\n', cursorPosition.start - 1) + 1;
        const currentLineEnd = content.indexOf('\n', cursorPosition.start);
        const nextLineStart = currentLineEnd + 1;
        
        if (currentLineEnd !== -1 && nextLineStart < content.length) {
          const currentOffset = cursorPosition.start - currentLineStart;
          const nextLineEnd = content.indexOf('\n', nextLineStart);
          const nextLineLength = nextLineEnd === -1 ? content.length - nextLineStart : nextLineEnd - nextLineStart;
          const newPos = nextLineStart + Math.min(currentOffset, nextLineLength);
          newCursor = { start: newPos, end: newPos };
        } else {
          newCursor = { start: content.length, end: content.length };
        }
      } else if (e.key === "Home") {
        const lineStart = content.lastIndexOf('\n', cursorPosition.start - 1) + 1;
        newCursor = { start: lineStart, end: lineStart };
      } else if (e.key === "End") {
        const lineEnd = content.indexOf('\n', cursorPosition.start);
        const pos = lineEnd === -1 ? content.length : lineEnd;
        newCursor = { start: pos, end: pos };
      } else if (e.key === "Enter") {
        newContent =
          content.slice(0, cursorPosition.start) +
          "\n" +
          content.slice(cursorPosition.end);
        newCursor = {
          start: cursorPosition.start + 1,
          end: cursorPosition.start + 1,
        };
      } else if (e.key === "Tab") {
        newContent =
          content.slice(0, cursorPosition.start) +
          "  " +
          content.slice(cursorPosition.end);
        newCursor = {
          start: cursorPosition.start + 2,
          end: cursorPosition.start + 2,
        };
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        newContent =
          content.slice(0, cursorPosition.start) +
          e.key +
          content.slice(cursorPosition.end);
        newCursor = {
          start: cursorPosition.start + 1,
          end: cursorPosition.start + 1,
        };
      }

      if (newContent !== content) {
        onChange(newContent);
      }
      if (newCursor.start !== cursorPosition.start || newCursor.end !== cursorPosition.end) {
        setCursorPosition(newCursor);
        setCursorBlinkVisible(true);
      }
    },
    [isEditing, content, cursorPosition, onChange],
  );

  // Handle clicks
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    // Simple approach: always put cursor at end when clicking
    const clickPosition = content.length;
    setCursorPosition({ start: clickPosition, end: clickPosition });
    setIsEditing(true);
    setCursorBlinkVisible(true);

    setTimeout(() => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 0);
  }, [content]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (!isEditing) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        const selectedText = selection.toString();
        onTextSelection?.(selectedText);
      }
    }
  }, [isEditing, onTextSelection]);

  // Update hidden input
  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = content;
    }
  }, [content]);

  // Render content character by character with proper cursor positioning
  const renderContent = useCallback(() => {
    if (content.trim() === '') {
      return (
        <div className="text-gray-400 relative">
          Start typing or click to begin editing...
          {isEditing && cursorPosition.start === 0 && (
            <span 
              className={`absolute left-0 top-0 w-0.5 h-[1.4em] bg-blue-600 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'none' }}
            />
          )}
        </div>
      );
    }

    const blocks = parseMarkdownBlocks(content);
    const lines = content.split('\n');
    
    // Determine which blocks should show raw text
    const blocksToShowRaw = new Set<string>();
    if (isEditing) {
      blocks.forEach((block) => {
        if (isCursorInBlock(block, cursorPosition)) {
          blocksToShowRaw.add(block.id);
        }
      });
    }

    return lines.map((line, lineIndex) => {
      const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Check if cursor is on this line
      const cursorOnLine = isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd;

      // Handle empty lines
      if (line.trim() === '') {
        return (
          <div key={lineIndex} className="mb-2 min-h-[1.5em] relative">
            {cursorOnLine && (
              <span 
                className={`absolute left-0 top-0 w-0.5 h-[1.4em] bg-blue-600 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transition: 'none' }}
              />
            )}
          </div>
        );
      }

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(b => b.type === "header" && b.start >= lineStart && b.end <= lineEnd);
        const showRaw = block && blocksToShowRaw.has(block.id);

        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const className = {
          1: "text-2xl font-bold mb-4 mt-6",
          2: "text-xl font-semibold mb-3 mt-5", 
          3: "text-lg font-semibold mb-2 mt-4",
          4: "text-base font-semibold mb-2 mt-3",
          5: "text-sm font-semibold mb-1 mt-2",
          6: "text-xs font-semibold mb-1 mt-2",
        }[level] || "text-base font-semibold mb-2 mt-3";

        const displayText = showRaw ? line : headerText;
        const cursorPos = cursorPosition.start - lineStart;

        return (
          <HeaderTag key={lineIndex} className={`${className} relative`}>
            {cursorOnLine ? (
              <>
                {displayText.slice(0, cursorPos)}
                <span 
                  className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transition: 'none' }}
                />
                {displayText.slice(cursorPos)}
              </>
            ) : (
              displayText
            )}
          </HeaderTag>
        );
      }

      // Handle regular lines with blocks
      const lineBlocks = blocks.filter(block => 
        (block.start >= lineStart && block.start < lineEnd) ||
        (block.end > lineStart && block.end <= lineEnd) ||
        (block.start < lineStart && block.end > lineEnd)
      ).sort((a, b) => a.start - b.start);

      if (lineBlocks.length === 0) {
        // Plain text line
        const cursorPos = cursorPosition.start - lineStart;
        return (
          <p key={lineIndex} className="mb-3 leading-relaxed relative">
            {cursorOnLine ? (
              <>
                {line.slice(0, cursorPos)}
                <span 
                  className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transition: 'none' }}
                />
                {line.slice(cursorPos)}
              </>
            ) : (
              line
            )}
          </p>
        );
      }

      // Complex line with blocks
      const elements: React.ReactNode[] = [];
      let pos = 0;
      const cursorPos = cursorPosition.start - lineStart;

      for (const block of lineBlocks) {
        const blockStart = Math.max(0, block.start - lineStart);
        const blockEnd = Math.min(line.length, block.end - lineStart);
        const showRaw = blocksToShowRaw.has(block.id);

        // Text before block
        if (pos < blockStart) {
          const text = line.slice(pos, blockStart);
          if (cursorOnLine && cursorPos >= pos && cursorPos <= blockStart) {
            const beforeCursor = text.slice(0, cursorPos - pos);
            const afterCursor = text.slice(cursorPos - pos);
            elements.push(
              <span key={`text-${pos}`}>
                {beforeCursor}
                <span 
                  className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transition: 'none' }}
                />
                {afterCursor}
              </span>
            );
          } else {
            elements.push(<span key={`text-${pos}`}>{text}</span>);
          }
        }

        // The block itself
        const blockText = showRaw ? block.rawText : block.innerText;
        let blockElement: React.ReactNode;

        if (showRaw) {
          if (cursorOnLine && cursorPos >= blockStart && cursorPos <= blockEnd) {
            const beforeCursor = blockText.slice(0, cursorPos - blockStart);
            const afterCursor = blockText.slice(cursorPos - blockStart);
            blockElement = (
              <span key={block.id}>
                {beforeCursor}
                <span 
                  className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transition: 'none' }}
                />
                {afterCursor}
              </span>
            );
          } else {
            blockElement = <span key={block.id}>{blockText}</span>;
          }
        } else {
          // Formatted block
          const innerCursorPos = cursorPos - blockStart - (block.rawText.length - block.innerText.length) / 2;
          const showCursorInside = cursorOnLine && cursorPos >= blockStart && cursorPos <= blockEnd && !showRaw;

          switch (block.type) {
            case "bold":
              blockElement = (
                <strong key={block.id}>
                  {showCursorInside ? (
                    <>
                      {blockText.slice(0, Math.max(0, innerCursorPos))}
                      <span 
                        className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transition: 'none' }}
                      />
                      {blockText.slice(Math.max(0, innerCursorPos))}
                    </>
                  ) : blockText}
                </strong>
              );
              break;
            case "italic":
              blockElement = (
                <em key={block.id}>
                  {showCursorInside ? (
                    <>
                      {blockText.slice(0, Math.max(0, innerCursorPos))}
                      <span 
                        className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transition: 'none' }}
                      />
                      {blockText.slice(Math.max(0, innerCursorPos))}
                    </>
                  ) : blockText}
                </em>
              );
              break;
            case "link":
              blockElement = (
                <a key={block.id} href="#" className="text-blue-600 underline">
                  {blockText}
                </a>
              );
              break;
            case "code":
              blockElement = (
                <code key={block.id} className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">
                  {blockText}
                </code>
              );
              break;
            case "highlight":
              blockElement = (
                <span key={block.id} className="bg-yellow-200 px-1 py-0.5 rounded">
                  {blockText}
                </span>
              );
              break;
            case "bracket":
              blockElement = (
                <span key={block.id} className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">
                  [{blockText}]
                </span>
              );
              break;
            default:
              blockElement = <span key={block.id}>{blockText}</span>;
          }
        }

        elements.push(blockElement);
        pos = blockEnd;
      }

      // Text after last block
      if (pos < line.length) {
        const text = line.slice(pos);
        if (cursorOnLine && cursorPos >= pos) {
          const beforeCursor = text.slice(0, cursorPos - pos);
          const afterCursor = text.slice(cursorPos - pos);
          elements.push(
            <span key={`text-end`}>
              {beforeCursor}
              <span 
                className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transition: 'none' }}
              />
              {afterCursor}
            </span>
          );
        } else {
          elements.push(<span key={`text-end`}>{text}</span>);
        }
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  }, [content, cursorPosition, isEditing, parseMarkdownBlocks, isCursorInBlock, cursorBlinkVisible]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-4 transition-colors min-h-[200px] focus:outline-none focus:bg-gray-50"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: "1.6",
          fontSize: "16px",
        }}
        onClick={handleClick}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {renderContent()}
        
        {!isEditing && content.trim() !== '' && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
            Click to edit
          </div>
        )}
        
        {isEditing && (
          <div className="absolute bottom-4 right-4 text-xs text-blue-600 opacity-75 pointer-events-none">
            Press ESC to stop editing
          </div>
        )}
      </div>

      {/* Hidden textarea for keyboard input */}
      <textarea
        ref={hiddenInputRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
        }}
        onBlur={() => {
          // Keep edit mode active
        }}
      />
    </div>
  );
}
