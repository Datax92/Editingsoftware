const express = require('express');
const multer = require('multer');
const path = require('path');
const { Queue } = require('bullmq');
const { handleDocxToPdf, handlePdfToDocx } = require('../controllers/conversionController');
const { sanitizeDocxMiddleware } = require('../middlewares/securityMiddleware');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads');

// Configure diskStorage so uploaded files preserve their file extensions (crucial for OnlyOffice)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.docx';
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// Initialize BullMQ Queue for asynchronous background OCR tasks
const ocrQueue = new Queue('ocr-processing-queue', {
  connection: { 
    host: process.env.REDIS_HOST || 'localhost', 
    port: Number(process.env.REDIS_PORT || 6379) 
  }
});

// Document Conversion Routes
router.post('/convert/docx-to-pdf', upload.single('file'), sanitizeDocxMiddleware, handleDocxToPdf);
router.post('/convert/pdf-to-docx', upload.single('file'), sanitizeDocxMiddleware, handlePdfToDocx);

router.post('/word/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded for OnlyOffice.' });
    }

    const publicBaseUrl = process.env.BACKEND_PUBLIC_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://docedit-backend:5000';
    const fileUrl = `${publicBaseUrl}/uploads/${req.file.filename}`;

    res.json({ url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to upload document for OnlyOffice.' });
  }
});

// Asynchronous OCR Enqueue Route
router.post('/ocr', upload.single('file'), sanitizeDocxMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded for OCR processing.' });
    }
    const job = await ocrQueue.add('ocr', { 
      filePath: req.file.path, 
      originalName: req.file.originalname 
    });
    res.json({ jobId: job.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to enqueue OCR job.' });
  }
});

// OCR Job Status Polling Route
router.get('/ocr/:jobId', async (req, res) => {
  try {
    const job = await ocrQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const state = await job.getState();
    res.json({ state, result: job.returnvalue ?? null });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch OCR job status.' });
  }
});

module.exports = router;