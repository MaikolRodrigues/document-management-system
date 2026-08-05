const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');

const storageRootPath = path.resolve(__dirname, '../../storage');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

function normalizeOwner(owner) {
  if (typeof owner !== 'string') {
    return '';
  }

  return owner.trim();
}

function createDocumentMetadata(file, owner) {
  return {
    id: randomUUID(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storagePath: file.path
  };
}

function isPathInsideStorage(targetPath) {
  let storageRealPath;
  let targetRealPath;

  try {
    storageRealPath = fs.realpathSync(storageRootPath);
    targetRealPath = fs.realpathSync(targetPath);
  } catch {
    return false;
  }

  return (
    targetRealPath === storageRealPath ||
    targetRealPath.startsWith(`${storageRealPath}${path.sep}`)
  );
}

function createDocumentsService(repository = documentsRepository) {
  function uploadDocument(file, ownerInput) {
    if (!file) {
      throw new HttpError(400, 'Arquivo é obrigatório para upload.');
    }

    const owner = normalizeOwner(ownerInput);
    if (!owner) {
      throw new HttpError(400, 'Owner é obrigatório para upload.');
    }

    const metadata = createDocumentMetadata(file, owner);
    return repository.save(metadata);
  }

  function listDocuments(ownerInput) {
    const owner = normalizeOwner(ownerInput);
    return repository.list(owner || null);
  }

  function getDocumentForDownload(id) {
    if (typeof id !== 'string' || !id.trim()) {
      throw new HttpError(400, 'Id do documento é inválido.');
    }

    const document = repository.findById(id.trim());
    if (!document) {
      throw new HttpError(404, 'Documento não encontrado.');
    }

    if (!fs.existsSync(document.storagePath)) {
      throw new HttpError(410, 'Arquivo não está mais disponível para download.');
    }

    if (!isPathInsideStorage(document.storagePath)) {
      throw new HttpError(403, 'Caminho de arquivo inválido para download.');
    }

    return document;
  }

  return {
    uploadDocument,
    listDocuments,
    getDocumentForDownload,
  };
}

const service = createDocumentsService();

module.exports = {
  HttpError,
  createDocumentsService,
  uploadDocument: service.uploadDocument,
  listDocuments: service.listDocuments,
  getDocumentForDownload: service.getDocumentForDownload
};
