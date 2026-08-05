const documentsService = require('../services/documents.service');

function uploadDocument(req, res, next) {
  try {
    const metadata = documentsService.uploadDocument(req.file, req.body?.owner);
    return res.status(201).json(metadata);
  } catch (error) {
    return next(error);
  }
}

function listDocuments(req, res, next) {
  try {
    const documents = documentsService.listDocuments(req.query?.owner);
    return res.status(200).json({ documents });
  } catch (error) {
    return next(error);
  }
}

function downloadDocument(req, res, next) {
  try {
    const document = documentsService.getDocumentForDownload(req.params?.id);

    return res.download(document.storagePath, document.originalName, (error) => {
      if (!error) {
        return;
      }

      if (res.headersSent) {
        return;
      }

      return next(error);
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument
};
