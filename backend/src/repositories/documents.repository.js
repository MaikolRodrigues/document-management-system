class DocumentsRepository {
  constructor() {
    this.documents = [];
  }

  save(documentMetadata) {
    this.documents.push(documentMetadata);
    return { ...documentMetadata };
  }

  list(owner) {
    const filteredDocuments = owner
      ? this.documents.filter((document) => document.owner === owner)
      : this.documents;

    return filteredDocuments.map((document) => ({ ...document }));
  }

  findById(id) {
    const document = this.documents.find((item) => item.id === id);
    return document ? { ...document } : null;
  }
}

module.exports = new DocumentsRepository();
