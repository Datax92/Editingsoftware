const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const OcrService = {
  /**
   * Uploads a scanned PDF/image to the backend to enqueue an asynchronous OCR job.
   */
  async enqueueOcr(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_URL}/api/ocr`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to start background OCR processing.');
    }

    const data = await response.json();
    return data.jobId;
  },

  /**
   * Polls the backend BullMQ job status endpoint until completion or failure.
   */
  async pollOcrJob(
    jobId: string, 
    onStateChange?: (state: string) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/ocr/${jobId}`);
          if (!response.ok) {
            throw new Error('Failed to check OCR job status.');
          }

          const data = await response.json();
          
          if (onStateChange) {
            onStateChange(data.state);
          }

          if (data.state === 'completed') {
            clearInterval(pollInterval);
            resolve(data.result);
          } else if (data.state === 'failed') {
            clearInterval(pollInterval);
            reject(new Error('OCR background processing job failed.'));
          }
        } catch (err) {
          clearInterval(pollInterval);
          reject(err);
        }
      }, 2500); // Check status every 2.5 seconds
    });
  },
};

export default OcrService;