'use client';

import React from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const DRAWING_COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#7c3aed'];
const HIGHLIGHT_COLORS = ['#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#a78bfa'];

// Comprehensive font list for rich word processing
const COMMON_FONTS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

export default function AnnotationToolbar() {
  const { 
    activeTool, 
    brushColor, 
    setBrushColor, 
    brushSize, 
    setBrushSize, 
    setActiveTool,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily
  } = useDocumentStore() as any;

  if (
    activeTool !== 'draw' && 
    activeTool !== 'highlight' && 
    activeTool !== 'sticky-note' && 
    activeTool !== 'comment' &&
    activeTool !== 'text'
  ) return null;

  const currentColors = activeTool === 'highlight' ? HIGHLIGHT_COLORS : DRAWING_COLORS;
  const isNoteTool = activeTool === 'sticky-note' || activeTool === 'comment';
  const isTextTool = activeTool === 'text';

  const currentFontLabel = COMMON_FONTS.find((f) => f.value === fontFamily)?.label || 'Inter';

  return (
    <div className="w-full flex items-center justify-center space-x-4 bg-card border-b border-border py-2 px-4 z-30 select-none shadow-xs">
      {isNoteTool ? (
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTool === 'sticky-note' ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setActiveTool('sticky-note')}
          >
            Sticky Note
          </Button>
          <Button
            variant={activeTool === 'comment' ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setActiveTool('comment')}
          >
            Comment
          </Button>
        </div>
      ) : isTextTool ? (
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
         {/* Custom Dropdown Menu for Font Family */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-muted-foreground">Font:</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button 
                    variant="outline" 
                    className="h-7 px-2.5 justify-between text-xs font-medium rounded-xl border-border/80 bg-background/80 backdrop-blur-sm shadow-2xs hover:bg-secondary/80 transition-all min-w-[130px]"
                  >
                    <span className="truncate">{currentFontLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1.5 flex-shrink-0" />
                  </Button>
                }
              />
              <DropdownMenuContent className="w-[140px] rounded-xl border-border/80 bg-card/95 backdrop-blur-md p-1.5 shadow-xl">
                {COMMON_FONTS.map((font) => (
                  <DropdownMenuItem
                    key={font.value}
                    onClick={() => setFontFamily && setFontFamily(font.value)}
                    className={`text-xs rounded-lg cursor-pointer px-2.5 py-1.5 focus:bg-primary/10 focus:text-primary transition-colors ${
                      font.label === 'Times New Roman' || font.label === 'Georgia'
                        ? 'font-serif'
                        : font.label === 'Courier New'
                        ? 'font-mono'
                        : 'font-medium'
                    }`}
                  >
                    {font.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Arbitrary Font Size Number Input / Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-muted-foreground">Size:</span>
            <input
              type="number"
              min="8"
              max="144"
              value={fontSize || 16}
              onChange={(e) => setFontSize && setFontSize(Number(e.target.value))}
              className="h-7 w-14 text-xs bg-background border border-input rounded px-2 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Full Hex Color Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">Color:</span>
            <div className="flex items-center space-x-1">
              <input
                type="color"
                value={textColor || '#000000'}
                onChange={(e) => setTextColor && setTextColor(e.target.value)}
                className="w-6 h-6 rounded border border-input cursor-pointer bg-transparent p-0"
                title="Choose text color"
              />
              <span className="text-xs font-mono text-muted-foreground uppercase">
                {textColor || '#000000'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              {activeTool === 'highlight' ? 'Highlight Color:' : 'Color:'}
            </span>
            {currentColors.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded-full border transition-all ${
                  brushColor === color ? 'ring-2 ring-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setBrushColor(color)}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">Size:</span>
            <Button
              variant={brushSize === 2 ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setBrushSize(2)}
            >
              Thin
            </Button>
            <Button
              variant={brushSize === 6 ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setBrushSize(6)}
            >
              Medium
            </Button>
            <Button
              variant={brushSize === 12 ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setBrushSize(12)}
            >
              Thick
            </Button>
          </div>
        </>
      )}
    </div>
  );
}