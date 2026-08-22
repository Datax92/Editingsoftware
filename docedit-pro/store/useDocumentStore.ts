import { create } from 'zustand';
import { StorageAdapter } from '@/services/storageAdapter';

export interface CommentItem {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: 'sticky-note' | 'comment';
  resolved?: boolean;
}

export interface SearchResultItem {
  pageNumber: number;
  text: string;
  itemIndex: number;
}

export interface DocumentVersion {
  id: string;
  timestamp: string;
  name: string;
  file: File;
}

interface DocumentState {
  activeFile: File | null;
  activeTool: string;
  zoomLevel: number;
  sidebarOpen: boolean;
  currentPage: number;
  brushColor: string;
  brushSize: number;
  
  // Text Styling States for Full Word/Document Processing Support
  textColor: string;
  fontSize: number;
  fontFamily: string;
  
  // Page-isolated states
  pageAnnotations: Record<number, string>;
  pageHistory: Record<number, string[]>;
  pageHistoryIndex: Record<number, number>;

  // Page-isolated Text Annotations & History
  pageTextAnnotations: Record<number, any[]>;
  textHistory: Record<number, any[][]>;
  textHistoryIndex: Record<number, number>;

  // Page-isolated sticky notes and comments
  pageComments: Record<number, CommentItem[]>;
  
  // Document Search State
  searchQuery: string;
  searchResults: SearchResultItem[];
  activeSearchMatchIndex: number;
  
  signatureDataUrl: string | null;
  signaturePage: number;
  signaturePosition: { x: number; y: number };
  signatureSize: { width: number; height: number };

  // Session History Logs & Versions
  historyLogs: string[];
  documentVersions: DocumentVersion[];
  
  setActiveFile: (file: File | null) => void;
  replaceActiveFile: (file: File | null) => void;
  swapPageState: (pageA: number, pageB: number) => void;
  deletePageState: (deletedPageNumber: number) => void;
  setActiveTool: (tool: string) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: number) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  
  // Text Tool Setters
  setTextColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  
  savePageAnnotation: (page: number, dataUrl: string) => void;
  saveTextAnnotations: (page: number, annotations: any[]) => void;
  addComment: (page: number, comment: Omit<CommentItem, 'id'> & { id?: string }) => void;
  updateComment: (page: number, id: string, updates: Partial<CommentItem>) => void;
  deleteComment: (page: number, id: string) => void;
  resolveComment: (page: number, id: string, resolved: boolean) => void;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResultItem[]) => void;
  setActiveSearchMatchIndex: (index: number) => void;

  addHistoryLog: (log: string) => void;
  saveDocumentVersion: (name?: string) => void;
  restoreVersion: (versionId: string) => void;

  undo: () => any;
  redo: () => any;
  setSignatureDataUrl: (url: string | null) => void;
  setSignaturePage: (page: number) => void;
  setSignaturePosition: (pos: { x: number; y: number }) => void;
  setSignatureSize: (size: { width: number; height: number }) => void;
}

