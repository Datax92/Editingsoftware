'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';

interface SignatureLayerProps {
  signatureDataUrl?: string | null;
  onRemove?: () => void;
  pageNumber?: number;
}

export default function SignatureLayer({ signatureDataUrl, onRemove, pageNumber = 1 }: SignatureLayerProps) {
  const { 
    signaturePosition, 
    setSignaturePosition, 
    setSignatureSize,
    signaturePage 
  } = useDocumentStore() as any;

  const isDraggingRef = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);
  
  const dragStartMousePos = useRef({ x: 0, y: 0 });
  const dragStartElementPos = useRef({ x: 0, y: 0 });

  // Update size in store once mounted/rendered
  useEffect(() => {
    if (layerRef.current) {
      setSignatureSize({
        width: layerRef.current.offsetWidth,
        height: layerRef.current.offsetHeight,
      });
    }
  }, [signatureDataUrl, setSignatureSize]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = e.clientX - dragStartMousePos.current.x;
      const deltaY = e.clientY - dragStartMousePos.current.y;
      
      const newX = dragStartElementPos.current.x + deltaX;
      const newY = dragStartElementPos.current.y + deltaY;

      setSignaturePosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSignaturePosition]);

  // Early return placed AFTER all hooks have executed
  if (!signatureDataUrl || (signaturePage !== undefined && signaturePage !== pageNumber)) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartElementPos.current = { x: signaturePosition.x, y: signaturePosition.y };
  };

  return (
    <div
      ref={layerRef}
      data-signature-layer="true"
      data-page-number={pageNumber}
      className="absolute z-50 cursor-grab active:cursor-grabbing group select-none border border-dashed border-primary bg-background/40 hover:bg-background/80 rounded p-1 min-w-[80px] min-h-[40px] flex items-center justify-center"
      style={{
        left: `${signaturePosition.x}px`,
        top: `${signaturePosition.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <img
        src={signatureDataUrl}
        alt="Signature"
        className="max-h-16 w-auto object-contain pointer-events-none select-none"
      />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50"
          title="Remove signature"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}