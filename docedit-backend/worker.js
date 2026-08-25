import Redis from 'ioredis';
import { Worker } from 'bullmq';
import fs from 'fs';

// Explicitly instantiate ioredis so credentials & URLs are parsed correctly
const connection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

const worker = new Worker('ocr-processing-queue', async (job) => {
  console.log(`Processing OCR background job ID: ${job.id} for file: ${job.data.originalName}`);
  
  // Simulate heavy server-side OCR processing pipeline (e.g., OCRmyPDF / Tesseract integration)
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Ephemeral file clean-up post processing
  if (job.data?.filePath && fs.existsSync(job.data.filePath)) {
    fs.unlinkSync(job.data.filePath);
  }

  console.log(`OCR Job ${job.id} completed successfully.`);
  return { status: 'success', textExtracted: true };
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} has completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});