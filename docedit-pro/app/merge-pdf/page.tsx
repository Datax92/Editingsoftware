'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileUp, Files, Download, Loader2, FileText, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    const pdfsOnly = uploadedFiles.filter((file) => file.type === 'application/pdf');
    if (pdfsOnly.length > 0) {
      setFiles((prev) => [...prev, ...pdfsOnly]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const handleMergePdfs = async () => {
    if (files.length < 2) return;
    setLoading(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `merged-document-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error merging PDFs:', error);
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
          <h1 className="font-extrabold text-base tracking-tight">Merge PDF Studio</h1>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
          Client-Side Processing
        </span>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6 justify-center">
        {files.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative border-2 border-dashed border-border/80 hover:border-primary/60 rounded-3xl p-12 text-center bg-card/50 hover:bg-card transition-all cursor-pointer group shadow-lg"
          >
            <input 
              type="file" 
              accept=".pdf" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="flex flex-col items-center pointer-events-none">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Files className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground mb-1">Upload PDFs to Merge</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Select multiple PDF files to combine them into a single ordered document instantly.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-3xl p-8 shadow-xl flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Selected Files ({files.length})</h2>
                <p className="text-xs text-muted-foreground">Rearrange or remove files before merging.</p>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors">
                  + Add More PDFs
                </span>
                <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {/* File List */}
            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/50 group"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">{index + 1}</span>
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{file.name}</span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => moveFile(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveFile(index, 'down')}
                        disabled={index === files.length - 1}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                className="w-1/3 h-12 rounded-2xl text-xs font-bold"
              >
                Clear All
              </Button>
              
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleMergePdfs}
                disabled={loading || files.length < 2}
                className="w-2/3 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xs tracking-wide shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Merge & Download PDF</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}