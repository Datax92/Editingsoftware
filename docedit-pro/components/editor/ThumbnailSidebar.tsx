'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { RotateCw, ArrowUp, ArrowDown, Trash2, ListTree, MessageSquare, History, FileText, Layers, BookmarkPlus } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import mammoth from 'mammoth';
import { createWordHeadingId } from '@/lib/wordUtils';

let pdfjsLib: any = null;
if (typeof window !== 'undefined') {
  pdfjsLib = require('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface ThumbnailSidebarProps {
  numPages: number;
  onSelectHeading?: (heading: string) => void;
}

function ThumbnailItem({ 
  pageNumber, 
  numPages, 
  file, 
  isSelected, 
  isMultiSelected,
  onClick,
  onDragStart,
  onDragOver,
  onDrop
}: { 
  pageNumber: number; 
  numPages: number; 
  file: File; 
  isSelected: boolean; 
  isMultiSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, pageNum: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, pageNum: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { currentPage, replaceActiveFile, swapPageState, setCurrentPage, addHistoryLog, saveDocumentVersion, deletePageState } = useDocumentStore();

  const handlePageAction = async (action: 'rotate' | 'moveUp' | 'moveDown' | 'delete', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const safeBuffer = await file.slice().arrayBuffer();
      const pdfDoc = await PDFDocument.load(safeBuffer);
      const targetIndex = pageNumber - 1;
      const activePageBeforeAction = currentPage;

      if (action === 'delete') {
        if (pdfDoc.getPageCount() <= 1) {
          alert("Cannot delete the last remaining page.");
          return;
        }
        pdfDoc.removePage(targetIndex);
        deletePageState(pageNumber);
        if (activePageBeforeAction > pdfDoc.getPageCount()) {
          setCurrentPage(pdfDoc.getPageCount());
        } else if (activePageBeforeAction === pageNumber) {
          setCurrentPage(Math.max(1, pageNumber - 1));
        }
        addHistoryLog(`Deleted page ${pageNumber}`);
      } else if (action === 'rotate') {
        const page = pdfDoc.getPage(targetIndex);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + 90) % 360));
        addHistoryLog(`Rotated page ${pageNumber}`);
      } else if (action === 'moveUp' && targetIndex > 0) {
        const indices = pdfDoc.getPageIndices();
        const temp = indices[targetIndex];
        indices[targetIndex] = indices[targetIndex - 1];
        indices[targetIndex - 1] = temp;
        swapPageState(pageNumber, pageNumber - 1);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, indices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const modifiedBytes = await newPdf.save();
        const newFile = new File([modifiedBytes.buffer as ArrayBuffer], file.name || 'document.pdf', { type: 'application/pdf' });
        replaceActiveFile(newFile);
        addHistoryLog(`Moved page ${pageNumber} up`);
        if (activePageBeforeAction === pageNumber) {
          setCurrentPage(pageNumber - 1);
        } else if (activePageBeforeAction === pageNumber - 1) {
          setCurrentPage(pageNumber);
        }
        saveDocumentVersion(`Moved page ${pageNumber} up`);
        return;
      } else if (action === 'moveDown' && targetIndex < pdfDoc.getPageCount() - 1) {
        const indices = pdfDoc.getPageIndices();
        const temp = indices[targetIndex];
        indices[targetIndex] = indices[targetIndex + 1];
        indices[targetIndex + 1] = temp;
        swapPageState(pageNumber, pageNumber + 1);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, indices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const modifiedBytes = await newPdf.save();
        const newFile = new File([modifiedBytes.buffer as ArrayBuffer], file.name || 'document.pdf', { type: 'application/pdf' });
        replaceActiveFile(newFile);
        addHistoryLog(`Moved page ${pageNumber} down`);
        if (activePageBeforeAction === pageNumber) {
          setCurrentPage(pageNumber + 1);
        } else if (activePageBeforeAction === pageNumber + 1) {
          setCurrentPage(pageNumber);
        }
        saveDocumentVersion(`Moved page ${pageNumber} down`);
        return;
      }

      const modifiedBytes = await pdfDoc.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], file.name || 'document.pdf', { type: 'application/pdf' });
      replaceActiveFile(newFile);
      if (action !== 'delete') {
        setCurrentPage(activePageBeforeAction);
      }
      saveDocumentVersion(`Page modification: ${action}`);
    } catch (error) {
      console.error("Failed to modify page structure:", error);
    }
  };

  useEffect(() => {
    if (!pdfjsLib || !file) return;
    if (pageNumber > numPages) return;

    let isMounted = true;
    let renderTask: any = null;

    const renderThumbnail = async () => {
      try {
        const arrayBuffer = await file.slice().arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        if (!isMounted || pageNumber > pdfDoc.numPages) return;
        const page = await pdfDoc.getPage(pageNumber);

        if (!isMounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: 0.2 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        });

        await renderTask.promise;
      } catch (error: any) {
        if (
          error?.name === 'RenderingCancelled' || 
          error?.message?.includes('Renderingcancelled') || 
          error?.toString()?.includes('RenderingCancelled')
        ) {
          return;
        }
        console.error(`Error rendering thumbnail for page ${pageNumber}:`, error);
      }
    };

    renderThumbnail();

    return () => {
      isMounted = false;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [file, pageNumber, numPages]);

  if (pageNumber > numPages) return null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, pageNumber)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, pageNumber)}
      onClick={onClick}
      className={`group relative flex flex-col items-center p-2 rounded-lg cursor-pointer border transition-all ${
        isMultiSelected 
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
          : isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border hover:border-muted-foreground/50 bg-background'
      }`}>
      <div className="absolute top-3 left-3 z-10">
        <input 
          type="checkbox" 
          checked={isMultiSelected} 
          onChange={() => {}} 
          onClick={onClick}
          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
        />
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center space-x-1 bg-card/90 backdrop-blur-xs border border-border rounded p-0.5 shadow-xs transition-opacity z-10">
        <button 
          title="Rotate Page" 
          onClick={(e) => handlePageAction('rotate', e)}
          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
        >
          <RotateCw className="h-3 w-3" />
        </button>
        <button 
          title="Move Up" 
          disabled={pageNumber === 1}
          onClick={(e) => handlePageAction('moveUp', e)}
          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button 
          title="Move Down" 
          disabled={pageNumber === numPages}
          onClick={(e) => handlePageAction('moveDown', e)}
          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
        <button 
          title="Delete Page" 
          onClick={(e) => handlePageAction('delete', e)}
          className="p-1 hover:bg-destructive/10 rounded text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="w-full flex justify-center bg-secondary/30 rounded overflow-hidden mb-2 p-1 mt-3">
        <canvas ref={canvasRef} className="shadow-xs max-h-32 object-contain" />
      </div>
      <span className={`text-xs font-medium ${isSelected || isMultiSelected ? 'text-primary' : 'text-muted-foreground'}`}>
        Page {pageNumber}
      </span>
    </div>
  );
}

