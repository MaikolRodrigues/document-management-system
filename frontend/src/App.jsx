import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentsApi.js';

function triggerFileDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadDocuments = useCallback(async () => {
    setErrorMessage('');
    setIsLoadingDocuments(true);

    try {
      const loadedDocuments = await listDocuments(ownerFilter);
      setDocuments(loadedDocuments);
    } catch (error) {
      setErrorMessage(error.message || 'Erro ao listar documentos.');
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [ownerFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(payload) {
    setErrorMessage('');
    setSuccessMessage('');
    setIsUploading(true);

    try {
      const createdDocument = await uploadDocument(payload);
      setSuccessMessage(`Documento ${createdDocument.originalName} enviado com sucesso.`);
      await loadDocuments();
    } catch (error) {
      setErrorMessage(error.message || 'Erro ao enviar documento.');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(documentId) {
    setErrorMessage('');
    setSuccessMessage('');
    setDownloadingId(documentId);

    try {
      const fileData = await downloadDocument(documentId);
      triggerFileDownload(fileData.blob, fileData.filename);
      setSuccessMessage('Download realizado com sucesso.');
    } catch (error) {
      setErrorMessage(error.message || 'Erro ao baixar documento.');
    } finally {
      setDownloadingId('');
    }
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 960,
        margin: '0 auto',
        padding: '2rem 1rem',
        display: 'grid',
        gap: 16,
      }}
    >
      <header>
        <h1 style={{ marginBottom: 8 }}>Document Management System</h1>
        <p style={{ margin: 0 }}>Envie, liste e baixe documentos pelo frontend.</p>
      </header>

      {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}
      {successMessage ? <p style={{ margin: 0, color: '#166534' }}>{successMessage}</p> : null}

      <UploadComponent onUpload={handleUpload} isUploading={isUploading} />

      <DocumentList
        documents={documents}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        onRefresh={loadDocuments}
        onDownload={handleDownload}
        downloadingId={downloadingId}
        isLoading={isLoadingDocuments}
      />
    </main>
  );
}
