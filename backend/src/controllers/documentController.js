const path = require('path');
const documentService = require('../services/documentService');

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  const doc = documentService.saveDocument(req.file);
  return res.status(201).json(doc);
}

function list(req, res) {
  const docs = documentService.listDocuments();
  return res.json(docs);
}

function download(req, res) {
  const doc = documentService.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }
  const storagePath = path.resolve(__dirname, '../../storage', doc.filename);
  return res.download(storagePath, doc.originalName);
}

module.exports = { upload, list, download };
