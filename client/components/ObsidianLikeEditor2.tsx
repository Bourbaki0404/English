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
    | "header"
    | "text";
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
  className = "",
}: ObsidianLikeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [selectedText, setSelectedText] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Parse markdown to identify format blocks
  const parseMarkdownBlocks = useCallback((text: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    let blockId = 0;

    // Headers (# ## ###)
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

    // Italic *text*
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

    // Inline code `text`
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

    // Bracket annotations [text]
    text.replace(/\[([^\]]+)\]/g, (match, group, offset) => {
      // Skip if it's part of a link
      const nextChar = text[offset + match.length];
      const isLink = nextChar === "(";
      if (!isLink) {
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

  // Check if cursor is within a specific block
  const isCursorInBlock = useCallback(
    (block: MarkdownBlock, cursor: CursorPosition): boolean => {
      return cursor.start >= block.start && cursor.start <= block.end;
    },
    [],
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditing) return;

      e.preventDefault();
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
      }
    },
    [isEditing, content, cursorPosition, onChange],
  );

  // Calculate cursor position from click
  const calculateCursorPosition = useCallback(
    (clickX: number, clickY: number): number => {
      if (!editorRef.current) return 0;

      const range = document.caretRangeFromPoint(clickX, clickY);
      if (!range) return 0;

      let position = 0;
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let node = walker.nextNode();
      while (node && node !== range.startContainer) {
        if (node.textContent) {
          position += node.textContent.length;
        }
        node = walker.nextNode();
      }

      return position + range.startOffset;
    },
    [],
  );

  // Handle clicks to position cursor
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isEditing) {
        setIsEditing(true);
      }

      const position = calculateCursorPosition(e.clientX, e.clientY);
      setCursorPosition({ start: position, end: position });

      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    [isEditing, calculateCursorPosition],
  );

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

  // Render content with proper cursor positioning
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
          <HeaderTag
            key={lineIndex}
            className={`${className} cursor-text`}
            onClick={handleClick}
          >
            {showRaw ? line : headerText}
            {isEditing &&
              cursorPosition.start >= lineStart &&
              cursorPosition.start <= lineEnd && (
                <span className="animate-pulse">|</span>
              )}
          </HeaderTag>
        );
      }

      if (line.trim() === "") {
        return (
          <div
            key={lineIndex}
            className="mb-2 min-h-[1em] cursor-text"
            onClick={handleClick}
          >
            {isEditing && cursorPosition.start === lineStart && (
              <span className="animate-pulse">|</span>
            )}
          </div>
        );
      }

      // Build line content
      const elements: JSX.Element[] = [];
      let currentPos = 0;
      let hasAddedCursor = false;

      // Get blocks that affect this line
      const lineBlocks = blocks
        .filter(
          (block) =>
            (block.start >= lineStart && block.start < lineEnd) ||
            (block.end > lineStart && block.end <= lineEnd) ||
            (block.start < lineStart && block.end > lineEnd),
        )
        .sort((a, b) => a.start - b.start);

      while (currentPos <= line.length) {
        // Add cursor if it belongs at this position
        if (
          isEditing &&
          cursorPosition.start === lineStart + currentPos &&
          !hasAddedCursor
        ) {
          elements.push(
            <span key="cursor" className="animate-pulse">
              |
            </span>,
          );
          hasAddedCursor = true;
        }

        if (currentPos >= line.length) break;

        // Find if current position is start of a block
        const blockAtPos = lineBlocks.find(
          (block) => block.start === lineStart + currentPos,
        );

        if (blockAtPos) {
          const showRaw = blocksToShowRaw.has(blockAtPos.id);
          const blockText = showRaw ? blockAtPos.rawText : blockAtPos.innerText;

          if (showRaw) {
            // Show raw text
            elements.push(
              <span
                key={`block-${blockAtPos.id}`}
                className="cursor-text"
                onClick={handleClick}
              >
                {blockAtPos.rawText}
              </span>,
            );
          } else {
            // Show formatted content
            const formattedElement = (
              <span
                key={`block-${blockAtPos.id}`}
                className="cursor-text"
                onClick={handleClick}
              >
                {blockAtPos.type === "bold" && (
                  <strong>{blockAtPos.innerText}</strong>
                )}
                {blockAtPos.type === "italic" && (
                  <em>{blockAtPos.innerText}</em>
                )}
                {blockAtPos.type === "link" && (
                  <a
                    href="#"
                    className="text-blue-600 underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    {blockAtPos.innerText}
                  </a>
                )}
                {blockAtPos.type === "code" && (
                  <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">
                    {blockAtPos.innerText}
                  </code>
                )}
                {blockAtPos.type === "highlight" && (
                  <span className="bg-yellow-200 px-1 py-0.5 rounded">
                    {blockAtPos.innerText}
                  </span>
                )}
                {blockAtPos.type === "bracket" && (
                  <span className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">
                    [{blockAtPos.innerText}]
                  </span>
                )}
              </span>
            );
            elements.push(formattedElement);
          }

          // Skip past the block
          currentPos += blockAtPos.end - blockAtPos.start;
        } else {
          // Find next block or end of line
          const nextBlock = lineBlocks.find(
            (block) => block.start > lineStart + currentPos,
          );
          const endPos = nextBlock ? nextBlock.start - lineStart : line.length;

          if (endPos > currentPos) {
            const textSegment = line.substring(currentPos, endPos);
            elements.push(
              <span
                key={`text-${currentPos}`}
                className="cursor-text"
                onClick={handleClick}
              >
                {textSegment}
              </span>,
            );
            currentPos = endPos;
          } else {
            currentPos++;
          }
        }
      }

      return (
        <p
          key={lineIndex}
          className="mb-3 leading-relaxed cursor-text"
          onClick={handleClick}
        >
          {elements}
        </p>
      );
    });
  }, [
    content,
    cursorPosition,
    isEditing,
    parseMarkdownBlocks,
    isCursorInBlock,
    handleClick,
  ]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={editorRef}
        className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors outline-none"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: "1.6",
          fontSize: "16px",
        }}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        contentEditable={false}
      >
        {renderContent()}
        {!isEditing && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
            Click to edit
          </div>
        )}
      </div>
    </div>
  );
}
