'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDocumentStore } from '@/store/useDocumentStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ThumbnailSidebar from '@/components/editor/ThumbnailSidebar';
import ViewportControls from '@/components/editor/ViewportControls';
import KeyboardShortcuts from '@/components/editor/KeyboardShortcuts';
import DocumentSearch from '@/components/editor/DocumentSearch';
import Toolbar from '@/components/editor/Toolbar';
import AnnotationToolbar from '@/components/editor/AnnotationToolbar';
import SignatureModal from '@/components/editor/SignatureModal';
import { 
  FileUp, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  PanelLeft,
  Undo2,
  Redo2,
  X
} from 'lucide-react';
import { ExportService } from '@/services/exportService';

const PdfViewer = dynamic(
  () => import('@/components/editor/PdfViewer').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading PDF Viewer...
      </div>
    ),
  }
);

export default function PdfPage() {
  const { 
    activeFile, 
    setActiveFile, 
    zoomLevel, 
    setZoomLevel, 
    toggleSidebar,
    undo,
    redo,
    signatureDataUrl,
    setSignatureDataUrl,
    signaturePosition,
    signatureSize,
    signaturePage,
    activeTool,
    pageAnnotations,
    pageComments,
    sidebarOpen,
  } = useDocumentStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isPdfFile = useMemo(() => {
    if (!activeFile) return false;
    return activeFile.type === 'application/pdf' || activeFile.name.toLowerCase().endsWith('.pdf');
  }, [activeFile]);

  const fileUrl = useMemo(() => {
    if (!activeFile || !isPdfFile) return null;
    return URL.createObjectURL(activeFile);
  }, [activeFile, isPdfFile]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleLoadSuccess = useCallback((count: number) => {
    setNumPages(count);
  }, []);

  const handleExport = useCallback(async () => {
    if (!activeFile || !isPdfFile) return;

    ExportService.downloadDocument(
      activeFile,
      pageAnnotations,
      pageComments,
      signatureDataUrl ?? undefined,
      signaturePosition,
      signatureSize,
      signaturePage
    );
  }, [activeFile, isPdfFile, pageAnnotations, pageComments, signatureDataUrl, signaturePosition, signatureSize, signaturePage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      if (uploadedFile.name.toLowerCase().endsWith('.pdf') || uploadedFile.type === 'application/pdf') {
        setActiveFile(uploadedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.pdf') || droppedFile.type === 'application/pdf') {
        setActiveFile(droppedFile);
      }
    }
  };

  if (!isMounted) {
    return <main className="flex h-screen w-screen bg-background" />;
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      <KeyboardShortcuts />

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onInsertSignature={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setIsSignatureModalOpen(false);
        }}
      />

      {/* Top Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border px-4 bg-card gap-3 overflow-x-auto flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="flex-shrink-0">
            <PanelLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <span className="font-semibold tracking-tight flex-shrink-0 text-sm">DocEdit Pro - PDF Studio</span>
          <Separator orientation="vertical" className="h-6 flex-shrink-0" />
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="text-sm text-muted-foreground truncate max-w-[150px] min-w-0">
              {activeFile ? activeFile.name : 'No PDF loaded'}
            </span>
            {activeFile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-destructive/15 hover:text-destructive flex-shrink-0"
                onClick={() => setActiveFile(null as any)}
                title="Close document"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-shrink flex items-center justify-center overflow-x-auto min-w-0 px-2">
          <Toolbar 
            isSearchOpen={isSearchOpen} 
            setIsSearchOpen={setIsSearchOpen} 
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          />
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center space-x-1 border-r border-border pr-2 mr-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 mr-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{zoomLevel}%</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 200))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            size="sm" 
            className="h-8 text-xs"
            disabled={!activeFile || !isPdfFile}
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
        </div>
      </header>

      {/* Contextual Annotation Toolbar */}
      {activeTool && activeTool !== 'select' && (
        <div className="flex justify-center border-b border-border bg-card/50 py-2 z-30">
          <AnnotationToolbar />
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {isSearchOpen && <DocumentSearch onClose={() => setIsSearchOpen(false)} />}
        
        {sidebarOpen && activeFile && (
          <ThumbnailSidebar 
            numPages={numPages} 
          />
        )}
        
        <section className="flex-1 bg-secondary/30 flex items-center justify-center relative overflow-auto p-0">
          {!activeFile || !isPdfFile ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 bg-card text-center max-w-md shadow-sm transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <FileUp className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Drag & Drop PDF file here</h2>
              <p className="text-sm text-muted-foreground mb-6">Supports PDF documents up to 50MB</p>
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 py-2 hover:bg-primary/90 transition-colors">
                <span>Browse PDF</span>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>
          ) : (
            <div className="p-8 w-full h-full flex flex-col items-center justify-center">
              <PdfViewer 
                fileUrl={fileUrl!} 
                zoomLevel={zoomLevel} 
                onLoadSuccess={handleLoadSuccess} 
              />
              <ViewportControls />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}