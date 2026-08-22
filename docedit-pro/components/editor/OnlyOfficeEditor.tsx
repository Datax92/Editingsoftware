'use client';

import React, { useEffect, useRef } from 'react';
import { WordService } from '@/services/wordService';

interface OnlyOfficeEditorProps {
  documentId: string;
  documentTitle: string;
  fileUrl: string | File; // Accepts string URL, blob URL, or File object
  fileType?: string;
  mode?: 'edit' | 'view';
  user?: {
    id: string;
    name: string;
  };
  onDocumentReady?: () => void;
  onSave?: (event: any) => void;
}

export const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({
  documentId,
  documentTitle,
  fileUrl,
  fileType,
  mode = 'edit',
  user = { id: 'user-1', name: 'Guest User' },
  onDocumentReady,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docEditorRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      if (typeof window === 'undefined' || !(window as any).DocsAPI) {
        console.warn('OnlyOffice DocsAPI script not loaded yet.');
        return;
      }

      if (!containerRef.current) return;

      // Clean up previous instance if any
      containerRef.current.innerHTML = '';

      // 🛡️ BULLETPROOF INTERCEPT: If fileUrl is a blob: URL or File object, upload it to backend right now!
      let resolvedFileUrl: string;
      try {
        if (typeof fileUrl === 'string' && fileUrl.startsWith('blob:')) {
          console.log('Intercepted blob: URL in OnlyOfficeEditor, uploading to backend...');
          resolvedFileUrl = await WordService.uploadDocumentForOnlyOffice(fileUrl);
        } else if (fileUrl instanceof File) {
          console.log('Intercepted File object in OnlyOfficeEditor, uploading to backend...');
          resolvedFileUrl = await WordService.uploadDocumentForOnlyOffice(fileUrl);
        } else {
          // Already an HTTP URL, ensure it uses host.docker.internal for Docker container access
          resolvedFileUrl = fileUrl;
          if (resolvedFileUrl.includes('localhost') || resolvedFileUrl.includes('127.0.0.1')) {
            resolvedFileUrl = resolvedFileUrl
              .replace('localhost', 'host.docker.internal')
              .replace('127.0.0.1', 'host.docker.internal');
          }
        }
      } catch (uploadErr) {
        console.error('Failed to resolve document URL for OnlyOffice:', uploadErr);
        return;
      }

      if (!isMounted) return;

      // Safely resolve and validate the file extension
      const validExtensions = ['docx', 'doc', 'odt', 'rtf', 'txt', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt'];
      let resolvedFileType = fileType?.toLowerCase();

      if (!resolvedFileType || !validExtensions.includes(resolvedFileType)) {
        const extracted = resolvedFileUrl.split('?')[0].split('.').pop()?.toLowerCase();
        if (extracted && validExtensions.includes(extracted)) {
          resolvedFileType = extracted;
        } else {
          resolvedFileType = 'docx';
        }
      }

      console.log('🚀 Initializing OnlyOffice with final URL:', resolvedFileUrl);

      const config = {
        document: {
          fileType: resolvedFileType,
          key: `${documentId}-${Date.now()}`,
          title: documentTitle,
          url: resolvedFileUrl, // <--- Guaranteed to be an HTTP URL pointing to backend
          permissions: {
            comment: true,
            download: true,
            edit: mode === 'edit',
            print: true,
            fillForms: true,
            review: true,
          },
        },
        documentType: 'word',
        editorConfig: {
          mode: mode,
          lang: 'en',
          user: {
            id: user.id,
            name: user.name,
          },
          // ✨ MATCHES LIGHT APP THEME: Using "theme-light"
          customization: {
            uiTheme: "theme-myapp-custom", // Matches your app's light theme aesthetic
            logo: {
              image: "",        // Optional: Direct public image URL for light mode logo
              imageDark: "",    // Optional: Direct public image URL for dark mode logo
              url: ""           // Optional: Link destination when logo is clicked
            },
            autosave: true,
            comments: true,
            compactHeader: false,
          },
          callbacks: {
            onDocumentStateChange: (event: any) => {
              if (event.data && onSave) {
                onSave(event);
              }
            },
            onReady: () => {
              if (onDocumentReady && isMounted) {
                onDocumentReady();
              }
            },
            onError: (err: any) => {
              console.error('OnlyOffice Editor Error:', err);
            },
          },
        },
        type: 'desktop',
        width: '100%',
        height: '100%',
      };

      try {
        docEditorRef.current = new (window as any).DocsAPI.DocEditor(
          'onlyoffice-editor-container',
          config
        );
      } catch (err) {
        console.error('Failed to initialize OnlyOffice DocEditor:', err);
      }
    };

    const docServerUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'http://localhost:8000';
    const scriptId = 'onlyoffice-api-script';
    
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${docServerUrl}/web-apps/apps/api/documents/api.js`;
      script.async = true;
      script.onload = () => { initEditor(); };
      document.body.appendChild(script);
    } else {
      initEditor();
    }

    return () => {
      isMounted = false;
      if (docEditorRef.current && typeof docEditorRef.current.destroyEditor === 'function') {
        docEditorRef.current.destroyEditor();
      }
    };
  }, [documentId, fileUrl, fileType, mode]);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div id="onlyoffice-editor-container" className="w-full h-full" ref={containerRef} />
    </div>
  );
};

export default OnlyOfficeEditor;