const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function sanitizeDocxMiddleware(req, res, next) {
  if (!req.file) return next();
  
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  if (ext === '.docx' || ext === '.zip') {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      let totalUncompressedSize = 0;
      for (const entry of zipEntries) {
        totalUncompressedSize += entry.header.size;
        if (entry.entryName.includes('..')) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ error: 'Security violation: Malicious path detected.' });
        }
      }

      // Zip-bomb safety threshold (200MB cap)
      if (totalUncompressedSize > 200 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Security violation: Potential zip-bomb detected.' });
      }
    } catch (err) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid or corrupted document archive format.' });
    }
  }
  next();
}

module.exports = { sanitizeDocxMiddleware };