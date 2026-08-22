'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { useDocumentStore } from '@/store/useDocumentStore';

interface AnnotationLayerProps {
  width: number;
  height: number;
}

export default function AnnotationLayer({ width, height }: AnnotationLayerProps) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isInitializingRef = useRef(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [draftCommentText, setDraftCommentText] = useState('');
  const [draggingCommentId, setDraggingCommentId] = useState<string | null>(null);
  const dragCommentOffset = useRef({ x: 0, y: 0 });
  
  const {
    activeTool,
    brushColor,
    brushSize,
    currentPage,
    pageAnnotations,
    savePageAnnotation,
    pageComments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
  } = useDocumentStore();

  // Initialize Fabric.js Canvas safely
  useEffect(() => {
    if (!canvasElementRef.current) return;

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width,
      height,
      selection: activeTool === 'select',
    });

    fabricCanvasRef.current = canvas;

    if (canvasElementRef.current) {
      (canvasElementRef.current as any).__fabricCanvas = canvas;
    }

    isInitializingRef.current = true;
    const savedData = pageAnnotations[currentPage];

    const loadCanvasData = async () => {
      if (!savedData) {
        isInitializingRef.current = false;
        return;
      }

      try {
        if (savedData.startsWith('data:image/')) {
          const img = await fabric.Image.fromURL(savedData);
          img.set({ 
            scaleX: width / (img.width || width), 
            scaleY: height / (img.height || height), 
            selectable: false, 
            evented: false 
          });
          canvas.add(img);
          canvas.renderAll();
        } else {
          const parsed = JSON.parse(savedData);
          await canvas.loadFromJSON(parsed);
          canvas.renderAll();
        }
      } catch (err) {
        console.warn('Failed to load page annotations, resetting:', err);
        savePageAnnotation(currentPage, '');
      } finally {
        isInitializingRef.current = false;
      }
    };

    loadCanvasData();

    const handleSaveState = () => {
      if (isInitializingRef.current || !fabricCanvasRef.current) return;
      const jsonState = JSON.stringify(canvas.toJSON());
      savePageAnnotation(currentPage, jsonState);
    };

    canvas.on('path:created', handleSaveState);
    canvas.on('object:added', handleSaveState);
    canvas.on('object:modified', handleSaveState);
    canvas.on('object:removed', handleSaveState);

    return () => {
      if (canvasElementRef.current) {
        delete (canvasElementRef.current as any).__fabricCanvas;
      }
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [currentPage, width, height]);

  // Update Fabric drawing modes, highlighters, object-deletion eraser, and text tool creation
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isErasing = activeTool === 'erase';
    const isTextTool = activeTool === 'text';
    
    canvas.isDrawingMode = activeTool === 'draw' || activeTool === 'highlight';
    canvas.selection = activeTool === 'select' || activeTool === 'pan';

    if (activeTool === 'draw') {
      const brush = new fabric.PencilBrush(canvas);
      brush.color = brushColor;
      brush.width = brushSize;
      canvas.freeDrawingBrush = brush;
    } else if (activeTool === 'highlight') {
      const brush = new fabric.PencilBrush(canvas);
      const chosenColor = brushColor === '#000000' ? '#fbbf24' : brushColor;
      
      let r = 251, g = 191, b = 36;
      if (chosenColor.startsWith('#') && chosenColor.length === 7) {
        r = parseInt(chosenColor.slice(1, 3), 16);
        g = parseInt(chosenColor.slice(3, 5), 16);
        b = parseInt(chosenColor.slice(5, 7), 16);
      }
      
      brush.color = `rgba(${r}, ${g}, ${b}, 0.35)`;
      brush.width = Math.max(brushSize * 6, 18);
      canvas.freeDrawingBrush = brush;
    }

    // Eraser tool: clicking an annotation stroke removes it completely without harming PDF background
    if (isErasing) {
      const handleObjectDown = (e: any) => {
        if (e.target && e.target !== canvas.backgroundImage) {
          canvas.remove(e.target);
          canvas.renderAll();
          if (!isInitializingRef.current) {
            const jsonState = JSON.stringify(canvas.toJSON());
            savePageAnnotation(currentPage, jsonState);
          }
        }
      };
      canvas.on('mouse:down', handleObjectDown);
      return () => {
        canvas.off('mouse:down', handleObjectDown);
      };
    }

    // Text tool: click anywhere on the canvas to insert an editable Fabric text box directly into the canvas state
    if (isTextTool) {
      const handleTextCanvasClick = (opt: any) => {
        const pointer = canvas.getScenePoint(opt.e); // Updated for Fabric.js v6 compatibility
        const textObj = new fabric.IText('Type text here', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Helvetica',
          fontSize: Math.max(brushSize * 4, 16),
          fill: brushColor,
          editable: true,
        });

        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        textObj.enterEditing();
        canvas.renderAll();
      };

      canvas.on('mouse:down', handleTextCanvasClick);
      return () => {
        canvas.off('mouse:down', handleTextCanvasClick);
      };
    }
  }, [activeTool, brushColor, brushSize, currentPage, savePageAnnotation]);

  // Handle comment drag interactions
  useEffect(() => {
    if (!draggingCommentId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nextX = Math.max(8, Math.min(e.clientX - dragCommentOffset.current.x, width - 220));
      const nextY = Math.max(8, Math.min(e.clientY - dragCommentOffset.current.y, height - 140));
      updateComment(currentPage, draggingCommentId, { x: nextX, y: nextY });
    };

    const handleMouseUp = () => setDraggingCommentId(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [currentPage, draggingCommentId, height, updateComment, width]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'sticky-note' && activeTool !== 'comment') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const kind = activeTool === 'sticky-note' ? 'sticky-note' : 'comment';

    const newComment = {
      id: `${kind}-${Date.now()}`,
      x: Math.max(8, Math.min(x, width - 220)),
      y: Math.max(8, Math.min(y, height - 140)),
      text: '',
      kind: kind as 'sticky-note' | 'comment',
    };

    addComment(currentPage, newComment);
    setEditingCommentId(newComment.id);
    setDraftCommentText('');
  };

  const saveComment = (commentId: string) => {
    const currentComment = (pageComments[currentPage] || []).find((comment) => comment.id === commentId);
    if (!currentComment) return;

    updateComment(currentPage, commentId, {
      text: draftCommentText.trim() || currentComment.text || 'New note',
    });
    setEditingCommentId(null);
    setDraftCommentText('');
  };

  const handleCommentMouseDown = (commentId: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const comment = (pageComments[currentPage] || []).find((entry) => entry.id === commentId);
    if (!comment) return;

    dragCommentOffset.current = {
      x: e.clientX - comment.x,
      y: e.clientY - comment.y,
    };
    setDraggingCommentId(commentId);
  };

  const pointerEvents = activeTool === 'select' || activeTool === 'pan' ? 'none' : 'auto';
  const cursorStyle = activeTool === 'draw' ? 'crosshair' : activeTool === 'erase' ? 'cell' : activeTool === 'highlight' ? 'text' : activeTool === 'text' ? 'text' : activeTool === 'sticky-note' || activeTool === 'comment' ? 'copy' : 'default';

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ width: `${width}px`, height: `${height}px`, pointerEvents }}
      onClick={handleCanvasClick}
    >
      <div className="absolute inset-0 pointer-events-auto" style={{ cursor: cursorStyle }}>
        <canvas ref={canvasElementRef} />
      </div>

      {(pageComments[currentPage] || []).map((comment) => {
        const isEditing = editingCommentId === comment.id;
        const noteStyle = comment.kind === 'sticky-note'
          ? 'border-amber-300 bg-amber-100/95 text-amber-950'
          : 'border-slate-300 bg-slate-100/95 text-slate-900';

        return (
          <div
            key={comment.id}
            className={`absolute z-30 w-52 rounded-md border p-2 shadow-md backdrop-blur ${noteStyle} ${comment.resolved ? 'opacity-70' : ''}`}
            style={{ left: comment.x, top: comment.y }}
            onMouseDown={(e) => handleCommentMouseDown(comment.id, e)}
            onClick={(e) => {
              e.stopPropagation();
              setEditingCommentId(comment.id);
              setDraftCommentText(comment.text);
            }}
          >
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
              <span>{comment.kind === 'sticky-note' ? 'Sticky Note' : 'Comment'}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="text-xs hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveComment(currentPage, comment.id, !comment.resolved);
                  }}
                  title="Resolve"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="text-xs hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteComment(currentPage, comment.id);
                    if (editingCommentId === comment.id) {
                      setEditingCommentId(null);
                      setDraftCommentText('');
                    }
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
            {isEditing ? (
              <textarea
                autoFocus
                value={draftCommentText}
                onChange={(e) => setDraftCommentText(e.target.value)}
                onBlur={() => saveComment(comment.id)}
                onKeyDown={(e) => {
                  if (keyIsEnter(e)) {
                    e.preventDefault();
                    saveComment(comment.id);
                  }
                }}
                className="min-h-[70px] w-full resize-none border-none bg-transparent text-sm outline-none"
                placeholder="Type a note..."
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-5">
                {comment.text || 'Click to add text'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function keyIsEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  return e.key === 'Enter' && !e.shiftKey;
}