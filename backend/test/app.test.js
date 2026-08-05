const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const documentRepository = require('../src/repositories/documentRepository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

// Helpers para fazer requisições HTTP ao servidor de teste.
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function request(server, method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: options.headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function multipartRequest(server, method, urlPath, fieldName, fileContent, fileName) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const boundary = '----TestBoundary1234567890';
    const CRLF = '\r\n';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"${CRLF}Content-Type: text/plain${CRLF}${CRLF}`),
      Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent),
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`),
    ]);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path: urlPath,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

test('GET /health retorna status ok', async () => {
  const server = await startServer();
  try {
    const res = await request(server, 'GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(JSON.parse(res.body), { status: 'ok' });
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('POST /upload sem arquivo retorna 400', async () => {
  const server = await startServer();
  try {
    const boundary = '----Empty';
    const body = `--${boundary}--\r\n`;
    const res = await request(server, 'POST', '/upload', {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    });
    assert.strictEqual(res.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('POST /upload com arquivo retorna 201 e metadados', async () => {
  documentRepository.clear();
  const server = await startServer();
  try {
    const res = await multipartRequest(server, 'POST', '/upload', 'file', 'conteúdo de teste', 'teste.txt');
    assert.strictEqual(res.status, 201);
    const doc = JSON.parse(res.body);
    assert.ok(doc.id, 'deve ter id');
    assert.strictEqual(doc.originalName, 'teste.txt');
    assert.ok(doc.filename, 'deve ter filename');
    // Limpeza do arquivo gravado no storage
    const storagePath = path.resolve(__dirname, '../storage', doc.filename);
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
  } finally {
    documentRepository.clear();
    await new Promise((r) => server.close(r));
  }
});

test('GET /documents retorna lista de documentos', async () => {
  documentRepository.clear();
  const server = await startServer();
  try {
    // Faz upload primeiro
    const upload = await multipartRequest(server, 'POST', '/upload', 'file', 'dados', 'lista.txt');
    const doc = JSON.parse(upload.body);

    const res = await request(server, 'GET', '/documents');
    assert.strictEqual(res.status, 200);
    const list = JSON.parse(res.body);
    assert.ok(Array.isArray(list));
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].originalName, 'lista.txt');

    // Limpeza
    const storagePath = path.resolve(__dirname, '../storage', doc.filename);
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
  } finally {
    documentRepository.clear();
    await new Promise((r) => server.close(r));
  }
});

test('GET /documents/:id/download retorna 404 para id inexistente', async () => {
  documentRepository.clear();
  const server = await startServer();
  try {
    const res = await request(server, 'GET', '/documents/9999/download');
    assert.strictEqual(res.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('GET /documents/:id/download retorna o arquivo', async () => {
  documentRepository.clear();
  const server = await startServer();
  try {
    const upload = await multipartRequest(server, 'POST', '/upload', 'file', 'conteúdo download', 'download.txt');
    const doc = JSON.parse(upload.body);

    const res = await request(server, 'GET', `/documents/${doc.id}/download`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('conteúdo download'), 'corpo deve ter conteúdo do arquivo');

    // Limpeza
    const storagePath = path.resolve(__dirname, '../storage', doc.filename);
    if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
  } finally {
    documentRepository.clear();
    await new Promise((r) => server.close(r));
  }
});

