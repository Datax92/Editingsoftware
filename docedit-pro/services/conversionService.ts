const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const ConversionService = {
  async convertDocxToPdf(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/convert/docx-to-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to convert Word document to PDF.');
    }

    return await response.blob();
  },

  async convertPdfToDocx(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/convert/pdf-to-docx`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to convert PDF to Word document.');
    }

    return await response.blob();
  },
};