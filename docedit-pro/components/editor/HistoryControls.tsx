'use client';

import React from 'react';

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function HistoryControls({ onUndo, onRedo, canUndo, canRedo }: HistoryControlsProps) {
  return (
    <div className="flex items-center space-x-1 bg-card border border-border rounded-md p-1 shadow-sm">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-1.5 rounded text-xs font-medium transition-colors ${
          canUndo
            ? 'text-foreground hover:bg-accent hover:text-accent-foreground'
            : 'text-muted-foreground/40 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-1.5 rounded text-xs font-medium transition-colors ${
          canRedo
            ? 'text-foreground hover:bg-accent hover:text-accent-foreground'
            : 'text-muted-foreground/40 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Y)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
        </svg>
      </button>
    </div>
  );
}