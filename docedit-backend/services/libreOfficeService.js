const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const libre = require('libreoffice-convert');

/**
 * Converts a DOCX file buffer to PDF using headless LibreOffice
 */
function convertDocumentBuffer(inputBuffer, targetExtension) {
  return new Promise((resolve, reject) => {
    libre.convert(inputBuffer, targetExtension, undefined, (err, doneBuffer) => {
      if (err) {
        return reject(new Error('LibreOffice conversion failed: ' + err.message));
      }
      resolve(doneBuffer);
    });
  });
}

/**
 * Converts a PDF file buffer to DOCX using the Python pdf2docx script
 */
async function convertPdfToDocxBuffer(inputBuffer) {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const uniqueId = Date.now();
  const inputPath = path.join(tempDir, `input-${uniqueId}.pdf`);
  const outputPath = path.join(tempDir, `output-${uniqueId}.docx`);
  const scriptPath = path.join(__dirname, '../python/convert.py');

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    // Call the Python script using python3
    await execFileAsync('python3', [scriptPath, inputPath, outputPath]);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Python conversion completed, but output file was not found.');
    }
    const docxBuffer = fs.readFileSync(outputPath);

    return docxBuffer;
  } catch (error) {
    throw new Error('PDF to DOCX conversion failed: ' + error.message);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

module.exports = {
  convertDocumentBuffer,
  convertPdfToDocxBuffer,
};