'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Hand, 
  Highlighter, 
  PenTool, 
  Eraser, 
  Search, 
  Stamp, 
  Type, 
  StickyNote, 
  MessageSquareText, 
  FolderOpen, 
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  FileCode,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Subscript,
  Superscript,
  Indent,
  Outdent,
  RemoveFormatting,
  Palette,
  MoreHorizontal
} from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';

interface ToolbarProps {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onOpenSignatureModal: () => void;
  onOpenWordTemplate?: () => void;
  onFormat?: (command: string, value?: string) => void;
}

export default function Toolbar({ 
  isSearchOpen, 
  setIsSearchOpen, 
  onOpenSignatureModal, 
  onOpenWordTemplate,
  onFormat 
}: ToolbarProps) {
  const { activeTool, setActiveTool, setActiveFile, activeFile } = useDocumentStore();
  const [activeWordTab, setActiveWordTab] = useState<'home' | 'insert' | 'layout'>('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const isWordFile = React.useMemo(() => {
    if (!activeFile) return false;
    const filename = activeFile.name.toLowerCase();
    return filename.endsWith('.docx') || activeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }, [activeFile]);

  const handleQuickFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActiveFile(e.target.files[0]);
    }
  };

  const triggerFormat = (command: string, value: string = '') => {
    if (onFormat) {
      onFormat(command, value);
    }
  };

  const preserveSelection = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const toggleMoreMenu = () => {
    if (!isMoreMenuOpen && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setIsMoreMenuOpen(!isMoreMenuOpen);
  };

  return (
    <div className="flex flex-col bg-secondary/20 rounded-md border border-border w-full max-w-full select-none relative">
      {/* Word-style Ribbon Tabs Header */}
      {isWordFile && (
        <div className="flex items-center px-3 bg-muted/40 border-b border-border/50 text-xs font-medium text-muted-foreground gap-4 h-6">
          <button 
            onClick={() => setActiveWordTab('home')}
            className={`py-0.5 transition-colors ${activeWordTab === 'home' ? 'text-foreground border-b-2 border-primary font-semibold' : 'hover:text-foreground'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveWordTab('insert')}
            className={`py-0.5 transition-colors ${activeWordTab === 'insert' ? 'text-foreground border-b-2 border-primary font-semibold' : 'hover:text-foreground'}`}
          >
            Insert
          </button>
          <button 
            onClick={() => setActiveWordTab('layout')}
            className={`py-0.5 transition-colors ${activeWordTab === 'layout' ? 'text-foreground border-b-2 border-primary font-semibold' : 'hover:text-foreground'}`}
          >
            Layout
          </button>
        </div>
      )}

      {/* Main Toolbar Action Area */}
      <div className="flex items-center gap-1 p-1 overflow-x-auto scrollbar-none bg-card/60 w-full">
        {/* Quick Open / Upload Action */}
        <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium h-7 px-2 hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground flex-shrink-0">
          <FolderOpen className="h-3.5 w-3.5 mr-1 text-primary" /> Open
          <input 
            type="file" 
            accept=".pdf,.docx" 
            className="hidden" 
            onChange={handleQuickFileOpen} 
          />
        </label>

        <Separator orientation="vertical" className="h-4 mx-0.5 flex-shrink-0" />

        {/* Dynamic Conditional Toolsets */}
        {isWordFile ? (
          <>
            {activeWordTab === 'home' && (
              <div className="flex items-center gap-1 flex-nowrap">
                {/* Clipboard & History */}
                <div className="flex items-center gap-0.5 pr-1 border-r border-border flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Undo" onMouseDown={preserveSelection} onClick={() => triggerFormat('undo')}>
                    <Undo className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Redo" onMouseDown={preserveSelection} onClick={() => triggerFormat('redo')}>
                    <Redo className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Font Family & Size Selectors */}
                <div className="flex items-center gap-1 px-1 border-r border-border flex-shrink-0">
                  <select 
                    onChange={(e) => triggerFormat('fontName', e.target.value)}
                    className="h-6 px-1 text-xs border border-input rounded bg-background text-foreground focus:outline-none w-[90px]"
                    defaultValue="Calibri"
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                  </select>

                  <select 
                    onChange={(e) => triggerFormat('fontSize', e.target.value)}
                    className="h-6 px-1 text-xs border border-input rounded bg-background text-foreground focus:outline-none w-11"
                    defaultValue="3"
                  >
                    <option value="1">10</option>
                    <option value="2">12</option>
                    <option value="3">14</option>
                    <option value="4">16</option>
                    <option value="5">18</option>
                  </select>
                </div>

                {/* Core Text Formatting */}
                <div className="flex items-center gap-0.5 px-1 border-r border-border flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Bold" onMouseDown={preserveSelection} onClick={() => triggerFormat('bold')}>
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Italic" onMouseDown={preserveSelection} onClick={() => triggerFormat('italic')}>
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Underline" onMouseDown={preserveSelection} onClick={() => triggerFormat('underline')}>
                    <Underline className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-0.5 px-1 border-r border-border flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" title="Heading 1" onMouseDown={preserveSelection} onClick={() => triggerFormat('formatBlock', '<h1>')}>
                    <Heading1 className="h-3.5 w-3.5 mr-0.5" /> H1
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" title="Heading 2" onMouseDown={preserveSelection} onClick={() => triggerFormat('formatBlock', '<h2>')}>
                    <Heading2 className="h-3.5 w-3.5 mr-0.5" /> H2
                  </Button>
                </div>

                {/* Paragraph Alignment */}
                <div className="flex items-center gap-0.5 px-1 border-r border-border flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Align Left" onMouseDown={preserveSelection} onClick={() => triggerFormat('justifyLeft')}>
                    <AlignLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Align Center" onMouseDown={preserveSelection} onClick={() => triggerFormat('justifyCenter')}>
                    <AlignCenter className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Align Right" onMouseDown={preserveSelection} onClick={() => triggerFormat('justifyRight')}>
                    <AlignRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5 px-1 border-r border-border flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Bullet List" onMouseDown={preserveSelection} onClick={() => triggerFormat('insertUnorderedList')}>
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Numbered List" onMouseDown={preserveSelection} onClick={() => triggerFormat('insertOrderedList')}>
                    <ListOrdered className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* More Options Button */}
                <div className="flex-shrink-0">
                  <Button 
                    ref={moreButtonRef}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs gap-1"
                    onClick={toggleMoreMenu}
                    title="More Formatting Options"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" /> More
                  </Button>
                </div>
              </div>
            )}

            {activeWordTab === 'insert' && (
              <div className="flex items-center gap-2 px-2 py-0.5 flex-shrink-0 text-xs">
                {onOpenWordTemplate && (
                  <Button variant="outline" size="sm" onClick={onOpenWordTemplate} className="text-xs h-7">
                    <FileCode className="h-3.5 w-3.5 mr-1 text-primary" /> Template Variables
                  </Button>
                )}
                <span className="text-muted-foreground">Tables & Images via templates</span>
              </div>
            )}

            {activeWordTab === 'layout' && (
              <div className="flex items-center gap-2 px-2 py-0.5 text-xs text-muted-foreground flex-shrink-0">
                <span>Margins: Normal</span>
                <Separator orientation="vertical" className="h-3 mx-1" />
                <span>Portrait</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1 flex-nowrap">
            {/* PDF Tools */}
            <Button variant={activeTool === 'select' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('select')}>
              <Hand className="h-3.5 w-3.5 mr-1" /> Pan
            </Button>
            <Button variant={activeTool === 'text' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('text')}>
              <Type className="h-3.5 w-3.5 mr-1" /> Text
            </Button>
            <Button variant={activeTool === 'highlight' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('highlight')}>
              <Highlighter className="h-3.5 w-3.5 mr-1" /> Highlight
            </Button>
            <Button variant={activeTool === 'draw' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('draw')}>
              <PenTool className="h-3.5 w-3.5 mr-1" /> Draw
            </Button>
            <Button variant={activeTool === 'erase' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('erase')}>
              <Eraser className="h-3.5 w-3.5 mr-1" /> Eraser
            </Button>
            <Button variant={activeTool === 'sticky-note' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('sticky-note')}>
              <StickyNote className="h-3.5 w-3.5 mr-1" /> Note
            </Button>
            <Button variant={activeTool === 'comment' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setActiveTool('comment')}>
              <MessageSquareText className="h-3.5 w-3.5 mr-1" /> Comment
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={onOpenSignatureModal}>
              <Stamp className="h-3.5 w-3.5 mr-1" /> Sign
            </Button>
          </div>
        )}
        
        <Separator orientation="vertical" className="h-4 mx-1 ml-auto flex-shrink-0" />
        
        {/* Shared Find Tool */}
        <Button 
          variant={isSearchOpen ? 'default' : 'ghost'} 
          size="sm" 
          className="h-7 text-xs px-2 flex-shrink-0"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          <Search className="h-3.5 w-3.5 mr-1" /> Find
        </Button>
      </div>

      {/* Floating Viewport-Fixed Dropdown Menu */}
      {isMoreMenuOpen && menuPosition && (
        <>
          <div 
            className="fixed inset-0 z-[9998] bg-transparent" 
            onClick={() => setIsMoreMenuOpen(false)} 
          />
          <div 
            style={{ 
              top: `${menuPosition.top}px`, 
              right: `${menuPosition.right}px` 
            }}
            className="fixed w-52 bg-popover text-popover-foreground border border-border rounded-md shadow-2xl p-2 z-[9999] flex flex-col gap-1"
          >
            <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">Styles</div>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('strikeThrough'); setIsMoreMenuOpen(false); }}>
              <Strikethrough className="h-3.5 w-3.5" /> Strikethrough
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('subscript'); setIsMoreMenuOpen(false); }}>
              <Subscript className="h-3.5 w-3.5" /> Subscript
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('superscript'); setIsMoreMenuOpen(false); }}>
              <Superscript className="h-3.5 w-3.5" /> Superscript
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('removeFormat'); setIsMoreMenuOpen(false); }}>
              <RemoveFormatting className="h-3.5 w-3.5" /> Clear Formatting
            </button>

            <div className="h-[1px] bg-border my-1" />
            <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">Colors</div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" /> Text Color</span>
              <input type="color" className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent" onChange={(e) => triggerFormat('foreColor', e.target.value)} />
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span className="flex items-center gap-1.5"><Highlighter className="h-3.5 w-3.5 text-amber-500" /> Highlight</span>
              <input type="color" defaultValue="#FFFF00" className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent" onChange={(e) => triggerFormat('hiliteColor', e.target.value)} />
            </div>

            <div className="h-[1px] bg-border my-1" />
            <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">Paragraph</div>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('formatBlock', '<h3>'); setIsMoreMenuOpen(false); }}>
              <Heading3 className="h-3.5 w-3.5" /> Heading 3
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('justifyFull'); setIsMoreMenuOpen(false); }}>
              <AlignJustify className="h-3.5 w-3.5" /> Justify
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('outdent'); setIsMoreMenuOpen(false); }}>
              <Outdent className="h-3.5 w-3.5" /> Outdent
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { triggerFormat('indent'); setIsMoreMenuOpen(false); }}>
              <Indent className="h-3.5 w-3.5" /> Indent
            </button>
          </div>
        </>
      )}
    </div>
  );
}