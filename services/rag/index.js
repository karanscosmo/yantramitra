/**
 * YantraMitra Platform — Enterprise Hybrid Vector RAG Main Facade Service
 * Unifies Document Extraction, Text Chunking, Embedding Generation, Vector Storage,
 * Intent Detection, Similar Incident Retrieval, Hybrid Retrieval, Context Building, and Citation Verification
 */

const fs = require('fs');
const path = require('path');
const vectorStore = require('./vectorStore');
const { extractDocumentContent } = require('./documentExtractor');
const { chunkDocument } = require('./textChunker');
const { retrieveHybridContext } = require('./hybridRetriever');
const { buildFusedRAGContext } = require('./contextBuilder');
const { appendVerifiedCitations } = require('./citationEngine');

const KNOWLEDGE_BASE_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge_base');
let isInitialized = false;
let fallbackModeActive = false;

/**
 * Initializes RAG pipeline and indexes seed knowledge base manuals
 */
async function initializeRAGPipeline() {
  if (isInitialized) return;

  // Skip re-indexing if vector store already populated from persisted file
  const existingStats = vectorStore.getStats();
  if (existingStats.totalChunks > 0) {
    isInitialized = true;
    console.log(`[RAG Init] Vector store already populated (${existingStats.totalChunks} chunks, ${existingStats.totalDocuments} docs). Skipping re-index.`);
    return;
  }

  try {
    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
      fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
    }

    const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => !f.startsWith('.'));
    console.log(`[RAG Init] Indexing ${files.length} knowledge base manuals from data/knowledge_base/...`);

    for (const fileName of files) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, fileName);
      await indexSingleFile(filePath, fileName);
    }

    isInitialized = true;
    fallbackModeActive = false;
    console.log(`[RAG Init] Hybrid Vector RAG Pipeline Initialized successfully (${vectorStore.getStats().totalChunks} total chunks indexed).`);
  } catch (err) {
    console.error('[RAG Init Error] Vector RAG initialization warning:', err.message);
    fallbackModeActive = true;
  }
}

/**
 * Indexes a single file path into the vector store (Incremental Indexing)
 */
async function indexSingleFile(filePath, fileName) {
  try {
    const extracted = await extractDocumentContent(filePath, { fileName });
    const chunks = chunkDocument(extracted.text, {
      docId: fileName,
      docName: fileName,
      docType: extracted.metadata.docType,
      uploadDate: new Date().toISOString()
    });

    vectorStore.addDocumentChunks({ id: fileName, name: fileName, type: extracted.metadata.docType }, chunks);
    return chunks.length;
  } catch (err) {
    console.error(`[RAG Index Error] Failed to index ${fileName}:`, err.message);
    return 0;
  }
}

/**
 * Core RAG Execution Facade for /api/ai-chat, /api/ai-chat/stream, and /api/ai-upload
 */
async function queryHybridRAG(queryText, options = {}) {
  // Ensure pipeline is initialized
  if (!isInitialized) {
    await initializeRAGPipeline();
  }

  try {
    // Execute Hybrid Retrieval across Vector Store + PostgreSQL + Similar Incidents
    const hybridResult = await retrieveHybridContext(queryText, options);

    // Build Ranked & Fused Context Window
    const contextObj = buildFusedRAGContext(hybridResult, options);

    return {
      success: true,
      systemPrompt: contextObj.systemPrompt,
      sources: contextObj.sources,
      intent: contextObj.intent,
      fallback: false
    };
  } catch (err) {
    console.error('[RAG Exec Warning] Hybrid RAG query error, using fallback context:', err.message);
    return buildFallbackContext(queryText);
  }
}

/**
 * Fallback Context Builder (used if Vector DB is uninitialized or fails)
 */
function buildFallbackContext(queryText) {
  return {
    success: true,
    systemPrompt: `You are YantraNklan, YantraMitra's industrial AI copilot. Provide actionable operational assistance using markdown formatting.`,
    sources: [{ id: 'fallback-src', name: 'System Database Fallback', type: 'Fallback', ref: '[Database: Fallback Mode]' }],
    intent: 'general',
    fallback: true
  };
}

/**
 * Admin: Re-indexes all knowledge base files
 */
async function reindexAllDocuments() {
  isInitialized = false;
  await initializeRAGPipeline();
  return vectorStore.getStats();
}

/**
 * Admin: Gets system status
 */
function getRAGStatus() {
  const stats = vectorStore.getStats();
  return {
    initialized: isInitialized,
    fallbackModeActive,
    provider: stats.providerName,
    embeddingModel: 'Dense Vector (384-dim TF-IDF + Character Trigram Hash)',
    totalDocuments: stats.totalDocuments,
    totalChunks: stats.totalChunks,
    storageSizeKb: stats.storageSizeKb,
    lastReindexTime: stats.lastReindexTime,
    status: fallbackModeActive ? 'Warning' : 'Healthy'
  };
}

module.exports = {
  initializeRAGPipeline,
  queryHybridRAG,
  appendVerifiedCitations,
  indexSingleFile,
  reindexAllDocuments,
  getRAGStatus,
  vectorStore
};
