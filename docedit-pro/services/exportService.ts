import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import * as fabric from 'fabric';
import { useDocumentStore } from '@/store/useDocumentStore';

type TextAnnotationLike = { 
  x: number; 
  y: number; 
  text: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
};

type CommentItem = {
  id: string;
  x?: number;
  y?: number;
  text: string;
  kind?: 'sticky-note' | 'comment';
  resolved?: boolean;
};

const getViewerLayoutMetrics = (pageNumber: number, fallbackWidth: number, fallbackHeight: number) => {
  const pageLayer = document.querySelector<HTMLElement>(
    `[data-page-text-layer][data-page-number="${pageNumber}"], [data-signature-layer][data-page-number="${pageNumber}"]`
  );
  const pageContainer = pageLayer?.parentElement || document.querySelector<HTMLElement>(`[data-page-number="${pageNumber}"]`) || document.querySelector<HTMLElement>('canvas')?.parentElement;
  const rect = pageContainer?.getBoundingClientRect();

  const width = rect?.width || pageContainer?.clientWidth || fallbackWidth || 1;
  const height = rect?.height || pageContainer?.clientHeight || fallbackHeight || 1;

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
};

const parseHexColor = (hex?: string) => {
  if (!hex) return rgb(0, 0, 0);
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return rgb(0, 0, 0);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
};

