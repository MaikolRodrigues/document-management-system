// Repositório em memória para metadados de documentos.
const documents = [];
let nextId = 1;

function save(metadata) {
  const doc = { id: nextId++, ...metadata };
  documents.push(doc);
  return doc;
}

function findAll() {
  return [...documents];
}

function findById(id) {
  return documents.find((d) => d.id === Number(id)) || null;
}

// Usado nos testes para reiniciar o estado.
function clear() {
  documents.length = 0;
  nextId = 1;
}

module.exports = { save, findAll, findById, clear };
