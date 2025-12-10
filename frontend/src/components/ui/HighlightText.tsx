import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
}

/**
 * Component that highlights matching search terms within text
 * Used for search result highlighting in feedback lists
 */
export const HighlightText: React.FC<HighlightTextProps> = ({ 
  text, 
  highlight,
  className = ''
}) => {
  if (!text) {
    return null;
  }

  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters in the search term
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Case-insensitive regex to find all matches
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

export default HighlightText;

