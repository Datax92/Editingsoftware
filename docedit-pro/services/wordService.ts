import * as mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export class WordService {
  public static async renderDocumentPreview(file: File, container: HTMLElement): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      container.innerHTML = '';
      await renderAsync(arrayBuffer, container, undefined, {
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
      });
    } catch (error: any) {
      console.error('Error rendering Word document preview:', error);
      throw new Error(error?.message || 'Could not parse or preview Word document.');
    }
  }

  public static async extractText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error: any) {
      console.error('Error extracting text from Word document:', error);
      return '';
    }
  }

  public static async generateDocumentFromTemplate(templateFile: File, data: Record<string, string>): Promise<Blob> {
    const arrayBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(data);
    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  public static async uploadDocumentForOnlyOffice(file: File | Blob | string): Promise<string> {
    try {
      let fileToUpload: File;

      if (typeof file === 'string') {
        if (file.startsWith('blob:')) {
          const blobRes = await fetch(file);
          const blob = await blobRes.blob();
          fileToUpload = new File([blob], 'document.docx', { type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        } else {
          let containerUrl = file;
          if (containerUrl.includes('localhost') || containerUrl.includes('127.0.0.1') || containerUrl.includes('host.docker.internal')) {
            containerUrl = containerUrl
              .replace(/localhost(:\d+)?/, 'docedit-backend$1')
              .replace(/127\.0\.0\.1(:\d+)?/, 'docedit-backend$1')
              .replace(/host\.docker\.internal(:\d+)?/, 'docedit-backend$1');
          }
          return containerUrl;
        }
      } else {
        fileToUpload = file instanceof File ? file : new File([file], 'document.docx', { type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      }

      const formData = new FormData();
      formData.append('file', fileToUpload, fileToUpload.name || 'document.docx');

      const browserBaseUrl = 'http://localhost:5000';

      const response = await fetch(`${browserBaseUrl}/api/word/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload document for OnlyOffice (Status: ${response.status})`);
      }

      const data = await response.json();
      let fileUrl = data?.url || data?.fileUrl || data?.path;

      if (!fileUrl && data?.filename) {
        fileUrl = `${browserBaseUrl}/uploads/${data.filename}`;
      }

      if (!fileUrl) {
        throw new Error('OnlyOffice upload response did not include a document URL.');
      }

      if (fileUrl.startsWith('/')) {
        fileUrl = `${browserBaseUrl}${fileUrl}`;
      }

      let containerUrl = fileUrl
        .replace(/localhost(:\d+)?/, 'docedit-backend$1')
        .replace(/127\.0\.0\.1(:\d+)?/, 'docedit-backend$1')
        .replace(/host\.docker\.internal(:\d+)?/, 'docedit-backend$1');

      console.log('Resolved OnlyOffice Container URL:', containerUrl);
      return containerUrl;
    } catch (error: any) {
      console.error('Error uploading document for OnlyOffice:', error);
      throw error;
    }
  }

  public static async getOnlyOfficeConfig(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/word/onlyoffice-config/${fileId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to load OnlyOffice configuration.');
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching OnlyOffice configuration:', error);
      throw error;
    }
  }

  /**
   * Downloads the live edited document with cache-busting.
   */
  public static async downloadEditedDocument(fileUrl: string, defaultFilename: string = 'document.docx'): Promise<void> {
    try {
      let browserUrl = fileUrl
        .replace('docedit-backend', 'localhost')
        .replace('host.docker.internal', 'localhost');

      if (!browserUrl.startsWith('http')) {
        browserUrl = `${BACKEND_URL}${browserUrl.startsWith('/') ? '' : '/'}${browserUrl}`;
      }

      // Append timestamp query parameter to prevent browser caching of old file versions
      const separator = browserUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${browserUrl}${separator}t=${Date.now()}`;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch edited document from server (Status: ${response.status})`);
      }

      const blob = await response.blob();
      const cleanUrl = browserUrl.split('?')[0];
      const filename = cleanUrl.split('/').pop() || defaultFilename;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      setTimeout(() => {
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 50);
    } catch (error) {
      console.error('Error downloading edited document:', error);
      throw error;
    }
  }
}