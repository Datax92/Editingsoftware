'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

export default function KeyboardShortcuts() {
  const { setActiveTool, undo, redo, currentPage, setCurrentPage } = useDocumentStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'h':
            setActiveTool('highlight');
            break;
          case 'd':
            setActiveTool('draw');
            break;
          case 'v':
          case 's':
            setActiveTool('select');
            break;
          case 'arrowleft':
          case 'pageup':
            setCurrentPage(Math.max(currentPage - 1, 1));
            break;
          case 'arrowright':
          case 'pagedown':
            setCurrentPage(currentPage + 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setActiveTool, undo, redo, currentPage, setCurrentPage]);

  return null;
}