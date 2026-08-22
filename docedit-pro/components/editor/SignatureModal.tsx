'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/store/useDocumentStore';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSignature: (dataUrl: string) => void;
}

export default function SignatureModal({ isOpen, onClose, onInsertSignature }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPage = useDocumentStore((state) => state.currentPage);
  const setSignaturePage = useDocumentStore((state) => (state as any).setSignaturePage);

  // Ensure canvas internal context scale matches its layout container cleanly
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 352;
      canvas.height = 150;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Account for CSS scaling vs actual canvas internal width/height
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Capture the current page index so the signature locks to this page
    if (typeof setSignaturePage === 'function') {
      setSignaturePage(currentPage);
    }

    // Export data URL cleanly
    const dataUrl = canvas.toDataURL('image/png');
    onInsertSignature(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg p-6 shadow-xl w-[400px]">
        <h3 className="text-lg font-semibold mb-2">Create Signature</h3>
        <p className="text-xs text-muted-foreground mb-4">Draw your signature below to stamp onto the document.</p>
        
        <div className="border border-border rounded bg-white mb-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair w-full h-[150px] touch-none block"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={clearCanvas}>Clear</Button>
          <div className="space-x-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Insert Signature</Button>
          </div>
        </div>
      </div>
    </div>
  );
}