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
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

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

  // Find which block contains the cursor
  const getBlockAtPosition = useCallback((position: number, blocks: MarkdownBlock[]) => {
    return blocks.find(block => position >= block.start && position <= block.end);
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditing) return;

      e.preventDefault();
      e.stopPropagation();

      let newContent = content;
      let newCursor = { ...cursorPosition };

      if (e.key === "Escape") {
        setIsEditing(false);
        setEditingBlockId(null);
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
        const pos = Math.max(0, cursorPosition.start - 1);
        newCursor = { start: pos, end: pos };
      } else if (e.key === "ArrowRight") {
        const pos = Math.min(content.length, cursorPosition.start + 1);
        newCursor = { start: pos, end: pos };
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
        
        // Update editing block
        const blocks = parseMarkdownBlocks(newContent);
        const blockAtCursor = getBlockAtPosition(newCursor.start, blocks);
        setEditingBlockId(blockAtCursor?.id || null);
      }
    },
    [isEditing, content, cursorPosition, onChange, parseMarkdownBlocks, getBlockAtPosition],
  );

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (onTextSelection) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        onTextSelection(selection.toString());
      }
    }
  }, [onTextSelection]);

  // Handle clicks to start editing
  const handleElementClick = useCallback((e: React.MouseEvent, position: number, blockId?: string) => {
    e.stopPropagation();
    setIsEditing(true);
    setCursorPosition({ start: position, end: position });
    setEditingBlockId(blockId || null);
    
    // Focus hidden input
    setTimeout(() => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 0);
  }, []);

  // Render the content with inline editing capabilities
  const renderContent = useCallback(() => {
    if (content.trim() === '') {
      return (
        <div 
          className="text-gray-400 cursor-text py-4"
          onClick={(e) => handleElementClick(e, 0)}
        >
          点击开始编写...
        </div>
      );
    }

    const blocks = parseMarkdownBlocks(content);
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      if (line.trim() === '') {
        return (
          <div 
            key={lineIndex} 
            className="min-h-[1.5em] cursor-text py-1"
            onClick={(e) => handleElementClick(e, lineStart)}
          >
            {isEditing && cursorPosition.start === lineStart && (
              <span className="w-0.5 h-4 bg-blue-600 animate-pulse inline-block" />
            )}
          </div>
        );
      }

      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, headerText] = headerMatch;
        const level = hashes.length;
        const block = blocks.find(b => b.type === "header" && b.start >= lineStart && b.end <= lineEnd);
        const isEditingThisBlock = editingBlockId === block?.id;

        const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const className = {
          1: "text-3xl font-bold mb-6 mt-8",
          2: "text-2xl font-semibold mb-4 mt-6", 
          3: "text-xl font-semibold mb-3 mt-5",
          4: "text-lg font-semibold mb-3 mt-4",
          5: "text-base font-semibold mb-2 mt-3",
          6: "text-sm font-semibold mb-2 mt-2",
        }[level] || "text-lg font-semibold mb-3 mt-4";

        return (
          <HeaderTag 
            key={lineIndex} 
            className={`${className} cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors ${
              isEditingThisBlock ? 'bg-blue-50 ring-1 ring-blue-200' : ''
            }`}
            onClick={(e) => handleElementClick(e, lineStart, block?.id)}
          >
            {isEditingThisBlock ? line : headerText}
            {isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd && isEditingThisBlock && (
              <span className="w-0.5 h-[1em] bg-blue-600 animate-pulse inline-block ml-1" />
            )}
          </HeaderTag>
        );
      }

      // Handle lines with formatting blocks
      const lineBlocks = blocks.filter(block => 
        (block.start >= lineStart && block.start < lineEnd) ||
        (block.end > lineStart && block.end <= lineEnd) ||
        (block.start < lineStart && block.end > lineEnd)
      ).sort((a, b) => a.start - b.start);

      if (lineBlocks.length === 0) {
        // Plain text line
        return (
          <p 
            key={lineIndex} 
            className="mb-3 leading-relaxed cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors"
            onClick={(e) => handleElementClick(e, lineStart)}
          >
            {line}
            {isEditing && cursorPosition.start >= lineStart && cursorPosition.start <= lineEnd && !editingBlockId && (
              <span className="w-0.5 h-4 bg-blue-600 animate-pulse inline-block ml-1" />
            )}
          </p>
        );
      }

      // Complex line with blocks
      const elements: React.ReactNode[] = [];
      let pos = 0;

      for (const block of lineBlocks) {
        const blockStart = Math.max(0, block.start - lineStart);
        const blockEnd = Math.min(line.length, block.end - lineStart);
        const isEditingThisBlock = editingBlockId === block.id;

        // Text before block
        if (pos < blockStart) {
          const textBefore = line.slice(pos, blockStart);
          elements.push(
            <span 
              key={`text-${pos}`}
              className="cursor-text hover:bg-gray-50 px-1 rounded"
              onClick={(e) => handleElementClick(e, lineStart + pos)}
            >
              {textBefore}
            </span>
          );
        }

        // The block itself
        const blockText = isEditingThisBlock ? block.rawText : block.innerText;
        let blockElement: React.ReactNode;

        const blockClassName = `cursor-text hover:bg-gray-50 px-1 rounded transition-colors ${
          isEditingThisBlock ? 'bg-blue-50 ring-1 ring-blue-200' : ''
        }`;

        switch (block.type) {
          case "bold":
            blockElement = isEditingThisBlock ? (
              <span 
                key={block.id}
                className={blockClassName}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {blockText}
              </span>
            ) : (
              <strong 
                key={block.id}
                className={blockClassName}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {blockText}
              </strong>
            );
            break;
          case "italic":
            blockElement = isEditingThisBlock ? (
              <span 
                key={block.id}
                className={blockClassName}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {blockText}
              </span>
            ) : (
              <em 
                key={block.id}
                className={blockClassName}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {blockText}
              </em>
            );
            break;
          case "link":
            blockElement = (
              <a 
                key={block.id}
                href="#"
                className={`text-blue-600 underline ${blockClassName}`}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {isEditingThisBlock ? blockText : block.innerText}
              </a>
            );
            break;
          case "code":
            blockElement = (
              <code 
                key={block.id}
                className={`bg-gray-100 px-2 py-1 rounded font-mono text-sm ${blockClassName}`}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {isEditingThisBlock ? blockText : block.innerText}
              </code>
            );
            break;
          case "highlight":
            blockElement = (
              <span 
                key={block.id}
                className={`bg-yellow-200 px-2 py-1 rounded ${blockClassName}`}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {isEditingThisBlock ? blockText : block.innerText}
              </span>
            );
            break;
          case "bracket":
            blockElement = (
              <span 
                key={block.id}
                className={`text-purple-600 bg-gray-100 px-2 py-1 rounded text-sm ${blockClassName}`}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {isEditingThisBlock ? blockText : `[${block.innerText}]`}
              </span>
            );
            break;
          default:
            blockElement = (
              <span 
                key={block.id}
                className={blockClassName}
                onClick={(e) => handleElementClick(e, block.start, block.id)}
              >
                {blockText}
              </span>
            );
        }

        elements.push(blockElement);
        pos = blockEnd;
      }

      // Text after last block
      if (pos < line.length) {
        const textAfter = line.slice(pos);
        elements.push(
          <span 
            key="text-after"
            className="cursor-text hover:bg-gray-50 px-1 rounded"
            onClick={(e) => handleElementClick(e, lineStart + pos)}
          >
            {textAfter}
          </span>
        );
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  }, [content, isEditing, cursorPosition, editingBlockId, parseMarkdownBlocks, handleElementClick]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="prose prose-lg max-w-none min-h-[600px] p-6 focus:outline-none"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: "1.7",
          fontSize: "16px",
        }}
        onKeyDown={handleKeyDown}
        onMouseUp={handleTextSelection}
        tabIndex={0}
      >
        {renderContent()}
      </div>

      {isEditing && (
        <div className="absolute bottom-4 right-4 text-xs text-blue-600 bg-white px-2 py-1 rounded shadow opacity-75">
          按 ESC 退出编辑
        </div>
      )}

      {/* Hidden input for keyboard capture */}
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
        value={content}
        onChange={() => {}} // Controlled by keyboard handler
      />
    </div>
  );
}
