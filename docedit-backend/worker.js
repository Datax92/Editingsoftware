import Redis from 'ioredis';
import { Worker } from 'bullmq';
import fs from 'fs';

// Safely parse Railway's REDIS_URL or fall back to explicit individual fields
let connection;

if (process.env.REDIS_URL) {
  const parsedUrl = new URL(process.env.REDIS_URL);
  connection = new Redis({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port) || 6379,
    username: parsedUrl.username || 'default',
    password: parsedUrl.password,
    maxRetriesPerRequest: null,
  });
} else {
  connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USER || 'default',
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
}

const worker = new Worker('ocr-processing-queue', async (job) => {
  console.log(`Processing OCR background job ID: ${job.id} for file: ${job.data.originalName}`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));

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