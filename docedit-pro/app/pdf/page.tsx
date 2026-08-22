'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
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
import { OcrService } from '@/services/ocrService';
import { 
  FileUp, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  PanelLeft,
  Undo2,
  Redo2,
  X,
  ArrowLeft,
  FileText,
  Loader2,
  ScanLine,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ExportService } from '@/services/exportService';

const PdfViewer = dynamic(
  () => import('@/components/editor/PdfViewer').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground font-medium">
        Loading PDF Viewer...
      </div>
    ),
  }
);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } 
  },
};

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

  // OCR Processing States
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');

  // Toolbar Scroll Reference for Arrow Controls & Discoverability
  const toolbarScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState<boolean>(false);
  const [showRightScroll, setShowRightScroll] = useState<boolean>(true);

  const checkScrollPosition = () => {
    if (toolbarScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = toolbarScrollRef.current;
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollToolbar = (direction: 'left' | 'right') => {
    if (toolbarScrollRef.current) {
      const scrollAmount = 200;
      toolbarScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const scrollContainer = toolbarScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => scrollContainer.removeEventListener('scroll', checkScrollPosition);
    }
  }, [isMounted]);

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

  // Handler to process file through backend BullMQ OCR Service
  const processOcrAndSetFile = async (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.pdf') && uploadedFile.type !== 'application/pdf') {
      return;
    }

    setIsOcrProcessing(true);
    setOcrStatus('Enqueueing document for automatic OCR scanning...');

    try {
      // 1. Send file to backend Express POST /api/ocr route
      const jobId = await OcrService.enqueueOcr(uploadedFile);
      setOcrStatus('Processing OCR scan in background queue...');

      // 2. Poll Express GET /api/ocr/:jobId until BullMQ job finishes
      const result = await OcrService.pollOcrJob(jobId, (state) => {
        setOcrStatus(`OCR Queue Status: ${state.toUpperCase()}...`);
      });

      setOcrStatus('OCR complete! Preparing document workspace...');

      // 3. Check if worker returned a processed searchable PDF URL
      let finalFile = uploadedFile;
      const pdfResultUrl = result?.url || result?.downloadUrl || result?.fileUrl;

      if (pdfResultUrl) {
        try {
          const response = await fetch(pdfResultUrl);
          if (response.ok) {
            const blob = await response.blob();
            finalFile = new File([blob], uploadedFile.name, { type: 'application/pdf' });
          }
        } catch (fetchErr) {
          console.warn('Could not fetch searchable PDF result, using uploaded file:', fetchErr);
        }
      }

      setActiveFile(finalFile);
    } catch (error) {
      console.error('Automated OCR scanning error:', error);
      // Fallback: load uploaded original file so work is not blocked
      setActiveFile(uploadedFile);
    } finally {
      setIsOcrProcessing(false);
      setOcrStatus('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processOcrAndSetFile(e.target.files[0]);
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
      processOcrAndSetFile(e.dataTransfer.files[0]);
    }
  };

  if (!isMounted) {
    return <main className="flex h-screen w-screen bg-background" />;
  }

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* Decorative Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
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
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-16 items-center justify-between border-b border-border/60 px-6 bg-card/80 backdrop-blur-md gap-3 flex-shrink-0 z-20 shadow-xs"
      >
        <div className="flex items-center space-x-3.5 min-w-0 flex-shrink-0">
          <Link
            href="/"
            className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors group flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
            Dashboard Hub
          </Link>
          <div className="h-4 w-px bg-border/80 flex-shrink-0" />
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="flex-shrink-0 h-9 w-9 rounded-xl hover:bg-secondary" title="Toggle Sidebar">
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <FileText className="h-4 w-4 text-red-500" />
            </div>
            <h1 className="font-extrabold text-foreground text-base tracking-tight">PDF Studio Workspace</h1>
          </div>
          <Separator orientation="vertical" className="h-6 flex-shrink-0 bg-border/80" />
          <div className="flex items-center space-x-2 min-w-0 bg-secondary/50 px-3 py-1 rounded-lg border border-border/50">
            <span className="text-xs font-semibold text-muted-foreground truncate max-w-[150px] min-w-0">
              {activeFile ? activeFile.name : 'No PDF loaded'}
            </span>
            {activeFile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-destructive/15 hover:text-destructive flex-shrink-0"
                onClick={() => setActiveFile(null as any)}
                title="Close document"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Scrollable Toolbar Container with Discoverability Cues */}
        <div className="flex-1 flex items-center justify-center relative min-w-0 px-8 max-w-2xl">
          {showLeftScroll && (
            <div className="absolute left-0 z-10 flex items-center h-full bg-gradient-to-r from-card via-card/90 to-transparent pr-2 pl-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-full shadow-md bg-card hover:bg-secondary text-foreground border-border/80"
                onClick={() => scrollToolbar('left')}
                title="Scroll left for more tools"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div 
            ref={toolbarScrollRef}
            className="flex items-center overflow-x-auto scrollbar-none no-scrollbar py-1 px-1 space-x-1 max-w-full relative scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <Toolbar 
              isSearchOpen={isSearchOpen} 
              setIsSearchOpen={setIsSearchOpen} 
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            />
          </div>

          {showRightScroll && (
            <div className="absolute right-0 z-10 flex items-center h-full bg-gradient-to-l from-card via-card/90 to-transparent pl-2 pr-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-full shadow-md bg-card hover:bg-secondary text-foreground border-border/80 animate-pulse"
                onClick={() => scrollToolbar('right')}
                title="Scroll right for more tools"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <div className="flex items-center space-x-1 border-r border-border/80 pr-2.5 mr-0.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-lg shadow-2xs"
              onClick={() => undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-lg shadow-2xs"
              onClick={() => redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 mr-1.5 bg-secondary/50 p-1 rounded-lg border border-border/50">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-md hover:bg-background"
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-bold w-12 text-center">{zoomLevel}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-md hover:bg-background"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 200))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button 
            size="sm" 
            className="h-9 text-xs font-bold rounded-xl shadow-md shadow-primary/20"
            disabled={!activeFile || !isPdfFile || isOcrProcessing}
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export PDF
          </Button>
        </div>
      </motion.header>

      {/* Contextual Annotation Toolbar */}
      {activeTool && activeTool !== 'select' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center border-b border-border/60 bg-card/80 backdrop-blur-md py-2.5 z-30 shadow-xs"
        >
          <AnnotationToolbar />
        </motion.div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {isSearchOpen && <DocumentSearch onClose={() => setIsSearchOpen(false)} />}
        
        {sidebarOpen && activeFile && !isOcrProcessing && (
          <ThumbnailSidebar 
            numPages={numPages} 
          />
        )}
        
        <section className="flex-1 bg-secondary/30 flex items-center justify-center relative overflow-auto p-0">
          {isOcrProcessing ? (
            /* CamScanner-like OCR Progress UI */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center border border-border/80 rounded-2xl p-10 bg-card/90 backdrop-blur-sm text-center max-w-md shadow-xl shadow-black/[0.02]"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary relative shadow-inner">
                <ScanLine className="h-7 w-7 animate-pulse" />
                <Loader2 className="h-10 w-10 animate-spin absolute text-primary/60" />
              </div>
              <h2 className="text-base font-extrabold text-foreground mb-1.5">Scanning Document (OCR Engine)...</h2>
              <p className="text-xs text-muted-foreground mb-5 font-medium">{ocrStatus}</p>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/50">
                <div className="bg-primary h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </motion.div>
          ) : !activeFile || !isPdfFile ? (
            /* Upload Dropzone UI */
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 bg-card/90 backdrop-blur-sm text-center max-w-md shadow-xl shadow-black/[0.02] transition-colors cursor-pointer group relative overflow-hidden ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-primary/50'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
              
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <FileUp className="h-6 w-6" />
              </div>
              <h2 className="text-base font-extrabold mb-1.5 text-foreground">Drag & Drop PDF file here</h2>
              <p className="text-xs text-muted-foreground mb-6 font-medium">Supports PDF documents up to 50MB (Auto-scanned with OCR)</p>
              <label className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold h-10 px-6 hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
                <span>Browse PDF</span>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </motion.div>
          ) : (
            /* PDF Viewer Canvas */
            <div className="p-8 w-full h-full flex flex-col items-center justify-center relative">
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