import { useRef, useState } from 'react';

export default function UploadComponent({ onUpload, isUploading }) {
  const [owner, setOwner] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const normalizedOwner = owner.trim();

    if (!selectedFile) {
      setFormError('Selecione um arquivo para enviar.');
      return;
    }

    if (!normalizedOwner) {
      setFormError('Informe o owner do documento.');
      return;
    }

    try {
      await onUpload({ file: selectedFile, owner: normalizedOwner });
      setSelectedFile(null);
      setOwner('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      // O erro é exibido no nível do App para manter resposta consistente.
    }
  }

  return (
    <section style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Upload de Documento</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Owner
          <input
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="ex: user-123"
            disabled={isUploading}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Arquivo
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            disabled={isUploading}
          />
        </label>

        {formError ? <p style={{ margin: 0, color: '#b91c1c' }}>{formError}</p> : null}

        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar Documento'}
        </button>
      </form>
    </section>
  );
}
