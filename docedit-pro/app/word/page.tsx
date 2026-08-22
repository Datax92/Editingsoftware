'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, FileText } from 'lucide-react';
import WordEditorView from '@/components/editor/word/WordEditorView';

export default function WordPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header & Branding */}
      <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shadow-sm shrink-0 z-40">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors p-2 rounded-xl hover:bg-secondary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Dashboard Hub
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-card-foreground text-sm tracking-tight">Word Document Workspace (OnlyOffice)</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedFile && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedFile(null)}
              className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              Upload Different File
            </motion.button>
          )}
          <div className="text-xs font-semibold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 shadow-sm">
            DocEdit Pro Enterprise
          </div>
        </div>
      </header>

      {/* Main Content Area filling remaining height */}
      <div className="flex-1 flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center p-6 bg-background"
            >
              <motion.div 
                whileHover={{ scale: 1.005 }}
                className="max-w-md w-full bg-card p-8 rounded-3xl shadow-lg border border-border/80 text-center relative group"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-card-foreground mb-2 tracking-tight">Open Word Document</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Upload a `.docx` file to launch your high-fidelity OnlyOffice editor suite.
                </p>
                <motion.label 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-primary/20"
                >
                  <span>Choose Word Document (.docx)</span>
                  <input
                    type="file"
                    accept=".docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </motion.label>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="editor-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 w-full h-full overflow-hidden flex flex-col bg-background"
            >
              <WordEditorView file={selectedFile} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}