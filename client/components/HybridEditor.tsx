import React, { useState, useRef, useEffect, useCallback } from "react";

interface CursorPosition {
  start: number;
  end: number;
}

interface MarkdownBlock {
  id: string;
  type:
    | "bold"
    | "italic"
    | "link"
    | "code"
    | "highlight"
    | "bracket"
    | "header";
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
  const [selectedText, setSelectedText] = useState("");
  const [cursorBlinkVisible, setCursorBlinkVisible] = useState(true);

  const displayRef = useRef<HTMLDivElement>(null);
  const hiddenEditableRef = useRef<HTMLDivElement>(null);

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

  // Get text position from a DOM point
  const getTextPositionFromPoint = useCallback((x: number, y: number): number => {
    if (!displayRef.current) return 0;

    let position = 0;
    const walker = document.createTreeWalker(
      displayRef.current,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          if (y >= rect.top && y <= rect.bottom) {
            if (x <= rect.left) {
              return position;
            } else if (x >= rect.right) {
              position += node.textContent?.length || 0;
              break;
            } else {
              // Binary search for character position within this text node
              const text = node.textContent || "";
              let left = 0;
              let right = text.length;
              
              while (left < right) {
                const mid = Math.floor((left + right) / 2);
                range.setStart(node, 0);
                range.setEnd(node, mid);
                const midRect = range.getBoundingClientRect();
                
                if (x <= midRect.right) {
                  right = mid;
                } else {
                  left = mid + 1;
                }
              }
              
              return position + left;
            }
          }
        }
      }
      
      if (node.textContent) {
        position += node.textContent.length;
      }
      node = walker.nextNode();
    }

