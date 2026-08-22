'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useDocumentStore } from '@/store/useDocumentStore';
import { OcrService } from '@/services/ocrService';
import AnnotationLayer from './AnnotationLayer';
import TextLayer from './TextLayer';
import SignatureLayer from './SignatureLayer';
import AcroFormOverlay from './AcroFormOverlay';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export interface PdfViewerProps {
  fileUrl: string;
  zoomLevel: number;
  onLoadSuccess: (numPages: number) => void;
}

interface TextHighlight {
  left: number;
  top: number;
  width: number;
  height: number;
}

function PdfViewer({ 
  fileUrl, 
  zoomLevel, 
  onLoadSuccess 
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pageHighlights, setPageHighlights] = useState<TextHighlight[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  
  const currentPage = useDocumentStore((state) => state.currentPage);
  const signatureDataUrl = useDocumentStore((state) => state.signatureDataUrl);
  const setSignatureDataUrl = useDocumentStore((state) => state.setSignatureDataUrl);
  const signaturePage = useDocumentStore((state) => (state as any).signaturePage ?? 1);
  const searchQuery = useDocumentStore((state) => state.searchQuery);
  const setSearchResults = useDocumentStore((state) => state.setSearchResults);
  const activeFile = useDocumentStore((state) => state.activeFile);
  const setActiveFile = useDocumentStore((state) => state.setActiveFile);

  // Effect to scan all PDF pages for the search query when it changes
  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      if (!pdfDoc || !searchQuery || searchQuery.trim() === '') {
        if (typeof setSearchResults === 'function') {
          setSearchResults([]);
        }
        setPageHighlights([]);
        return;
      }

      try {
        const results: any[] = [];
        const queryLower = searchQuery.toLowerCase();

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (isCancelled) return;
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();

          let pageFullText = '';
          textContent.items.forEach((item: any) => {
            if (item.str) {
              pageFullText += item.str + ' ';
            }
          });

          if (pageFullText.toLowerCase().includes(queryLower)) {
            results.push({
              pageNumber: pageNum,
              text: pageFullText.trim(),
              itemIndex: 0,
            });
          }
        }

        if (!isCancelled && typeof setSearchResults === 'function') {
          setSearchResults(results);
        }
      } catch (error: any) {
        const errStr = error?.toString() || '';
        if (!errStr.includes('Transport destroyed') && error?.name !== 'RenderingCancelled' && error?.name !== 'RenderingCancelledException') {
          console.error('Error executing document search:', error);
        }
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, searchQuery, setSearchResults]);

  // Effect to extract bounding boxes for current page search matches to display highlights
  useEffect(() => {
    let isMounted = true;

    const extractHighlights = async () => {
      if (!pdfDoc || !searchQuery || searchQuery.trim() === '') {
        setPageHighlights([]);
        return;
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: zoomLevel / 100 });
        const queryLower = searchQuery.toLowerCase();
        const highlights: TextHighlight[] = [];

        textContent.items.forEach((item: any) => {
          if (!item.str) return;
          if (item.str.toLowerCase().includes(queryLower)) {
            const tx = item.transform;
            const x = tx[4];
            const y = tx[5];
            const coord = viewport.convertToViewportPoint(x, y);
            const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            const scaledFontSize = fontSize * (zoomLevel / 100);

            highlights.push({
              left: coord[0],
              top: coord[1] - scaledFontSize,
              width: item.width ? item.width * (zoomLevel / 100) : searchQuery.length * 8,
              height: scaledFontSize * 1.2,
            });
          }
        });

        if (isMounted) {
          setPageHighlights(highlights);
        }
      } catch (err: any) {
        const errStr = err?.toString() || '';
        if (!errStr.includes('Transport destroyed')) {
          console.error('Error extracting text highlights:', err);
        }
      }
    };

    extractHighlights();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, searchQuery, currentPage, zoomLevel]);

  useEffect(() => {
    let isMounted = true;
    let loadingTask: any = null;

    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const loadedPdfDoc = await loadingTask.promise;

        if (!isMounted) return;
        setPdfDoc(loadedPdfDoc);
        onLoadSuccess(loadedPdfDoc.numPages);

        // Automatic background OCR check for scanned PDFs without text layers
        if (activeFile && activeFile.type === 'application/pdf') {
          try {
            const firstPage = await loadedPdfDoc.getPage(1);
            const textContent = await firstPage.getTextContent();
            if (!textContent.items || textContent.items.length === 0) {
              setOcrStatus('Enhancing scanned document with background OCR...');
              const jobId = await OcrService.enqueueOcr(activeFile);
              
              const result = await OcrService.pollOcrJob(jobId, (state) => {
                setOcrStatus(`OCR Processing (${state})...`);
              });

              if (result && (result.fileUrl || result.downloadUrl)) {
                const res = await fetch(result.fileUrl || result.downloadUrl);
                const blob = await res.blob();
                const newFile = new File([blob], activeFile.name, { type: 'application/pdf' });
                setActiveFile(newFile);
              }
              setOcrStatus(null);
            }
          } catch (ocrErr) {
            console.error('Auto-OCR background check error:', ocrErr);
            setOcrStatus(null);
          }
        }
      } catch (error: any) {
        const errStr = error?.toString() || '';
        if (!errStr.includes('Transport destroyed') && error?.name !== 'RenderingCancelled' && error?.name !== 'RenderingCancelledException') {
          console.error('Error loading PDF document:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (loadingTask?.destroy) {
        try {
          loadingTask.destroy();
        } catch (e) {}
      }
    };
  }, [fileUrl, onLoadSuccess, activeFile, setActiveFile]);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!pdfDoc) return;

      try {
        setLoading(true);
        const pageToRender = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
        const page = await pdfDoc.getPage(pageToRender);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        const scale = (zoomLevel / 100) * dpr;
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const displayWidth = viewport.width / dpr;
        const displayHeight = viewport.height / dpr;

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        setCanvasDimensions({ width: displayWidth, height: displayHeight });

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;

        if (isMounted) {
          setLoading(false);
        }
      } catch (error: any) {
        const errStr = error?.toString() || '';
        if (!errStr.includes('Transport destroyed') && error?.name !== 'RenderingCancelled' && error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF:', error);
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, currentPage, zoomLevel]);

  return (
    <div className="flex flex-col items-center shadow-lg rounded border border-border bg-card p-4 relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground z-30 rounded">
          {ocrStatus || `Rendering PDF page ${currentPage}...`}
        </div>
      )}
      
      <div className="relative inline-block" style={{ width: canvasDimensions.width || 'auto', height: canvasDimensions.height || 'auto' }}>
        <canvas ref={canvasRef} className="shadow-sm block" />
        
        {/* Temporary Search Query Highlights Overlay */}
        {pageHighlights.map((hl, index) => (
          <div
            key={index}
            className="absolute bg-yellow-300/60 dark:bg-yellow-500/50 border border-yellow-400 rounded pointer-events-none z-30 transition-all duration-200"
            style={{
              left: `${hl.left}px`,
              top: `${hl.top}px`,
              width: `${hl.width}px`,
              height: `${hl.height}px`,
            }}
          />
        ))}

        {canvasDimensions.width > 0 && (
          <>
            <TextLayer width={canvasDimensions.width} height={canvasDimensions.height} pageNumber={currentPage} />
            <AnnotationLayer width={canvasDimensions.width} height={canvasDimensions.height} />
            {signaturePage === currentPage && (
              <SignatureLayer 
                signatureDataUrl={signatureDataUrl} 
                onRemove={() => setSignatureDataUrl(null)}
                pageNumber={currentPage}
              />
            )}
            {activeFile && (
              <AcroFormOverlay 
                file={activeFile}
                pageNumber={currentPage}
                scale={zoomLevel / 100}
                onFieldChange={(updatedFile) => setActiveFile(updatedFile)}
              />
            )}
          </>
        )}
      </div>
  </div>
  );
}
export default PdfViewer;