const initialZoom = typeof window !== 'undefined' ? Number(StorageAdapter.getSetting('zoom')) || 100 : 100;
const initialSidebar = typeof window !== 'undefined' ? StorageAdapter.getSetting('sidebar') !== 'false' : true;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  activeFile: null,
  activeTool: 'select',
  zoomLevel: initialZoom,
  sidebarOpen: initialSidebar,
  currentPage: 1,
  brushColor: '#000000',
  brushSize: 2,

  // Default Typography States
  textColor: '#000000',
  fontSize: 16,
  fontFamily: 'Inter, sans-serif',
  
  pageAnnotations: {},
  pageHistory: {},
  pageHistoryIndex: {},
  pageTextAnnotations: {},
  textHistory: {},
  textHistoryIndex: {},
  pageComments: {},

  searchQuery: '',
  searchResults: [],
  activeSearchMatchIndex: 0,

  signatureDataUrl: null,
  signaturePage: 1,
  signaturePosition: { x: 50, y: 50 },
  signatureSize: { width: 120, height: 60 },

  historyLogs: [],
  documentVersions: [],
  
  setActiveFile: (file) => {
    set({ 
      activeFile: file, 
      currentPage: 1, 
      pageAnnotations: {}, 
      pageHistory: {}, 
      pageHistoryIndex: {}, 
      pageTextAnnotations: {},
      textHistory: {},
      textHistoryIndex: {},
      pageComments: {},
      searchQuery: '',
      searchResults: [],
      activeSearchMatchIndex: 0,
      signatureDataUrl: null,
      signaturePage: 1,
      signaturePosition: { x: 50, y: 50 },
      historyLogs: [],
      documentVersions: file ? [{
        id: `${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: 'Initial Upload',
        file
      }] : []
    });
  },

  replaceActiveFile: (file) => set({ activeFile: file }),

  swapPageState: (pageA, pageB) => set((state) => {
    const swapRecord = <T extends unknown>(record: Record<number, T>) => {
      const aValue = record[pageA];
      const bValue = record[pageB];
      const copied = { ...record } as Record<number, T>;
      if (pageA in record || typeof aValue !== 'undefined') {
        copied[pageA] = bValue;
      }
      if (pageB in record || typeof bValue !== 'undefined') {
        copied[pageB] = aValue;
      }
      return copied;
    };

    return {
      pageAnnotations: swapRecord(state.pageAnnotations),
      pageHistory: swapRecord(state.pageHistory),
      pageHistoryIndex: swapRecord(state.pageHistoryIndex),
      pageTextAnnotations: swapRecord(state.pageTextAnnotations),
      textHistory: swapRecord(state.textHistory),
      textHistoryIndex: swapRecord(state.textHistoryIndex),
      pageComments: swapRecord(state.pageComments),
    };
  }),

  deletePageState: (deletedPageNumber) => set((state) => {
    const removeAndShiftRecord = <T extends unknown>(record: Record<number, T>) => {
      const updated: Record<number, T> = {};
      Object.keys(record).forEach((keyStr) => {
        const pageNum = parseInt(keyStr, 10);
        if (pageNum === deletedPageNumber) return; // Drop deleted page data
        if (pageNum > deletedPageNumber) {
          updated[pageNum - 1] = record[pageNum]; // Shift down
        } else {
          updated[pageNum] = record[pageNum]; // Keep intact
        }
      });
      return updated;
    };

    return {
      pageAnnotations: removeAndShiftRecord(state.pageAnnotations),
      pageHistory: removeAndShiftRecord(state.pageHistory),
      pageHistoryIndex: removeAndShiftRecord(state.pageHistoryIndex),
      pageTextAnnotations: removeAndShiftRecord(state.pageTextAnnotations),
      textHistory: removeAndShiftRecord(state.textHistory),
      textHistoryIndex: removeAndShiftRecord(state.textHistoryIndex),
      pageComments: removeAndShiftRecord(state.pageComments),
    };
  }),
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),

  // Typography Actions
  setTextColor: (color) => set({ textColor: color }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),
  
  savePageAnnotation: (page, dataUrl) => set((state) => {
    const currentHist = state.pageHistory[page] || [];
    const currentIndex = state.pageHistoryIndex[page] ?? -1;
    const slicedHist = currentHist.slice(0, currentIndex + 1);

    return {
      pageAnnotations: { ...state.pageAnnotations, [page]: dataUrl },
      pageHistory: { ...state.pageHistory, [page]: [...slicedHist, dataUrl] },
      pageHistoryIndex: { ...state.pageHistoryIndex, [page]: slicedHist.length }
    };
  }),

  saveTextAnnotations: (page, annotations) => set((state) => {
    const currentHist = state.textHistory[page] || [];
    const currentIndex = state.textHistoryIndex[page] ?? -1;
    const slicedHist = currentHist.slice(0, currentIndex + 1);

    return {
      pageTextAnnotations: { ...state.pageTextAnnotations, [page]: annotations },
      textHistory: { ...state.textHistory, [page]: [...slicedHist, annotations] },
      textHistoryIndex: { ...state.textHistoryIndex, [page]: slicedHist.length }
    };
  }),

  addComment: (page, comment) => set((state) => ({
    pageComments: {
      ...state.pageComments,
      [page]: [
        ...(state.pageComments[page] || []),
        {
          id: comment.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...comment,
        },
      ],
    },
  })),

  updateComment: (page, id, updates) => set((state) => ({
    pageComments: {
      ...state.pageComments,
      [page]: (state.pageComments[page] || []).map((comment) =>
        comment.id === id ? { ...comment, ...updates } : comment
      ),
    },
  })),

  deleteComment: (page, id) => set((state) => ({
    pageComments: {
      ...state.pageComments,
      [page]: (state.pageComments[page] || []).filter((comment) => comment.id !== id),
    },
  })),

  resolveComment: (page, id, resolved) => set((state) => ({
    pageComments: {
      ...state.pageComments,
      [page]: (state.pageComments[page] || []).map((comment) =>
        comment.id === id ? { ...comment, resolved } : comment
      ),
    },
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results, activeSearchMatchIndex: 0 }),
  setActiveSearchMatchIndex: (index) => set({ activeSearchMatchIndex: index }),

  addHistoryLog: (log) => set((state) => ({
    historyLogs: [log, ...state.historyLogs]
  })),

  saveDocumentVersion: (name = `Checkpoint ${get().documentVersions.length + 1}`) => {
    const { activeFile, documentVersions } = get();
    if (!activeFile) return;
    const newVersion: DocumentVersion = {
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      name,
      file: activeFile
    };
    set({ documentVersions: [newVersion, ...documentVersions] });
  },

  restoreVersion: (versionId) => {
    const { documentVersions } = get();
    const version = documentVersions.find((v) => v.id === versionId);
    if (!version) return;
    set({ activeFile: version.file });
  },

  undo: () => {
    const { currentPage, pageHistory, pageHistoryIndex, textHistory, textHistoryIndex } = get();
    const canvasHist = pageHistory[currentPage] || [];
    let canvasIndex = pageHistoryIndex[currentPage] ?? -1;
    const textHist = textHistory[currentPage] || [];
    let textIndex = textHistoryIndex[currentPage] ?? -1;

    let targetState = null;
    if (canvasIndex > 0 || textIndex > 0) {
      if (textIndex > 0) {
        textIndex -= 1;
        const targetTextState = textHist[textIndex];
        set((state) => ({
          pageTextAnnotations: { ...state.pageTextAnnotations, [currentPage]: targetTextState },
          textHistoryIndex: { ...state.textHistoryIndex, [currentPage]: textIndex }
        }));
        targetState = targetTextState;
      }
      if (canvasIndex > 0) {
        canvasIndex -= 1;
        const targetCanvasState = canvasHist[canvasIndex];
        set((state) => ({
          pageAnnotations: { ...state.pageAnnotations, [currentPage]: targetCanvasState },
          pageHistoryIndex: { ...state.pageHistoryIndex, [currentPage]: canvasIndex }
        }));
        targetState = targetCanvasState;
      }
      return targetState;
    }
    return null;
  },

  redo: () => {
    const { currentPage, pageHistory, pageHistoryIndex, textHistory, textHistoryIndex } = get();
    const canvasHist = pageHistory[currentPage] || [];
    let canvasIndex = pageHistoryIndex[currentPage] ?? -1;
    const textHist = textHistory[currentPage] || [];
    let textIndex = textHistoryIndex[currentPage] ?? -1;

    let targetState = null;
    if (canvasIndex < canvasHist.length - 1 || textIndex < textHist.length - 1) {
      if (textIndex < textHist.length - 1) {
        textIndex += 1;
        const targetTextState = textHist[textIndex];
        set((state) => ({
          pageTextAnnotations: { ...state.pageTextAnnotations, [currentPage]: targetTextState },
          textHistoryIndex: { ...state.textHistoryIndex, [currentPage]: textIndex }
        }));
        targetState = targetTextState;
      }
      if (canvasIndex < canvasHist.length - 1) {
        canvasIndex += 1;
        const targetCanvasState = canvasHist[canvasIndex];
        set((state) => ({
          pageAnnotations: { ...state.pageAnnotations, [currentPage]: targetCanvasState },
          pageHistoryIndex: { ...state.pageHistoryIndex, [currentPage]: canvasIndex }
        }));
        targetState = targetCanvasState;
      }
      return targetState;
    }
    return null;
  },

  setSignatureDataUrl: (url) => set({ signatureDataUrl: url }),
  setSignaturePage: (page) => set({ signaturePage: page }),
  setSignaturePosition: (pos) => set({ signaturePosition: pos }),
  setSignatureSize: (size) => set({ signatureSize: size }),
  
  setZoomLevel: (zoom) => set((state) => {
    const newZoom = typeof zoom === 'function' ? zoom(state.zoomLevel) : zoom;
    StorageAdapter.saveSetting('zoom', newZoom.toString());
    return { zoomLevel: newZoom };
  }),
  
  toggleSidebar: () => set((state) => {
    const newSidebarState = !state.sidebarOpen;
    StorageAdapter.saveSetting('sidebar', newSidebarState.toString());
    return { sidebarOpen: newSidebarState };
  }),
}));