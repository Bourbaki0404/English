import React from 'react';

interface PreviewRendererProps {
  content: string;
  className?: string;
}

export default function PreviewRenderer({ content, className = "" }: PreviewRendererProps) {
  const renderContent = () => {
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      if (line.trim() === "") {
        return <div key={index} className="mb-4"></div>;
      }

      // Handle mobile-optimized markdown formatting - same as MobileEditorLayout
      const processedLine = line
        .replace(
          /\*\*(.*?)\*\*/g,
          '<span class="bg-yellow-200 px-1 py-0.5 rounded font-medium text-gray-900">$1</span>',
        )
        .replace(
          /\[([^\]]+)\]/g,
          '<span class="text-purple-600 text-sm block mt-1 leading-relaxed">[$1]</span>',
        );

      return (
        <p
          key={index}
          className="mb-4 leading-relaxed text-gray-800 text-base"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    }).filter(Boolean);
  };

  return (
    <div className={`preview-content ${className}`}>
      {renderContent()}
    </div>
  );
}
