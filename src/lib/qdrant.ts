const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

export const COLLECTION_NAME = 'synthmind_notebook_chunks';
export const VECTOR_DIMENSION = 1536;

export async function qdrantRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: {
      'api-key': QDRANT_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Qdrant API Error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

export async function ensureQdrantCollection() {
  try {
    const collectionsRes = await qdrantRequest('/collections');
    const exists = collectionsRes.result.collections.some((c: any) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`Creating dedicated Qdrant collection: ${COLLECTION_NAME}...`);
      await qdrantRequest(`/collections/${COLLECTION_NAME}`, {
        method: 'PUT',
        body: JSON.stringify({
          vectors: {
            size: VECTOR_DIMENSION,
            distance: 'Cosine',
          },
        }),
      });
    }

    // Always ensure payload indices exist for filtered searches and deletions
    try {
      await qdrantRequest(`/collections/${COLLECTION_NAME}/index`, {
        method: 'PUT',
        body: JSON.stringify({
          field_name: 'notebookId',
          field_schema: 'keyword',
        }),
      });
    } catch (e) {
      // Ignore if index already exists
    }

    try {
      await qdrantRequest(`/collections/${COLLECTION_NAME}/index`, {
        method: 'PUT',
        body: JSON.stringify({
          field_name: 'sourceId',
          field_schema: 'keyword',
        }),
      });
    } catch (e) {
      // Ignore if index already exists
    }

    console.log(`Qdrant collection ${COLLECTION_NAME} verified.`);
  } catch (error) {
    console.error('Failed to initialize Qdrant collection:', error);
  }
}

/**
 * Delete all Qdrant vector chunks for a specific source.
 * Called when a source is deleted so no ghost chunks remain in search results.
 */
export async function deleteSourceVectors(sourceId: string): Promise<void> {
  try {
    await qdrantRequest(`/collections/${COLLECTION_NAME}/points/delete`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          must: [{ key: 'sourceId', match: { value: sourceId } }],
        },
      }),
    });
    console.log(`Qdrant: deleted vectors for sourceId=${sourceId}`);
  } catch (error) {
    console.error(`Qdrant vector deletion failed for sourceId=${sourceId}:`, error);
    throw error; // re-throw so callers can decide whether to abort
  }
}

/**
 * Delete all Qdrant vector chunks for an entire notebook.
 * Called when a notebook is deleted to ensure no orphaned vectors remain.
 */
export async function deleteNotebookVectors(notebookId: string): Promise<void> {
  try {
    await qdrantRequest(`/collections/${COLLECTION_NAME}/points/delete`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          must: [{ key: 'notebookId', match: { value: notebookId } }],
        },
      }),
    });
    console.log(`Qdrant: deleted all vectors for notebookId=${notebookId}`);
  } catch (error) {
    console.error(`Qdrant notebook vector deletion failed for notebookId=${notebookId}:`, error);
    // Non-fatal for notebook deletion — log and continue
  }
}
