'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

interface TextLayerProps {
  width: number;
  height: number;
  pageNumber: number;
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
}

export default function TextLayer({ width, height, pageNumber }: TextLayerProps) {
  const { 
    activeTool, 
    pageTextAnnotations, 
    saveTextAnnotations,
    fontFamily: storeFontFamily,
    fontSize: storeFontSize,
    textColor: storeTextColor
  } = useDocumentStore();
  
  const globalAnnotations = pageTextAnnotations[pageNumber] ?? [];
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(globalAnnotations);

  // Safely sync when global store changes (Undo/Redo) without causing loop issues
  useEffect(() => {
    setAnnotations(pageTextAnnotations[pageNumber] ?? []);
  }, [pageTextAnnotations, pageNumber]);

  const [isEditing, setIsEditing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const commitChanges = (newAnnotations: TextAnnotation[]) => {
    setAnnotations(newAnnotations);
    saveTextAnnotations(pageNumber, newAnnotations);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' || draggingId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEditingId(null);
    setCurrentPos({ x, y });
    setIsEditing(true);
    setInputText('');
  };

  const handleSaveText = () => {
    if (inputText.trim()) {
      if (editingId) {
        const updated = annotations.map((ann) => 
          ann.id === editingId 
            ? { 
                ...ann, 
                text: inputText,
                fontFamily: storeFontFamily,
                fontSize: storeFontSize,
                textColor: storeTextColor
              } 
            : ann
        );
        commitChanges(updated);
      } else if (currentPos) {
        const newAnn: TextAnnotation = {
          id: Date.now().toString(),
          x: currentPos.x,
          y: currentPos.y,
          text: inputText,
          fontFamily: storeFontFamily,
          fontSize: storeFontSize,
          textColor: storeTextColor,
        };
        commitChanges([...annotations, newAnn]);
      }
    }
    closeEditor();
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentPos(null);
    setEditingId(null);
    setInputText('');
  };

  const handleDoubleClick = (ann: TextAnnotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(ann.id);
    setCurrentPos({ x: ann.x, y: ann.y });
    setInputText(ann.text);
    setIsEditing(true);
  };

  const handleDeleteText = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = annotations.filter((ann) => ann.id !== id);
    commitChanges(updated);
  };

  const handleMouseDown = (e: React.MouseEvent, ann: TextAnnotation) => {
    e.stopPropagation();
    if (activeTool !== 'select' && activeTool !== 'text') return;
    setDraggingId(ann.id);
    
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    let newX = e.clientX - rect.left - dragOffset.current.x;
    let newY = e.clientY - rect.top - dragOffset.current.y;

    newX = Math.max(0, Math.min(newX, width - 80));
    newY = Math.max(0, Math.min(newY, height - 30));

    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === draggingId ? { ...ann, x: newX, y: newY } : ann))
    );
  };

  const handleMouseUp = () => {
    if (draggingId) {
      saveTextAnnotations(pageNumber, annotations);
    }
    setDraggingId(null);
  };

  return (
    <div 
      data-page-text-layer="true"
      data-page-number={pageNumber}
      style={{ 
        width, 
        height, 
        pointerEvents: activeTool === 'select' || activeTool === 'text' ? 'auto' : 'none' 
      }}
      className="absolute inset-0 z-40 select-none cursor-crosshair"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {annotations.map((ann) => {
        if (isEditing && editingId === ann.id) return null;
        return (
          <div
            key={ann.id}
            onMouseDown={(e) => handleMouseDown(e, ann)}
            onDoubleClick={(e) => handleDoubleClick(ann, e)}
            className="absolute group px-1 py-0.5 cursor-move hover:bg-accent/20 rounded transition-colors flex items-center space-x-1"
            style={{ 
              left: ann.x, 
              top: ann.y, 
              pointerEvents: 'auto',
              fontFamily: ann.fontFamily || 'Inter, sans-serif',
              fontSize: `${ann.fontSize || 16}px`,
              color: ann.textColor || '#000000'
            }}
            title="Double-click to edit text"
          >
            <span>{ann.text}</span>
            <button
              onClick={(e) => handleDeleteText(ann.id, e)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 font-bold px-1 text-xs transition-opacity"
              title="Delete text"
            >
              ×
            </button>
          </div>
        );
      })}

      {isEditing && currentPos && (
        <div
          className="absolute z-50 flex items-center space-x-1 bg-card p-1 shadow-md border border-border rounded"
          style={{ left: currentPos.x, top: currentPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveText();
              if (e.key === 'Escape') closeEditor();
            }}
            placeholder="Type text..."
            className="bg-background text-foreground px-2 py-1 outline-none border border-border rounded w-40"
            style={{ 
              fontFamily: storeFontFamily,
              fontSize: `${Math.min(storeFontSize, 18)}px`,
              color: storeTextColor
            }}
          />
          <button
            onClick={handleSaveText}
            className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded hover:bg-primary/90 font-medium"
          >
            {editingId ? 'Save' : 'Add'}
          </button>
          <button
            onClick={closeEditor}
            className="text-muted-foreground hover:text-red-600 font-bold px-1.5 py-1 text-xs transition-colors"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}