export const ExportService = {
  async downloadDocument(
    file: File,
    pageAnnotations?: Record<number, string>,
    pageComments?: Record<number, CommentItem[]>,
    signatureDataUrl?: string | null,
    signaturePos?: { x: number; y: number },
    signatureSize?: { width: number; height: number },
    signaturePage: number = 1,
    pageTexts?: Record<number, TextAnnotationLike[]>
  ) {
    try {
      // 1. Force-sync any active Fabric.js canvas instances currently on screen
      const finalAnnotations = { ...(pageAnnotations || {}) };
      if (typeof document !== 'undefined') {
        const canvasElements = document.querySelectorAll<HTMLCanvasElement>('canvas');
        canvasElements.forEach((canvasEl) => {
          const pageContainer = canvasEl.closest('[data-page-number]') || canvasEl.parentElement?.parentElement;
          const pageNumAttr = pageContainer?.getAttribute('data-page-number');
          if (pageNumAttr) {
            const pNum = parseInt(pageNumAttr, 10);
            const fabricCanvas = (canvasEl as any).__fabricCanvas;
            if (fabricCanvas && typeof fabricCanvas.toJSON === 'function') {
              finalAnnotations[pNum] = JSON.stringify(fabricCanvas.toJSON());
            }
          }
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width: firstPageWidth, height: firstPageHeight } = firstPage.getSize();

      // 2. Render Fabric JSON annotations or Data URLs cleanly onto the PDF pages
      for (const [pageNumStr, rawData] of Object.entries(finalAnnotations)) {
        const pageIndex = parseInt(pageNumStr, 10) - 1;
        if (pages[pageIndex] && rawData && rawData.length > 10) {
          try {
            const page = pages[pageIndex];
            const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
            
            let dataUrl = rawData;
            
            if (!rawData.startsWith('data:image/')) {
              try {
                const parsed = JSON.parse(rawData);
                if (parsed && parsed.objects && parsed.objects.length > 0) {
                  const tempCanvasEl = document.createElement('canvas');
                  const layout = getViewerLayoutMetrics(pageIndex + 1, pdfPageWidth, pdfPageHeight);
                  tempCanvasEl.width = layout.width;
                  tempCanvasEl.height = layout.height;
                  
                  const staticCanvas = new fabric.StaticCanvas(tempCanvasEl, {
                    width: layout.width,
                    height: layout.height,
                  });
                  
                  await staticCanvas.loadFromJSON(parsed);
                  staticCanvas.renderAll();

                  dataUrl = tempCanvasEl.toDataURL('image/png');
                  staticCanvas.dispose();
                } else {
                  continue; 
                }
              } catch (parseErr) {
                dataUrl = rawData;
              }
            }

            const imageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
            let embeddedImage;
            if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
              embeddedImage = await pdfDoc.embedJpg(imageBytes);
            } else {
              embeddedImage = await pdfDoc.embedPng(imageBytes);
            }

            page.drawImage(embeddedImage, { 
              x: 0, 
              y: 0, 
              width: pdfPageWidth, 
              height: pdfPageHeight,
              opacity: 1.0 
            });
          } catch (imgErr) {
            console.warn(`Skipping annotation layer for page ${pageNumStr}:`, imgErr);
          }
        }
      }

      // 3. Harvest and Render Text Annotations directly from Zustand store and parameters
      const storeState = useDocumentStore.getState();
      const storeTextAnns = storeState.pageTextAnnotations || {};
      const combinedTextAnns: Record<number, TextAnnotationLike[]> = { ...storeTextAnns, ...(pageTexts || {}) };

      const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      if (Object.keys(combinedTextAnns).length > 0) {
        for (const [pageNumStr, texts] of Object.entries(combinedTextAnns)) {
          const pageIndex = parseInt(pageNumStr, 10) - 1;
          const page = pages[pageIndex];
          if (!page || !Array.isArray(texts)) continue;

          const { width: pagePdfWidth, height: pagePdfHeight } = page.getSize();
          const pageLayout = getViewerLayoutMetrics(pageIndex + 1, pagePdfWidth, pagePdfHeight);
          const scaleX = pagePdfWidth / pageLayout.width;
          const scaleY = pagePdfHeight / pageLayout.height;

          for (const textAnn of texts as TextAnnotationLike[]) {
            if (!textAnn.text || !textAnn.text.trim()) continue;

            const customFontSize = textAnn.fontSize || 16;
            const textSize = customFontSize * scaleY;
            const textHeight = textSize * 1.2;
            const pdfX = textAnn.x * scaleX;
            const pdfY = pagePdfHeight - (textAnn.y * scaleY) - textHeight;
            const textColor = parseHexColor(textAnn.textColor);

            page.drawText(textAnn.text, {
              x: pdfX,
              y: pdfY,
              size: textSize,
              font: defaultFont,
              color: textColor,
            });
          }
        }
      }

      // 4. Render Comments and Sticky Notes onto PDF Pages (Fix Point 2 Integration)
      const storeComments = storeState.pageComments || {};
      const combinedComments: Record<number, CommentItem[]> = { ...storeComments, ...(pageComments || {}) };

      if (Object.keys(combinedComments).length > 0) {
        for (const [pageStr, comments] of Object.entries(combinedComments)) {
          const pageNum = parseInt(pageStr, 10);
          const targetPageIndex = pageNum - 1;

          if (targetPageIndex >= 0 && targetPageIndex < pages.length && comments && comments.length > 0) {
            const page = pages[targetPageIndex];
            const { width: pagePdfWidth, height: pagePdfHeight } = page.getSize();
            const pageLayout = getViewerLayoutMetrics(pageNum, pagePdfWidth, pagePdfHeight);
            const scaleX = pagePdfWidth / pageLayout.width;
            const scaleY = pagePdfHeight / pageLayout.height;

            for (const comment of comments) {
              if (comment.resolved) continue;

              const rawX = comment.x !== undefined ? comment.x : 50;
              const rawY = comment.y !== undefined ? comment.y : pageLayout.height - 100;

              const boxWidth = 180;
              const boxHeight = 60;
              const pdfX = rawX * scaleX;
              const pdfY = pagePdfHeight - (rawY * scaleY) - boxHeight;

              // Draw comment container box
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: boxWidth,
                height: boxHeight,
                color: comment.kind === 'sticky-note' ? rgb(1, 0.95, 0.7) : rgb(0.95, 0.95, 0.95),
                borderColor: comment.kind === 'sticky-note' ? rgb(0.8, 0.7, 0.2) : rgb(0.7, 0.7, 0.7),
                borderWidth: 1,
              });

              // Draw comment header title
              page.drawText(comment.kind === 'sticky-note' ? 'Sticky Note:' : 'Comment:', {
                x: pdfX + 6,
                y: pdfY + boxHeight - 14,
                size: 9,
                font: defaultFont,
                color: rgb(0.2, 0.2, 0.2),
              });

              // Wrap and render text lines
              const textLines = wrapText(comment.text || '', 28);
              let textRenderY = pdfY + boxHeight - 28;
              for (const line of textLines.slice(0, 3)) {
                page.drawText(line, {
                  x: pdfX + 6,
                  y: textRenderY,
                  size: 8,
                  font: defaultFont,
                  color: rgb(0.1, 0.1, 0.1),
                });
                textRenderY -= 10;
              }
            }
          }
        }
      }

      // 5. Render Signatures
      if (signatureDataUrl && signatureDataUrl.length > 10) {
        const targetPageIndex = (signaturePage || 1) - 1;
        const targetPage = pages[targetPageIndex] || firstPage;
        
        const imageBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
        let embeddedSignature;
        if (signatureDataUrl.includes('image/jpeg') || signatureDataUrl.includes('image/jpg')) {
          embeddedSignature = await pdfDoc.embedJpg(imageBytes);
        } else {
          embeddedSignature = await pdfDoc.embedPng(imageBytes);
        }

        const { width: pagePdfWidth, height: pagePdfHeight } = targetPage.getSize();
        const pageLayout = getViewerLayoutMetrics(targetPageIndex + 1, pagePdfWidth, pagePdfHeight);
        const scaleX = pagePdfWidth / pageLayout.width;
        const scaleY = pagePdfHeight / pageLayout.height;

        const signaturePdfWidth = (signatureSize?.width || 150) * scaleX;
        const signaturePdfHeight = (signatureSize?.height || 75) * scaleY;

        let pdfX = 100;
        let pdfY = 100;

        if (signaturePos && typeof signaturePos.x === 'number' && typeof signaturePos.y === 'number' && !isNaN(signaturePos.x) && !isNaN(signaturePos.y)) {
          pdfX = signaturePos.x * scaleX;
          pdfY = pagePdfHeight - (signaturePos.y * scaleY) - signaturePdfHeight;
        }

        const clampedX = Math.max(0, Math.min(pdfX, pagePdfWidth - signaturePdfWidth));
        const clampedY = Math.max(0, Math.min(pdfY, pagePdfHeight - signaturePdfHeight));

        targetPage.drawImage(embeddedSignature, {
          x: clampedX, y: clampedY, width: signaturePdfWidth, height: signaturePdfHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      triggerSafeDownload(blob, `annotated_${file.name}`);
    } catch (error) {
      console.error('Failed to export document:', error);
      throw error;
    }
  },

  async exportAsWord(fileOrBlob: File | Blob, filename: string = 'document.docx', editedHtml?: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    try {
      const formData = new FormData();
      const fileToUpload = fileOrBlob instanceof File 
        ? fileOrBlob 
        : new File([fileOrBlob], filename, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      formData.append('file', fileToUpload);
      if (editedHtml) {
        formData.append('editedHtml', editedHtml);
      }

      // Route through backend conversion container service (LibreOffice / OnlyOffice pipeline)
      const response = await fetch(`${backendUrl}/api/convert/pdf-to-docx`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server conversion returned status ${response.status}`);
      }

      const convertedBlob = await response.blob();
      const safeName = filename.endsWith('.docx') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.docx`;
      triggerSafeDownload(convertedBlob, safeName);
    } catch (error) {
      console.warn('Backend Word conversion service unavailable, falling back to local fallback wrapper:', error);

      // Graceful fallback to prevent export blockages if backend container is offline
      try {
        const originalBlob = fileOrBlob instanceof Blob && !(fileOrBlob instanceof File) 
          ? fileOrBlob 
          : new Blob([await (fileOrBlob as File | Blob).arrayBuffer()], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

        if (!editedHtml) {
          triggerSafeDownload(originalBlob, filename);
          return;
        }

        const wordHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>${filename}</title>
            <style>
              body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #000000; line-height: 1.15; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
              th, td { border: 1px solid #d3d3d3; padding: 8px; text-align: left; }
              th { background-color: #001f3f; color: #ffffff; }
              h1, h2, h3 { color: #1f4e78; }
            </style>
          </head>
          <body>
            ${editedHtml}
          </body>
          </html>
        `;

        const blob = new Blob(['\ufeff' + wordHtml], {
          type: 'application/msword',
        });

        const safeName = filename.endsWith('.docx') ? filename.replace('.docx', '.doc') : `${filename}.doc`;
        triggerSafeDownload(blob, safeName);
      } catch (fallbackErr) {
        console.error('Failed fallback Word document export:', fallbackErr);
        throw fallbackErr;
      }
    }
  },
};

function wrapText(text: string, maxLineLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function triggerSafeDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  
  setTimeout(() => {
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 50);
}

export default ExportService;