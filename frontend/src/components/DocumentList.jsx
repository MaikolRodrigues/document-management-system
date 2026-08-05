import DownloadButton from './DownloadButton.jsx';

function formatBytes(size) {
  if (typeof size !== 'number' || Number.isNaN(size)) {
    return '-';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function DocumentList({
  documents,
  ownerFilter,
  onOwnerFilterChange,
  onRefresh,
  onDownload,
  downloadingId,
  isLoading,
}) {
  return (
    <section style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Documentos</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={ownerFilter}
          onChange={(event) => onOwnerFilterChange(event.target.value)}
          placeholder="Filtrar por owner"
          disabled={isLoading}
        />
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {documents.length === 0 ? (
        <p style={{ margin: 0 }}>Nenhum documento encontrado.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Nome</th>
                <th align="left">Owner</th>
                <th align="left">Tamanho</th>
                <th align="left">Upload</th>
                <th align="left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.originalName}</td>
                  <td>{document.owner}</td>
                  <td>{formatBytes(document.size)}</td>
                  <td>{new Date(document.uploadedAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <DownloadButton
                      onDownload={() => onDownload(document.id)}
                      isLoading={downloadingId === document.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
