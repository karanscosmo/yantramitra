/**
 * YantraMitra Platform — RAG Modular Vector Database Service
 * Implements an in-memory vector index with Cosine Similarity search, metadata filtering,
 * persistent JSON storage (data/vector_db/vector_store.json), and a pluggable provider interface (ChromaDB / FAISS adapter)
 * Schema Requirement: Stores embeddingModel, embeddingVersion, and embeddingTimestamp per chunk.
 */

const fs = require('fs');
const path = require('path');
const { generateEmbedding, generateEmbeddingAsync, cosineSimilarity, VECTOR_DIM, MODEL_NAME, MODEL_VERSION, getEmbeddingModelInfo } = require('./embeddingGenerator');

const VECTOR_DB_DIR = path.join(__dirname, '..', '..', 'data', 'vector_db');
const VECTOR_DB_FILE = path.join(VECTOR_DB_DIR, 'vector_store.json');

class MemoryVectorProvider {
  constructor() {
    this.providerName = 'In-Memory VectorDB (Swappable ChromaDB/FAISS Adapter)';
    this.documents = new Map(); // docId -> docInfo
    this.chunks = [];           // Array of chunk objects with dense float embeddings
    this.lastReindexTime = null;
    this.initializeStorage();
  }

  initializeStorage() {
    try {
      if (!fs.existsSync(VECTOR_DB_DIR)) {
        fs.mkdirSync(VECTOR_DB_DIR, { recursive: true });
      }
      if (fs.existsSync(VECTOR_DB_FILE)) {
        const raw = fs.readFileSync(VECTOR_DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.chunks)) {
          this.chunks = data.chunks.map(c => ({
            ...c,
            embedding: Float32Array.from(c.embedding)
          }));
          if (Array.isArray(data.documents)) {
            data.documents.forEach(d => this.documents.set(d.id, d));
          }
          this.lastReindexTime = data.lastReindexTime || new Date().toISOString();
        }
      }
    } catch (e) {
      console.error('VectorDB Initialization Warning:', e.message);
    }
  }

  saveStorage() {
    // Skip persist on Vercel (ephemeral filesystem, no cross-invocation persistence needed)
    if (process.env.VERCEL) return;
    try {
      if (!fs.existsSync(VECTOR_DB_DIR)) {
        fs.mkdirSync(VECTOR_DB_DIR, { recursive: true });
      }
      const serializedChunks = this.chunks.map(c => ({
        ...c,
        embedding: Array.from(c.embedding)
      }));
      const serializedDocs = Array.from(this.documents.values());
      const data = {
        providerName: this.providerName,
        embeddingModel: MODEL_NAME,
        embeddingVersion: MODEL_VERSION,
        vectorDimensions: VECTOR_DIM,
        lastReindexTime: this.lastReindexTime || new Date().toISOString(),
        documents: serializedDocs,
        chunks: serializedChunks
      };
      fs.writeFileSync(VECTOR_DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('VectorDB Storage Persist Error:', e.message);
    }
  }

  /**
   * Adds or replaces document chunks in the vector store (Incremental Indexing)
   */
  async addDocumentChunksAsync(docMeta, chunks) {
    if (!docMeta || !docMeta.id) return 0;

    // Delete existing chunks for document (Incremental update)
    this.deleteDocumentChunks(docMeta.id);

    this.documents.set(docMeta.id, {
      id: docMeta.id,
      name: docMeta.name || docMeta.id,
      type: docMeta.type || 'text',
      chunkCount: chunks.length,
      indexedAt: new Date().toISOString()
    });

    const timestamp = new Date().toISOString();
    const newChunks = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbeddingAsync(chunk.text);
      newChunks.push({
        ...chunk,
        docId: docMeta.id,
        embedding,
        embeddingModel: MODEL_NAME,
        embeddingVersion: MODEL_VERSION,
        embeddingTimestamp: timestamp
      });
    }

    this.chunks.push(...newChunks);
    this.lastReindexTime = timestamp;
    this.saveStorage();
    return newChunks.length;
  }

  /**
   * Synchronous version of addDocumentChunks
   */
  addDocumentChunks(docMeta, chunks) {
    if (!docMeta || !docMeta.id) return 0;

    this.deleteDocumentChunks(docMeta.id);

    this.documents.set(docMeta.id, {
      id: docMeta.id,
      name: docMeta.name || docMeta.id,
      type: docMeta.type || 'text',
      chunkCount: chunks.length,
      indexedAt: new Date().toISOString()
    });

    const timestamp = new Date().toISOString();
    const newChunks = chunks.map(chunk => {
      const embedding = generateEmbedding(chunk.text);
      return {
        ...chunk,
        docId: docMeta.id,
        embedding,
        embeddingModel: MODEL_NAME,
        embeddingVersion: MODEL_VERSION,
        embeddingTimestamp: timestamp
      };
    });

    this.chunks.push(...newChunks);
    this.lastReindexTime = timestamp;
    this.saveStorage();
    return newChunks.length;
  }

  /**
   * Deletes document and its chunks from the vector store
   */
  deleteDocumentChunks(docId) {
    this.documents.delete(docId);
    const initialLen = this.chunks.length;
    this.chunks = this.chunks.filter(c => c.docId !== docId);
    this.saveStorage();
    return initialLen - this.chunks.length;
  }

  /**
   * Semantic Vector Search using Cosine Similarity
   */
  similaritySearch(queryText, topK = 5, filterOptions = {}) {
    if (!queryText || this.chunks.length === 0) return [];

    const queryEmbedding = generateEmbedding(queryText);
    const scoredChunks = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];

      // Metadata Filtering
      if (filterOptions.docId && chunk.docId !== filterOptions.docId) continue;
      if (filterOptions.docType && chunk.docType !== filterOptions.docType) continue;
      if (filterOptions.plant && chunk.plant !== filterOptions.plant && chunk.plant !== 'All Plants') continue;
      if (filterOptions.machine && chunk.machine !== filterOptions.machine && chunk.machine !== 'General Machinery') continue;

      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score >= (filterOptions.minScore || 0.15)) {
        scoredChunks.push({
          score: Math.round(score * 1000) / 1000,
          chunk
        });
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK);
  }

  /**
   * Keyword / BM25 Term Matching Search
   */
  keywordSearch(queryText, topK = 5) {
    if (!queryText || this.chunks.length === 0) return [];
    const queryTerms = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryTerms.length === 0) return [];

    const scored = [];
    this.chunks.forEach(chunk => {
      const textLower = chunk.text.toLowerCase();
      let matches = 0;
      queryTerms.forEach(term => {
        if (textLower.includes(term)) matches++;
      });

      if (matches > 0) {
        const score = matches / queryTerms.length;
        scored.push({ score, chunk });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  getStats() {
    let fileSizeKb = 0;
    try {
      if (fs.existsSync(VECTOR_DB_FILE)) {
        fileSizeKb = Math.round(fs.statSync(VECTOR_DB_FILE).size / 1024);
      }
    } catch {}

    const modelInfo = getEmbeddingModelInfo();

    return {
      providerName: this.providerName,
      embeddingModel: modelInfo.modelName,
      embeddingVersion: modelInfo.version,
      vectorDimensions: VECTOR_DIM,
      totalDocuments: this.documents.size,
      totalChunks: this.chunks.length,
      storageSizeKb: fileSizeKb,
      lastReindexTime: this.lastReindexTime || 'Not yet indexed',
      documents: Array.from(this.documents.values())
    };
  }
}

// Global Singleton Instance
const activeVectorDB = new MemoryVectorProvider();

module.exports = activeVectorDB;
