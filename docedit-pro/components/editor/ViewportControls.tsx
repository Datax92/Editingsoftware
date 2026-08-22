'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';

export default function ViewportControls() {
  const { currentPage, setCurrentPage } = useDocumentStore();

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-card/90 backdrop-blur border border-border rounded-full shadow-lg px-4 py-1.5 z-30 select-none">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 rounded-full" 
        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
        title="Previous Page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs font-medium px-2">
        Page {currentPage}
      </span>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 rounded-full" 
        onClick={() => setCurrentPage(currentPage + 1)}
        title="Next Page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}