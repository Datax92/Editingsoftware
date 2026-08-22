'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileUp, Scissors, Download, Loader2, FileText, Check } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<'range' | 'individual'>('range');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    try {
      const buffer = await uploadedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const count = pdfDoc.getPageCount();

      setFile(uploadedFile);
      setPageCount(count);
      setStartPage(1);
      setEndPage(count);
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitPdf = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(buffer);

      if (splitMode === 'range') {
        const s = Math.max(1, Math.min(startPage, pageCount));
        const e = Math.max(s, Math.min(endPage, pageCount));

        const subDoc = await PDFDocument.create();
        const indices = Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
        const copiedPages = await subDoc.copyPages(sourceDoc, indices);
        copiedPages.forEach((page) => subDoc.addPage(page));

        const pdfBytes = await subDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `split-pages-${s}-to-${e}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        for (let i = 0; i < pageCount; i++) {
          const subDoc = await PDFDocument.create();
          const [copiedPage] = await subDoc.copyPages(sourceDoc, [i]);
          subDoc.addPage(copiedPage);

          const pdfBytes = await subDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `${file.name.replace(/\.[^/.]+$/, '')}-page-${i + 1}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    } catch (error) {
      console.error('Error splitting PDF:', error);
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
          <h1 className="font-extrabold text-base tracking-tight">PDF Splitter Studio</h1>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
          Client-Side Processing
        </span>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6 justify-center">
        {!file ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative border-2 border-dashed border-border/80 hover:border-primary/60 rounded-3xl p-12 text-center bg-card/50 hover:bg-card transition-all cursor-pointer group shadow-lg"
          >
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="flex flex-col items-center pointer-events-none">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform shadow-inner">
                <Scissors className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground mb-1">Upload PDF to Split</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Select any multi-page PDF document to extract page ranges or separate individual pages instantly.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-3xl p-8 shadow-xl flex flex-col gap-6"
          >
            {/* File Info Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/40 border border-border/50">
              <div className="flex items-center space-x-3 truncate">
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pageCount} Pages Total</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFile(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Change File
              </Button>
            </div>

            {/* Split Mode Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSplitMode('range')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  splitMode === 'range'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border/80 bg-card hover:border-border text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Extract Range</span>
                  {splitMode === 'range' && <Check className="h-4 w-4" />}
                </div>
                <span className="text-[11px] text-muted-foreground">Save a custom section (e.g., Page 3 to 7)</span>
              </button>

              <button
                onClick={() => setSplitMode('individual')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  splitMode === 'individual'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border/80 bg-card hover:border-border text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Extract All Pages</span>
                  {splitMode === 'individual' && <Check className="h-4 w-4" />}
                </div>
                <span className="text-[11px] text-muted-foreground">Split every page into separate PDF files</span>
              </button>
            </div>

            {/* Range Inputs */}
            {splitMode === 'range' && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Start Page</label>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={startPage}
                    onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">End Page</label>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={endPage}
                    onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSplitPdf}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xs tracking-wide shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Processing PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{splitMode === 'range' ? `Download Pages ${startPage}-${endPage}` : `Download All ${pageCount} Pages Separately`}</span>
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}