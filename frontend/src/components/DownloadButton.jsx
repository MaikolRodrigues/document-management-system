export default function DownloadButton({ onDownload, isLoading }) {
  return (
    <button type="button" onClick={onDownload} disabled={isLoading}>
      {isLoading ? 'Baixando...' : 'Download'}
    </button>
  );
}
