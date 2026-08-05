const API_PREFIX = '/api';

function parseFilenameFromDisposition(contentDisposition) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return null;
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || null;
}

async function parseErrorResponse(response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return 'Erro inesperado na comunicação com o servidor.';
  }

  try {
    const data = JSON.parse(rawBody);
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }

    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error;
    }
  } catch {
    return rawBody;
  }

  return rawBody;
}

async function assertOk(response) {
  if (response.ok) {
    return;
  }

  const message = await parseErrorResponse(response);
  throw new Error(message);
}

export async function uploadDocument({ file, owner }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', owner);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  await assertOk(response);
  return response.json();
}

export async function listDocuments(owner) {
  const query = new URLSearchParams();
  if (owner?.trim()) {
    query.set('owner', owner.trim());
  }

  const path = query.toString()
    ? `${API_PREFIX}/documents?${query.toString()}`
    : `${API_PREFIX}/documents`;

  const response = await fetch(path);
  await assertOk(response);

  const data = await response.json();
  return Array.isArray(data?.documents) ? data.documents : [];
}

export async function downloadDocument(id) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`);
  await assertOk(response);

  const blob = await response.blob();
  const filename = parseFilenameFromDisposition(response.headers.get('content-disposition'));

  return {
    blob,
    filename: filename || `document-${id}`,
  };
}
