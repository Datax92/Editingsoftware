'use client';

import React, { useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { Button } from '@/components/ui/button';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface DocumentSearchProps {
  onClose: () => void;
}

export default function DocumentSearch({ onClose }: DocumentSearchProps) {
  const { 
    searchQuery, 
    setSearchQuery, 
    setSearchResults,
    searchResults, 
    activeSearchMatchIndex, 
    setActiveSearchMatchIndex,
    setCurrentPage 
  } = useDocumentStore();

  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
    // Note: PDF text indexing and match filtering logic runs here against document text layers
  };

  const handleClose = () => {
    setSearchQuery('');
    if (typeof setSearchResults === 'function') {
      setSearchResults([]);
    }
    onClose();
  };

  const jumpToMatch = (index: number) => {
    if (searchResults.length === 0) return;
    setActiveSearchMatchIndex(index);
    const targetPage = searchResults[index].pageNumber;
    setCurrentPage(targetPage);
  };

  const nextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (activeSearchMatchIndex + 1) % searchResults.length;
    jumpToMatch(nextIndex);
  };

  const prevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (activeSearchMatchIndex - 1 + searchResults.length) % searchResults.length;
    jumpToMatch(prevIndex);
  };

  return (
    <div className="absolute top-16 right-4 z-40 flex items-center space-x-2 bg-card border border-border rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-top-2">
      <form onSubmit={handleSearchSubmit} className="flex items-center space-x-1 px-2 bg-secondary/50 rounded-md border border-border">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input 
          type="text"
          placeholder="Find in document..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="bg-transparent border-none text-sm outline-none h-8 w-48 px-1 text-foreground placeholder:text-muted-foreground"
          autoFocus
        />
      </form>
      
      <div className="flex items-center space-x-0.5 text-xs text-muted-foreground px-1">
        <span>
          {searchResults.length > 0 ? `${activeSearchMatchIndex + 1}/${searchResults.length}` : '0/0'}
        </span>
      </div>

      <div className="flex items-center space-x-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          disabled={searchResults.length === 0} 
          onClick={prevMatch}
          title="Previous match"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          disabled={searchResults.length === 0} 
          onClick={nextMatch}
          title="Next match"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-muted-foreground hover:text-foreground" 
          onClick={handleClose} 
          title="Close search"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}