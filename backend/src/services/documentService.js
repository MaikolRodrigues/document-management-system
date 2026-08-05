const documentRepository = require('../repositories/documentRepository');

function saveDocument(file) {
  const metadata = {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
  return documentRepository.save(metadata);
}

function listDocuments() {
  return documentRepository.findAll();
}

function getDocumentById(id) {
  return documentRepository.findById(id);
}

module.exports = { saveDocument, listDocuments, getDocumentById };
