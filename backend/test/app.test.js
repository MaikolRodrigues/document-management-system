const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { beforeEach, afterEach, test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');

const storagePath = path.resolve(__dirname, '../storage');

let server;
let baseUrl;

beforeEach(async () => {
  documentsRepository.documents = [];
  fs.rmSync(storagePath, { recursive: true, force: true });
  fs.mkdirSync(storagePath, { recursive: true });
  fs.writeFileSync(
    path.join(storagePath, '.gitkeep'),
    '# Mantenha esta pasta no controle de versão.\n# Os arquivos enviados (upload local via multer) serão gravados aqui em tempo de execução.\n'
  );

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
});

async function sendUpload({ owner, filename = 'document.txt', content = 'hello' }) {
  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/plain' });
  formData.append('file', blob, filename);

  if (owner !== undefined) {
    formData.append('owner', owner);
  }

  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData,
  });
}

test('GET /health responde status ok', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.strictEqual(response.status, 200);

  const payload = await response.json();
  assert.deepStrictEqual(payload, { status: 'ok' });
});

test('POST /upload retorna 400 quando arquivo está ausente', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new URLSearchParams({ owner: 'alice' }),
  });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.message, 'Arquivo é obrigatório para upload.');
});

test('POST /upload envia documento com sucesso', async () => {
  const response = await sendUpload({ owner: 'alice', filename: 'contract.txt', content: 'contract-data' });

  assert.strictEqual(response.status, 201);
  const payload = await response.json();

  assert.ok(payload.id);
  assert.strictEqual(payload.originalName, 'contract.txt');
  assert.strictEqual(payload.owner, 'alice');
  assert.ok(payload.storagePath);
  assert.strictEqual(fs.existsSync(payload.storagePath), true);
});

test('POST /upload retorna 400 quando owner está ausente', async () => {
  const response = await sendUpload({ owner: undefined });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.message, 'Owner é obrigatório para upload.');
});

test('POST /upload retorna 400 para tipo de arquivo bloqueado', async () => {
  const response = await sendUpload({ owner: 'alice', filename: 'script.sh' });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.message, 'Tipo de arquivo não permitido para upload.');
});

test('GET /documents lista e filtra por owner', async () => {
  const uploadAlice = await sendUpload({ owner: 'alice', filename: 'a.txt' });
  const uploadBob = await sendUpload({ owner: 'bob', filename: 'b.txt' });
  assert.strictEqual(uploadAlice.status, 201);
  assert.strictEqual(uploadBob.status, 201);

  const allResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(allResponse.status, 200);
  const allPayload = await allResponse.json();
  assert.strictEqual(allPayload.documents.length, 2);

  const filteredResponse = await fetch(`${baseUrl}/documents?owner=alice`);
  assert.strictEqual(filteredResponse.status, 200);
  const filteredPayload = await filteredResponse.json();
  assert.strictEqual(filteredPayload.documents.length, 1);
  assert.strictEqual(filteredPayload.documents[0].owner, 'alice');
});

test('GET /documents/:id/download faz download de arquivo válido', async () => {
  const uploadResponse = await sendUpload({ owner: 'alice', filename: 'invoice.txt', content: 'invoice-data' });
  assert.strictEqual(uploadResponse.status, 201);
  const uploaded = await uploadResponse.json();

  const downloadResponse = await fetch(`${baseUrl}/documents/${uploaded.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.ok((downloadResponse.headers.get('content-disposition') || '').includes('invoice.txt'));

  const downloadedContent = await downloadResponse.text();
  assert.strictEqual(downloadedContent, 'invoice-data');
});

test('GET /documents/:id/download retorna 404 para id inexistente', async () => {
  const response = await fetch(`${baseUrl}/documents/${randomUUID()}/download`);

  assert.strictEqual(response.status, 404);
  const payload = await response.json();
  assert.strictEqual(payload.message, 'Documento não encontrado.');
});

test('GET /documents/:id/download retorna 410 quando arquivo sumiu do disco', async () => {
  const uploadResponse = await sendUpload({ owner: 'alice', filename: 'gone.txt', content: 'gone-data' });
  assert.strictEqual(uploadResponse.status, 201);
  const uploaded = await uploadResponse.json();

  fs.rmSync(uploaded.storagePath, { force: true });

  const downloadResponse = await fetch(`${baseUrl}/documents/${uploaded.id}/download`);
  assert.strictEqual(downloadResponse.status, 410);
  const payload = await downloadResponse.json();
  assert.strictEqual(payload.message, 'Arquivo não está mais disponível para download.');
});

test('GET /documents/:id/download retorna 403 para caminho fora do storage', async () => {
  const outsideFilePath = path.resolve(__dirname, 'outside-file.txt');
  fs.writeFileSync(outsideFilePath, 'outside-data');

  const metadata = {
    id: randomUUID(),
    originalName: 'outside.txt',
    storedName: 'outside.txt',
    mimeType: 'text/plain',
    size: 12,
    uploadedAt: new Date().toISOString(),
    owner: 'security-test',
    storagePath: outsideFilePath,
  };

  documentsRepository.save(metadata);

  const response = await fetch(`${baseUrl}/documents/${metadata.id}/download`);
  assert.strictEqual(response.status, 403);
  const payload = await response.json();
  assert.strictEqual(payload.message, 'Caminho de arquivo inválido para download.');

  fs.rmSync(outsideFilePath, { force: true });
});
