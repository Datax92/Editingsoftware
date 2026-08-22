import React, { useEffect, useState } from 'react';
import * as mammoth from 'mammoth';
import { createWordHeadingId } from '@/lib/wordUtils';

interface WordOutlineSidebarProps {
  file: File;
  onSelectHeading?: (headingId: string) => void;
}

interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

export const WordOutlineSidebar: React.FC<WordOutlineSidebarProps> = ({ file, onSelectHeading }) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function extractHeadings() {
      setIsLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Use mammoth to convert headings to structured HTML elements
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
            ],
          }
        );

        const parser = new DOMParser();
        const doc = parser.parseFromString(result.value, 'text/html');
        const headingElements = doc.querySelectorAll('h1, h2, h3');

        const extracted: HeadingItem[] = Array.from(headingElements).map((el, index) => {
          const text = el.textContent?.trim() || `Heading ${index + 1}`;
          return {
            level: parseInt(el.tagName.replace('H', '')),
            text,
            id: createWordHeadingId(text, index),
          };
        });

        if (isMounted) {
          setHeadings(extracted);
        }
      } catch (error) {
        console.error('Failed to parse document outline:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    extractHeadings();

    return () => {
      isMounted = false;
    };
  }, [file]);

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground border-r border-border transition-smooth">
      <div className="p-3 border-b border-border font-semibold text-xs uppercase tracking-wider text-muted-foreground">
        Document Outline
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {isLoading ? (
          <div className="flex justify-center items-center h-24 text-muted-foreground">
            Loading outline...
          </div>
        ) : headings.length === 0 ? (
          <div className="p-3 text-muted-foreground text-center">
            No headings found in document.
          </div>
        ) : (
          headings.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectHeading && onSelectHeading(item.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-smooth truncate ${
                item.level === 1
                  ? 'font-bold text-foreground'
                  : item.level === 2
                  ? 'pl-4 text-muted-foreground'
                  : 'pl-6 text-muted-foreground/80 text-[11px]'
              }`}
            >
              {item.text}
            </button>
          ))
        )}
      </div>
    </div>
  );
};