interface OutlineItem {
  title: string;
  level: number;
  dest?: any;
  elementId?: string;
}

export default function ThumbnailSidebar({ numPages, onSelectHeading }: ThumbnailSidebarProps) {
  const { 
    sidebarOpen, 
    currentPage, 
    setCurrentPage, 
    activeFile, 
    setActiveFile, 
    pageComments, 
    deleteComment, 
    resolveComment,
    historyLogs = [],
    addHistoryLog,
    documentVersions = [],
    saveDocumentVersion,
    restoreVersion,
    deletePageState
  } = useDocumentStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'thumbnails' | 'outline' | 'comments' | 'history' | 'versions'>('thumbnails');
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const draggedPageRef = useRef<number | null>(null);
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);

  const isWordFile = React.useMemo(() => {
    if (!activeFile) return false;
    const filename = activeFile.name.toLowerCase();
    return filename.endsWith('.docx') || activeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) {
      setOutlineItems([]);
      return;
    }

    let isMounted = true;
    const fetchOutline = async () => {
      try {
        if (isWordFile) {
          const arrayBuffer = await activeFile.slice().arrayBuffer();
          const result = await mammoth.convertToHtml(
            { arrayBuffer },
            {
              styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='Heading 5'] => h5:fresh",
                "p[style-name='Heading 6'] => h6:fresh",
              ],
            }
          );
          const parser = new DOMParser();
          const doc = parser.parseFromString(result.value, 'text/html');
          const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const headings = Array.from(headingElements).map((el: Element, index: number) => {
            const headingText = el.textContent?.trim() || `Heading ${index + 1}`;
            const safeId = createWordHeadingId(headingText, index);
            el.setAttribute('id', safeId);
            return {
              title: headingText,
              level: parseInt(el.tagName.replace('H', ''), 10) || 1,
              elementId: safeId
            };
          });
          if (isMounted) {
            setOutlineItems(headings);
          }
        } else if (pdfjsLib) {
          const arrayBuffer = await activeFile.slice().arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;
          const outline = await pdfDoc.getOutline();
          
          const resolvedOutlines: OutlineItem[] = [];
          if (outline) {
            for (const item of outline) {
              let targetPage = 1;
              try {
                if (item.dest) {
                  const destRef = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;
                  if (destRef && destRef[0]) {
                    targetPage = await pdfDoc.getPageIndex(destRef[0]) + 1;
                  }
                }
              } catch (e) {}
              resolvedOutlines.push({
                title: item.title || 'Untitled',
                level: 1,
                dest: targetPage
              });
            }
          }
          if (isMounted) {
            setOutlineItems(resolvedOutlines);
          }
        }
      } catch (err) {
        if (isMounted) setOutlineItems([]);
      }
    };
    fetchOutline();
    return () => {
      isMounted = false;
    };
  }, [activeFile, isWordFile]);

  const handleOutlineClick = async (item: OutlineItem) => {
    if (isWordFile) {
      if (onSelectHeading) {
        const headingId = item.elementId || item.title;
        onSelectHeading(headingId);
        addHistoryLog(`Navigated to heading: ${item.title}`);
      }
      return;
    }

    if (!isWordFile && item.dest) {
      const pageNum = typeof item.dest === 'number' ? item.dest : 1;
      setCurrentPage(pageNum);
      addHistoryLog(`Navigated to page ${pageNum} via outline`);
    }
  };

  const handleAddBlankPage = async () => {
    if (!activeFile) return;
    try {
      const currentActivePage = currentPage;
      const arrayBuffer = await activeFile.slice().arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.addPage([595.28, 841.89]);

      const modifiedBytes = await pdfDoc.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], activeFile.name || 'document.pdf', { type: 'application/pdf' });
      setActiveFile(newFile);
      setCurrentPage(currentActivePage);
      addHistoryLog('Added blank page');
      saveDocumentVersion('Added blank page');
    } catch (error) {
      console.error("Failed to add blank page:", error);
    }
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeFile) return;

    try {
      const currentActivePage = currentPage;
      const currentArrayBuffer = await activeFile.slice().arrayBuffer();
      const pdfDoc = await PDFDocument.load(currentArrayBuffer);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type === 'application/pdf') {
          const pdfBytes = await file.slice().arrayBuffer();
          const externalPdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await pdfDoc.copyPages(externalPdf, externalPdf.getPageIndices());
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        } else if (file.type.startsWith('image/')) {
          const imageBytes = await file.slice().arrayBuffer();
          const embeddedImage = file.type === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
          const page = pdfDoc.addPage([595.28, 841.89]);
          const { width, height } = page.getSize();
          const imgDims = embeddedImage.scaleToFit(width - 40, height - 40);

          page.drawImage(embeddedImage, {
            x: (width - imgDims.width) / 2,
            y: (height - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      }

      const modifiedBytes = await pdfDoc.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], activeFile.name || 'document.pdf', { type: 'application/pdf' });
      setActiveFile(newFile);
      setCurrentPage(currentActivePage);
      addHistoryLog(`Merged files into document`);
      saveDocumentVersion('Merged external files');
    } catch (error) {
      console.error("Failed to merge files into PDF:", error);
    } finally {
      e.target.value = '';
    }
  };

  const handlePageClick = (pageNum: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedPageNumbers.length > 0) {
      const lastSelected = selectedPageNumbers[selectedPageNumbers.length - 1];
      const start = Math.min(lastSelected, pageNum);
      const end = Math.max(lastSelected, pageNum);
      const range: number[] = [];
      for (let i = start; i <= end; i++) range.push(i);
      setSelectedPageNumbers(Array.from(new Set([...selectedPageNumbers, ...range])));
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedPageNumbers.includes(pageNum)) {
        setSelectedPageNumbers(selectedPageNumbers.filter(p => p !== pageNum));
      } else {
        setSelectedPageNumbers([...selectedPageNumbers, pageNum]);
      }
    } else {
      setSelectedPageNumbers([pageNum]);
      setCurrentPage(pageNum);
      addHistoryLog(`Switched to page ${pageNum}`);
    }
  };

  const handleDeleteSelectedPages = async () => {
    if (!activeFile || selectedPageNumbers.length === 0) return;
    if (selectedPageNumbers.length >= numPages) {
      alert("Cannot delete all pages in the document.");
      return;
    }

    try {
      const arrayBuffer = await activeFile.slice().arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const sortedPagesToRemove = [...selectedPageNumbers].sort((a, b) => b - a);
      sortedPagesToRemove.forEach(pageNum => {
        pdfDoc.removePage(pageNum - 1);
        deletePageState(pageNum);
      });

      const modifiedBytes = await pdfDoc.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], activeFile.name || 'document.pdf', { type: 'application/pdf' });
      setActiveFile(newFile);
      setSelectedPageNumbers([]);
      setCurrentPage(Math.min(currentPage, pdfDoc.getPageCount()));
      addHistoryLog(`Deleted selected pages batch`);
      saveDocumentVersion('Deleted selected pages');
    } catch (error) {
      console.error("Failed to delete selected pages:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, pageNum: number) => {
    draggedPageRef.current = pageNum;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPageNum: number) => {
    e.preventDefault();
    const sourcePageNum = draggedPageRef.current;
    draggedPageRef.current = null;

    if (!sourcePageNum || sourcePageNum === targetPageNum || !activeFile) return;

    try {
      const arrayBuffer = await activeFile.slice().arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const indices = pdfDoc.getPageIndices();

      const sourceIndex = sourcePageNum - 1;
      const targetIndex = targetPageNum - 1;

      const [removed] = indices.splice(sourceIndex, 1);
      indices.splice(targetIndex, 0, removed);

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, indices);
      copiedPages.forEach((p) => newPdf.addPage(p));

      const modifiedBytes = await newPdf.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], activeFile.name || 'document.pdf', { type: 'application/pdf' });
      setActiveFile(newFile);
      setCurrentPage(targetPageNum);
      addHistoryLog(`Reordered page ${sourcePageNum} to position ${targetPageNum}`);
      saveDocumentVersion(`Reordered page ${sourcePageNum}`);
    } catch (error) {
      console.error("Failed to reorder pages via drag and drop:", error);
    }
  };

  if (!sidebarOpen) return null;

  const allComments = Object.entries(pageComments).flatMap(([pageStr, comments]) =>
    (comments || []).map((c) => ({ ...c, pageNum: Number(pageStr) }))
  );

  return (
    <aside className="w-80 min-w-[20rem] max-w-[20rem] shrink-0 border-r border-border bg-card flex flex-col h-full select-none overflow-hidden">
      {/* Sidebar Navigation Tabs Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-1.5 py-1.5 text-xs font-medium gap-1">
        <button
          onClick={() => setActiveTab('thumbnails')}
          className={`flex-1 min-w-0 flex items-center justify-center space-x-1 px-1.5 py-1 rounded transition-colors truncate ${activeTab === 'thumbnails' ? 'bg-card text-primary shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          title="Pages & Thumbnails"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Pages</span>
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          className={`flex-1 min-w-0 flex items-center justify-center space-x-1 px-1.5 py-1 rounded transition-colors truncate ${activeTab === 'outline' ? 'bg-card text-primary shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          title="Outline & Headings"
        >
          <ListTree className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Outline</span>
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 min-w-0 flex items-center justify-center space-x-1 px-1.5 py-1 rounded transition-colors truncate ${activeTab === 'comments' ? 'bg-card text-primary shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          title="Comments"
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center justify-center p-1.5 rounded transition-colors shrink-0 ${activeTab === 'history' ? 'bg-card text-primary shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          title="History Log"
        >
          <History className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center justify-center p-1.5 rounded transition-colors shrink-0 ${activeTab === 'versions' ? 'bg-card text-primary shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          title="Versions"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Thumbnails Header Toolbar */}
      {!isWordFile && activeTab === 'thumbnails' && (
        <div className="p-3 border-b border-border font-semibold text-xs flex items-center justify-between bg-card">
          <div className="flex items-center space-x-1.5">
            <span>Thumbnails</span>
            <span className="text-muted-foreground">({numPages})</span>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={handleAddBlankPage}              className="text-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0.5 rounded transition-colors shadow-xs"
              title="Add Blank Page"
            >
              + Blank
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-0.5 rounded transition-colors shadow-xs"
              title="Upload PDFs or Images to Merge/Add"
            >
              + Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAddFiles} 
              multiple
              accept="application/pdf, image/png, image/jpeg, image/jpg" 
              className="hidden" 
            />
          </div>
        </div>
      )}

      {/* Versions Header Toolbar */}
      {activeTab === 'versions' && (
        <div className="p-3 border-b border-border font-semibold text-xs flex items-center justify-between bg-card">
          <span>Snapshots</span>
          <button 
            onClick={() => saveDocumentVersion()}
            className="flex items-center space-x-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded transition-colors shadow-xs"
            title="Save manual checkpoint"
          >
            <BookmarkPlus className="h-3 w-3" />
            <span>Save Version</span>
          </button>
        </div>
      )}

      {/* Tab Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'thumbnails' ? (
          !isWordFile ? (
            activeFile && numPages > 0 ? (
              Array.from({ length: numPages }, (_, index) => {
                const pageNum = index + 1;
                const isSelected = currentPage === pageNum;
                const isMultiSelected = selectedPageNumbers.includes(pageNum);

                return (
                  <ThumbnailItem
                    key={pageNum}
                    pageNumber={pageNum}
                    numPages={numPages}
                    file={activeFile}
                    isSelected={isSelected}
                    isMultiSelected={isMultiSelected}
                    onClick={(e) => handlePageClick(pageNum, e)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                );
              })
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                No document loaded
              </div>
            )
          ) : (
            <div className="text-xs text-muted-foreground text-center py-12">
              Page thumbnail view is currently available for PDF documents. Use Outline or other tabs for Word docs.
            </div>
          )
        ) : activeTab === 'outline' ? (
          outlineItems.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-12">
              {isWordFile ? 'No headings found in Word document.' : 'No document outline or bookmarks available.'}
            </div>
          ) : (
            <div className="space-y-1.5 text-xs">
              {outlineItems.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleOutlineClick(item)}
                  className={`p-2 rounded hover:bg-secondary cursor-pointer text-foreground transition-colors truncate ${isWordFile && item.level === 2 ? 'pl-4' : ''} ${isWordFile && item.level >= 3 ? 'pl-6' : ''}`}
                  title={item.title}
                >
                  {item.title}
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'comments' ? (
          allComments.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-12">
              No comments added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {allComments.map((comment) => {
                const noteStyle = comment.kind === 'sticky-note'
                  ? 'border-amber-300 bg-amber-100/95 text-amber-950'
                  : 'border-slate-300 bg-slate-100/95 text-slate-900';

                return (
                  <div
                    key={comment.id}
                    onClick={() => setCurrentPage(comment.pageNum)}
                    className={`rounded-md border p-2.5 shadow-sm cursor-pointer transition-all hover:ring-1 hover:ring-primary ${noteStyle} ${comment.resolved ? 'opacity-70' : ''}`}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                      <span className="flex items-center gap-1">
                        {comment.kind === 'sticky-note' ? 'Sticky Note' : 'Comment'}
                        <span className="text-muted-foreground font-normal">(p. {comment.pageNum})</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="text-xs hover:text-foreground p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveComment(comment.pageNum, comment.id, !comment.resolved);
                          }}
                          title="Resolve"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="text-xs hover:text-red-600 p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComment(comment.pageNum, comment.id);
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {comment.text || 'Empty note'}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'history' ? (
          historyLogs.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-12">
              No history log recorded for this session.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {historyLogs.map((log: string, idx: number) => (
                <div key={idx} className="p-2 border-b border-border text-muted-foreground flex items-center justify-between">
                  <span className="truncate">{log}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          documentVersions.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-12">
              No previous document versions found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {documentVersions.map((version) => (
                <div 
                  key={version.id} 
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all flex flex-col space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground truncate">{version.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{version.timestamp}</span>
                  </div>
                  <button
                    onClick={() => restoreVersion(version.id)}
                    className="w-full mt-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs py-1.5 rounded transition-colors font-medium shadow-xs"
                  >
                    Restore Version
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
       {/* Batch Actions Footer */}
      {!isWordFile && activeTab === 'thumbnails' && selectedPageNumbers.length > 1 && (
        <div className="p-3 border-t border-border bg-card/90 backdrop-blur-xs flex items-center justify-between text-xs">
          <span className="font-medium text-primary">{selectedPageNumbers.length} pages selected</span>
          <button
            onClick={handleDeleteSelectedPages}
            className="flex items-center space-x-1 bg-destructive/10 text-destructive hover:bg-destructive/20 px-2.5 py-1 rounded transition-colors font-medium shadow-xs"
          ><Trash2 className="h-3 w-3" /><span>Delete Selected</span>
</button>
        </div> )}</aside>);}