import React from "react";
import MDEditor from "@uiw/react-md-editor";
import rehypeHighlight from "rehype-highlight";
import "prismjs/themes/prism.css";

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
  
  const handleChange = (value?: string) => {
    onChange(value || "");
  };

  const handleTextSelection = () => {
    if (onTextSelection) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        onTextSelection(selection.toString());
      }
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseUp={handleTextSelection}
    >
      <MDEditor
        value={content}
        onChange={handleChange}
        preview="edit"
        hideToolbar={false}
        visibleDragBar={false}
        textareaProps={{
          placeholder: "Start typing your markdown here...",
          style: {
            fontSize: 16,
            lineHeight: 1.6,
            fontFamily: "system-ui, -apple-system, sans-serif",
          },
        }}
        height={600}
        data-color-mode="light"
        previewOptions={{
          rehypePlugins: [rehypeHighlight],
        }}
        style={{
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}
