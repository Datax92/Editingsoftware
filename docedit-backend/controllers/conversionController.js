const fs = require('fs');
const path = require('path');
const { convertDocumentBuffer, convertPdfToDocxBuffer } = require('../services/libreOfficeService');

const uploadDir = path.join(__dirname, '../uploads');

/**
 * Controller function for handling DOCX to PDF conversions
 */
async function handleDocxToPdf(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const inputPath = req.file.path;
  const outputPath = path.join(uploadDir, `${Date.now()}-converted.pdf`);

  try {
    const fileBuffer = fs.readFileSync(inputPath);
    const pdfBuffer = await convertDocumentBuffer(fileBuffer, '.pdf');

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    fs.writeFileSync(outputPath, pdfBuffer);

    res.download(outputPath, 'converted.pdf', () => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  } catch (error) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Controller function for handling PDF to DOCX conversions
 */
async function handlePdfToDocx(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const inputPath = req.file.path;
  const outputPath = path.join(uploadDir, `${Date.now()}-converted.docx`);

  try {
    const fileBuffer = fs.readFileSync(inputPath);
    const docxBuffer = await convertPdfToDocxBuffer(fileBuffer);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    fs.writeFileSync(outputPath, docxBuffer);

    res.download(outputPath, 'converted.docx', () => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  } catch (error) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { handleDocxToPdf, handlePdfToDocx };