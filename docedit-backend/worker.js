const { Worker } = require('bullmq');
const fs = require('fs');

const redisConnection = { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 };

const worker = new Worker('ocr-processing-queue', async (job) => {
  console.log(`Processing OCR background job ID: ${job.id} for file: ${job.data.originalName}`);
  
  // Simulate heavy server-side OCR processing pipeline (e.g., OCRmyPDF / Tesseract integration)
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Ephemeral file clean-up post processing
  if (fs.existsSync(job.data.filePath)) {
    fs.unlinkSync(job.data.filePath);
  }

  console.log(`OCR Job ${job.id} completed successfully.`);
  return { status: 'success', textExtracted: true };
}, { connection: redisConnection });

worker.on('completed', job => {
  console.log(`Job ${job.id} has completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});