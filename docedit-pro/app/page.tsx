'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Variants } from 'framer-motion';
import { 
  FileText, 
  FileCode, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  FileImage,
  Scissors,
  Files
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } 
  },
};

export default function DashboardPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col bg-background text-foreground selection:bg-primary/25">
      {/* Decorative Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Top Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-20 items-center justify-between border-b border-border/40 px-8 lg:px-12 bg-background/70 backdrop-blur-xl sticky top-0 z-30 transition-all shadow-xs"
      >
        <div className="flex items-center space-x-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2.5">
              DocEdit Pro
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/25 shadow-2xs">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Advanced Document Processing & AI Suite</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-secondary/50 border border-border/60 px-4 py-2 rounded-full shadow-2xs backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-xs font-semibold text-foreground tracking-wide">Workspace Active</span>
        </div>
      </motion.header>

      {/* Main Hub Body */}
      <div className="flex flex-1 flex-col items-center py-10 px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl w-full text-center mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Productivity Engine</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-foreground mb-2 sm:text-4xl">
            Document Workspace Hub
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Select a specialized workspace below to begin editing, converting, merging, splitting, or scanning your files securely.
          </p>
        </motion.div>

        {/* Workspace Cards Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 max-w-7xl w-full"
        >
          
          {/* 1. Word Document Editor */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  OnlyOffice
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                Word Editor
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Professional document editing with real-time collaboration options.
              </p>
            </div>

            <Link
              href="/word"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

          {/* 2. PDF Editor & Viewer */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <FileCode className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  PDF Suite
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                PDF Editor
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                View, annotate, and edit PDF documents with digital signatures.
              </p>
            </div>

            <Link
              href="/pdf"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

          {/* 3. Document Conversion Suite */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  LibreOffice
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                Converter
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Convert Word documents to PDF and PDFs back to editable Word files.
              </p>
            </div>

            <Link
              href="/convert"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

          {/* 4. Images to PDF */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <FileImage className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  Client-Side
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                Images to PDF
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Combine multiple PNG, JPG, or WEBP images into a clean PDF.
              </p>
            </div>

            <Link
              href="/image-to-pdf"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

          {/* 5. PDF Splitter Studio */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Scissors className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  Splitter
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                PDF Splitter
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Extract custom page ranges or split documents into individual files.
              </p>
            </div>

            <Link
              href="/split-pdf"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

          {/* 6. Merge PDF Studio */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-lg shadow-black/[0.02] flex flex-col justify-between group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Files className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider border border-border/50">
                  Merger
                </span>
              </div>
              <h3 className="font-extrabold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                PDF Merger
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Combine multiple PDF documents into a single ordered file instantly.
              </p>
            </div>

            <Link
              href="/merge-pdf"
              className="inline-flex items-center text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200"
            >
              Launch <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="h-14 border-t border-border/60 px-8 flex items-center justify-center bg-card/80 backdrop-blur-md flex-shrink-0 z-20"
      >
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
          <span>DocEdit Pro Enterprise Edition</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span className="text-foreground/80">DataX Internship Submission</span>
        </p>
      </motion.footer>
    </main>
  );
}