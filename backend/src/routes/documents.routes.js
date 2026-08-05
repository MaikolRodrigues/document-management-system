const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const storagePath = path.resolve(__dirname, '../../storage');
const maxUploadSizeInBytes = Number.parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10) || 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdirSync(storagePath, { recursive: true });
    callback(null, storagePath);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || '');
    const safeBaseName = (path.basename(file.originalname || 'document', extension) || 'document')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 80);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    callback(null, `${safeBaseName}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadSizeInBytes
  }
});

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return documentsController.uploadDocument(req, res, next);
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.message = 'Arquivo excede o limite máximo permitido.';
    }

    return next(error);
  });
});

router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

module.exports = router;
