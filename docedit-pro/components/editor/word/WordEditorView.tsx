'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import OnlyOfficeEditor from '@/components/editor/OnlyOfficeEditor';
import { WordService } from '@/services/wordService';

interface WordEditorViewProps {
  file: File | string;
  selectedHeading?: string | null;
  onClearSelectedHeading?: () => void;
  onContentChange?: (html: string) => void;
}

export interface WordEditorRef {
  formatText: (command: string, value?: string) => void;
  getHtmlContent: () => string;
}

export const WordEditorView = forwardRef<WordEditorRef, WordEditorViewProps>(
  (
    {
      file,
      selectedHeading,
      onClearSelectedHeading,
      onContentChange,
    },
    ref
  ) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isPreparingEditor, setIsPreparingEditor] = useState(true);
    const documentIdRef = useRef<string>(`doc-${Date.now()}`);

    const fileName =
      typeof file === 'string'
        ? file.split('/').pop()?.split('?')[0] || 'document.docx'
        : file?.name || 'document.docx';

    useEffect(() => {
      let isCancelled = false;

      if (!file) {
        setFileUrl(null);
        setIsPreparingEditor(false);
        return () => {
          isCancelled = true;
        };
      }

      const prepareOnlyOfficeUrl = async () => {
        setIsPreparingEditor(true);

        try {
          const uploadedUrl = await WordService.uploadDocumentForOnlyOffice(file);
          if (!isCancelled) {
            setFileUrl(uploadedUrl);
          }
        } catch (error) {
          console.error('Could not prepare document for OnlyOffice:', error);
          if (!isCancelled) {
            setFileUrl(null);
          }
        } finally {
          if (!isCancelled) {
            setIsPreparingEditor(false);
          }
        }
      };

      prepareOnlyOfficeUrl();

      return () => {
        isCancelled = true;
      };
    }, [file]);

    useImperativeHandle(ref, () => ({
      formatText: (command: string, value: string = '') => {
        console.warn(
          `formatText('${command}', '${value}') called: Formatting is managed directly inside the high-fidelity OnlyOffice toolbar.`
        );
      },
      getHtmlContent: () => {
        return `<!-- OnlyOffice Managed Document: ${fileName} -->`;
      },
    }));

    useEffect(() => {
      if (!selectedHeading) return;

      if (onClearSelectedHeading) {
        onClearSelectedHeading();
      }
    }, [selectedHeading, onClearSelectedHeading]);

    return (
      <div className="flex-1 overflow-hidden flex flex-col items-center w-full h-full relative bg-gray-100">
        {fileUrl ? (
          <OnlyOfficeEditor
            documentId={documentIdRef.current}
            documentTitle={fileName}
            fileUrl={fileUrl}
            mode="edit"
            user={{ id: 'user-1', name: 'DocEdit Pro User' }}
            onDocumentReady={() => {
              console.log('OnlyOffice High-Fidelity Editor Ready.');
            }}
            onSave={() => {
              if (onContentChange) {
                onContentChange(`<!-- OnlyOffice Updated: ${fileName} -->`);
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground z-30 select-none">
            {isPreparingEditor ? 'Preparing High-Fidelity OnlyOffice Canvas...' : 'Unable to prepare the document for OnlyOffice.'}
          </div>
        )}
      </div>
    );
  }
);

WordEditorView.displayName = 'WordEditorView';

export default WordEditorView;