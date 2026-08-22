'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUp, FileText, Loader2, X, Crop as CropIcon, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Link from 'next/link';

interface ImageItem {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string;
  size: number;
}

export default function ImageToPdfPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cropping State
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    const newItems: ImageItem[] = filesArray.map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        originalUrl: url,
        processedUrl: url,
        size: file.size,
      };
    });

    setImages((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop: Crop = {
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    setCrop(initialCrop);
    setCompletedCrop({
      unit: 'px',
      x: 0,
      y: 0,
      width,
      height,
    });
  };

  const handleApplyCrop = () => {
    if (currentCroppingIndex === null || !completedCrop || !imgRef.current) return;

    const image = imgRef.current;

    // If the crop box covers the entire image, keep original pristine image
    const isFullImageCrop = 
      completedCrop.x <= 1 && 
      completedCrop.y <= 1 && 
      completedCrop.width >= image.width - 2 && 
      completedCrop.height >= image.height - 2;

    if (isFullImageCrop) {
      setImages((prev) =>
        prev.map((item, idx) =>
          idx === currentCroppingIndex ? { ...item, processedUrl: item.originalUrl } : item
        )
      );
      setCurrentCroppingIndex(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.round(completedCrop.width * scaleX);
    canvas.height = Math.round(completedCrop.height * scaleY);
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill white background to avoid dark/transparent artifacts
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setImages((prev) =>
      prev.map((item, idx) =>
        idx === currentCroppingIndex ? { ...item, processedUrl: croppedDataUrl } : item
      )
    );

    setCurrentCroppingIndex(null);
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setLoading(true);

    try {
      const doc = new jsPDF();
      const pdfPageWidth = doc.internal.pageSize.getWidth();
      const pdfPageHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        const imgData = images[i].processedUrl;
        if (i > 0) doc.addPage();

        const imgProps = doc.getImageProperties(imgData);
        
        // Scale to fit within page bounds while maintaining exact aspect ratio
        const ratio = Math.min(pdfPageWidth / imgProps.width, pdfPageHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;

        // Center the image on the PDF page
        const x = (pdfPageWidth - w) / 2;
        const y = (pdfPageHeight - h) / 2;

        doc.addImage(imgData, 'JPEG', x, y, w, h);
      }

      doc.save('scanned-document.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-background text-foreground overflow-x-hidden">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-border/60 px-8 bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-extrabold text-base tracking-tight">DocEdit Studio & PDF Maker</h1>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          Client-Side Suite
        </span>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
        
        {/* Upload Dropzone */}
        <motion.div 
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          className="relative border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-8 text-center bg-card/50 hover:bg-card transition-all cursor-pointer group shadow-sm"
        >
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          />
          <div className="flex flex-col items-center pointer-events-none">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform shadow-inner">
              <FileUp className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-foreground">Click to upload document pages or drag & drop</span>
            <span className="text-xs text-muted-foreground mt-1">Supports multiple high-resolution scans (PNG, JPG, WEBP)</span>
          </div>
        </motion.div>

        {/* Uploaded Images List with Crop Previews */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wide text-foreground">
                Document Pages ({images.length})
              </h3>
              <p className="text-xs text-muted-foreground">Click crop to adjust borders like CamScanner</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {images.map((img, index) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/80 shadow-sm gap-3 group"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="h-14 w-14 rounded-xl overflow-hidden bg-secondary border border-border/50 shrink-0 relative">
                        <img src={img.processedUrl} alt={img.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{img.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{(img.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentCroppingIndex(index)}
                        className="h-8 px-2.5 text-xs rounded-xl border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                      >
                        <CropIcon className="h-3.5 w-3.5 mr-1" />
                        Crop
                      </Button>
                      <button
                        onClick={() => removeImage(index)}
                        className="p-2 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action Bar */}
            <div className="pt-4">
              <Button 
                className="w-full rounded-xl h-11 text-xs font-bold shadow-lg shadow-primary/10 transition-all" 
                onClick={convertToPdf}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Compiling Scans into PDF...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Scanned PDF ({images.length} Pages)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CamScanner-style Free Cropping Modal */}
      {currentCroppingIndex !== null && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl p-6 max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Crop Page Border</h3>
                <p className="text-xs text-muted-foreground">Drag handles freely to select document boundaries</p>
              </div>
              <button 
                onClick={() => setCurrentCroppingIndex(null)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Crop Area Container */}
            <div className="flex-1 overflow-auto bg-secondary/30 rounded-2xl p-6 max-h-[65vh] border border-border/40 text-center">
              <div className="inline-block max-w-full">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <img
                    ref={imgRef}
                    src={images[currentCroppingIndex].originalUrl}
                    onLoad={onImageLoad}
                    alt="Crop preview"
                    style={{ maxHeight: '50vh', display: 'block', margin: '0 auto', borderRadius: '0.5rem' }}
                  />
                </ReactCrop>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setCurrentCroppingIndex(null)}
                className="rounded-xl h-10 px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCrop}
                className="rounded-xl h-10 px-6 text-xs font-bold shadow-md"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Apply Crop
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}