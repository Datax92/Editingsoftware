'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ConversionService } from '@/services/conversionService';
import { 
  ArrowLeft, 
  FileUp, 
  FileText, 
  Download, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

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

export default function ConversionPage() {
  const [conversionType, setConversionType] = useState<'docx-to-pdf' | 'pdf-to-docx'>('docx-to-pdf');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSuccessMessage(false);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsProcessing(true);
    setSuccessMessage(false);
    setStatusMessage(
      conversionType === 'docx-to-pdf' 
        ? 'Converting Word document to PDF via LibreOffice...' 
        : 'Extracting and converting PDF to Word document...'
    );

    try {
      let resultBlob: Blob;
      let outputFilename = '';

      if (conversionType === 'docx-to-pdf') {
        resultBlob = await ConversionService.convertDocxToPdf(file);
        outputFilename = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
      } else {
        resultBlob = await ConversionService.convertPdfToDocx(file);
        outputFilename = file.name.replace(/\.[^/.]+$/, '') + '.docx';
      }

      // Trigger automatic file download in browser
      const downloadUrl = window.URL.createObjectURL(resultBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage(true);
      setStatusMessage('Conversion successful! Your file has been downloaded.');
    } catch (error: any) {
      console.error('Conversion error:', error);
      setStatusMessage(`Error: ${error.message || 'Conversion failed.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="relative flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden selection:bg-primary/20">
      {/* Decorative Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-18 items-center justify-between border-b border-border/60 px-8 bg-card/80 backdrop-blur-md flex-shrink-0 z-20 shadow-xs"
      >
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
            Dashboard Hub
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h1 className="font-extrabold text-foreground text-base tracking-tight">Document Conversion Suite</h1>
          </div>
        </div>
      </motion.header>

      {/* Main Body */}
      <div className="flex flex-1 items-center justify-center p-6 overflow-auto relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl w-full bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-8 shadow-xl shadow-black/[0.02] flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

          {/* Tabs */}
          <motion.div variants={itemVariants} className="flex bg-secondary/80 p-1.5 rounded-xl w-full mb-8 border border-border/50">
            <button
              onClick={() => { setConversionType('docx-to-pdf'); setFile(null); setSuccessMessage(false); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                conversionType === 'docx-to-pdf' ? 'bg-background text-foreground shadow-md shadow-black/[0.04]' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Word (.docx) to PDF
            </button>
            <button
              onClick={() => { setConversionType('pdf-to-docx'); setFile(null); setSuccessMessage(false); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                conversionType === 'pdf-to-docx' ? 'bg-background text-foreground shadow-md shadow-black/[0.04]' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              PDF to Word (.docx)
            </button>
          </motion.div>

          {/* Upload Box */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            className="w-full border-2 border-dashed border-border/80 rounded-xl p-8 bg-secondary/20 flex flex-col items-center justify-center mb-6 relative hover:border-primary/50 transition-colors group cursor-pointer"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3.5 text-primary shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <FileUp className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-bold mb-1.5 text-foreground">
              {file ? file.name : (conversionType === 'docx-to-pdf' ? 'Upload a Word Document (.docx)' : 'Upload a PDF Document (.pdf)')}
            </h2>
            <p className="text-xs text-muted-foreground mb-5 font-medium">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Drag and drop or browse from your computer'}
            </p>
            <label className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold h-9 px-5 hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
              <span>Browse File</span>
              <input 
                type="file" 
                accept={conversionType === 'docx-to-pdf' ? '.docx,.doc' : '.pdf'} 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </label>
          </motion.div>

          {/* Status & Progress */}
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-xs font-semibold text-primary mb-6 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl w-full justify-center"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl w-full justify-center"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMessage}</span>
            </motion.div>
          )}

          {/* Action Button */}
          <motion.div variants={itemVariants} className="w-full">
            <Button
              className="w-full h-11 text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
              disabled={!file || isProcessing}
              onClick={handleConvert}
            >
              <Download className="w-4 h-4 mr-2" />
              Convert & Download File
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </main>
  );
}