    return Math.min(position, content.length);
  }, [content]);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditing) {
        if (e.key === 'Enter' || e.key === ' ' || e.key.length === 1) {
          setIsEditing(true);
          setCursorPosition({ start: 0, end: 0 });
          e.preventDefault();
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
          const pos =
            cursorPosition.start === cursorPosition.end
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
          const pos =
            cursorPosition.start === cursorPosition.end
              ? Math.min(content.length, cursorPosition.end + 1)
              : cursorPosition.end;
          newCursor = { start: pos, end: pos };
        }
      } else if (e.key === "ArrowUp") {
        // Move to start of current line or previous line
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
        // Move to next line
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
      if (
        newCursor.start !== cursorPosition.start ||
        newCursor.end !== cursorPosition.end
      ) {
        setCursorPosition(newCursor);
        setCursorBlinkVisible(true); // Reset blink when cursor moves
      }
    },
    [isEditing, content, cursorPosition, onChange],
  );

  // Handle clicks on display area
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const position = getTextPositionFromPoint(e.clientX, e.clientY);
      setCursorPosition({ start: position, end: position });
      setIsEditing(true);
      setCursorBlinkVisible(true);

      // Focus the hidden editable to capture keyboard events
      if (hiddenEditableRef.current) {
        hiddenEditableRef.current.focus();
      }
    },
    [getTextPositionFromPoint],
  );

  // Handle text selection
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
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
    if (hiddenEditableRef.current) {
      hiddenEditableRef.current.textContent = content;
    }
  }, [content]);

  // Render content with mixed formatting and cursor
  const renderContent = useCallback(() => {
    const blocks = parseMarkdownBlocks(content);
    const lines = content.split("\n");

    // Determine which blocks should show raw text based on cursor position
    const blocksToShowRaw = new Set<string>();
    if (isEditing) {
      blocks.forEach((block) => {
        if (isCursorInBlock(block, cursorPosition)) {
          blocksToShowRaw.add(block.id);
        }
      });
    }

    return lines.map((line, lineIndex) => {
      const lineStart =
        lines.slice(0, lineIndex).join("\n").length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(
          (b) =>
            b.type === "header" && b.start >= lineStart && b.end <= lineEnd,
        );
        const showRaw = block && blocksToShowRaw.has(block.id);

        const HeaderTag =
          `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const className =
          {
            1: "text-2xl font-bold mb-4 mt-6",
            2: "text-xl font-semibold mb-3 mt-5",
            3: "text-lg font-semibold mb-2 mt-4",
            4: "text-base font-semibold mb-2 mt-3",
            5: "text-sm font-semibold mb-1 mt-2",
            6: "text-xs font-semibold mb-1 mt-2",
          }[level] || "text-base font-semibold mb-2 mt-3";

        return (
          <HeaderTag key={lineIndex} className={className}>
            {renderLineWithCursor(showRaw ? line : headerText, lineStart, lineEnd)}
          </HeaderTag>
        );
      }

      if (line.trim() === "") {
        return (
          <div key={lineIndex} className="mb-2 min-h-[1.5em] relative">
            {isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd && (
              <span 
                className={`absolute left-0 top-0 w-0.5 h-full bg-blue-600 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transition: 'none' }}
              />
            )}
          </div>
        );
      }

      // Get blocks for this line
      const lineBlocks = blocks
        .filter(
          (block) =>
            (block.start >= lineStart && block.start < lineEnd) ||
            (block.end > lineStart && block.end <= lineEnd) ||
            (block.start < lineStart && block.end > lineEnd),
        )
        .sort((a, b) => a.start - b.start);

      if (lineBlocks.length === 0) {
        // Plain text line
        return (
          <p key={lineIndex} className="mb-3 leading-relaxed">
            {renderLineWithCursor(line, lineStart, lineEnd)}
          </p>
        );
      }

      // Build line with mixed content and cursor
      const elements: React.ReactNode[] = [];
      let currentPos = 0;

      for (const block of lineBlocks) {
        const blockStartInLine = Math.max(0, block.start - lineStart);
        const blockEndInLine = Math.min(line.length, block.end - lineStart);

        // Add text before block
        if (currentPos < blockStartInLine) {
          const textBefore = line.substring(currentPos, blockStartInLine);
          elements.push(
            <span key={`text-before-${block.id}`}>
              {renderTextWithCursor(textBefore, lineStart + currentPos)}
            </span>
          );
        }

        // Add the block
        const showRaw = blocksToShowRaw.has(block.id);
        const blockText = showRaw 
          ? block.rawText 
          : line.substring(blockStartInLine, blockEndInLine);

        let formattedElement: React.ReactNode;

        if (showRaw) {
          formattedElement = (
            <span key={block.id}>
              {renderTextWithCursor(blockText, block.start)}
            </span>
          );
        } else {
          const innerText = block.innerText;
          switch (block.type) {
            case "bold":
              formattedElement = (
                <strong key={block.id}>
                  {renderTextWithCursor(innerText, block.start + 2)}
                </strong>
              );
              break;
            case "italic":
              formattedElement = (
                <em key={block.id}>
                  {renderTextWithCursor(innerText, block.start + 1)}
                </em>
              );
              break;
            case "link":
              formattedElement = (
                <a
                  key={block.id}
                  href="#"
                  className="text-blue-600 underline"
                >
                  {renderTextWithCursor(innerText, block.start + 1)}
                </a>
              );
              break;
            case "code":
              formattedElement = (
                <code
                  key={block.id}
                  className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm"
                >
                  {renderTextWithCursor(innerText, block.start + 1)}
                </code>
              );
              break;
            case "highlight":
              formattedElement = (
                <span
                  key={block.id}
                  className="bg-yellow-200 px-1 py-0.5 rounded"
                >
                  {renderTextWithCursor(innerText, block.start + 2)}
                </span>
              );
              break;
            case "bracket":
              formattedElement = (
                <span
                  key={block.id}
                  className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm"
                >
                  [{renderTextWithCursor(innerText, block.start + 1)}]
                </span>
              );
              break;
            default:
              formattedElement = (
                <span key={block.id}>
                  {renderTextWithCursor(innerText, block.start)}
                </span>
              );
          }
        }

        elements.push(formattedElement);
        currentPos = blockEndInLine;
      }

      // Add remaining text after last block
      if (currentPos < line.length) {
        const textAfter = line.substring(currentPos);
        elements.push(
          <span key="text-after">
            {renderTextWithCursor(textAfter, lineStart + currentPos)}
          </span>
        );
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  }, [content, cursorPosition, isEditing, parseMarkdownBlocks, isCursorInBlock, cursorBlinkVisible]);

  // Helper function to render text with cursor
  const renderTextWithCursor = useCallback((text: string, textStartPos: number) => {
    if (!isEditing || cursorPosition.start < textStartPos || cursorPosition.start > textStartPos + text.length) {
      return text;
    }

    const cursorPosInText = cursorPosition.start - textStartPos;
    const textBefore = text.substring(0, cursorPosInText);
    const textAfter = text.substring(cursorPosInText);

    return (
      <>
        {textBefore}
        <span 
          className={`inline-block w-0.5 h-[1.2em] bg-blue-600 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ transition: 'none' }}
        />
        {textAfter}
      </>
    );
  }, [isEditing, cursorPosition, cursorBlinkVisible]);

  // Helper function to render line with cursor
  const renderLineWithCursor = useCallback((text: string, lineStart: number, lineEnd: number) => {
    return renderTextWithCursor(text, lineStart);
  }, [renderTextWithCursor]);

  return (
    <div className={`relative ${className}`}>
      {/* Display area */}
      <div
        ref={displayRef}
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
        {content.trim() === '' ? (
          <div className="text-gray-400">
            Start typing or click to begin editing...
            {isEditing && cursorPosition.start === 0 && (
              <span 
                className={`inline-block w-0.5 h-[1.2em] bg-blue-600 ml-1 relative -top-0.5 ${cursorBlinkVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transition: 'none' }}
              />
            )}
          </div>
        ) : (
          renderContent()
        )}
        
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

      {/* Hidden contenteditable for capturing keyboard events */}
      <div
        ref={hiddenEditableRef}
        contentEditable
        suppressContentEditableWarning
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "16px",
          lineHeight: "1.6",
        }}
        onBlur={() => {
          // Don't exit edit mode on blur - let user explicitly exit with ESC
        }}
      />
    </div>
  );
}
