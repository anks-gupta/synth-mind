const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = 'synthmind_notebook_chunks';

async function qdrantRequest(path, options = {}) {
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

async function testFullFlow() {
  console.log('1. Checking Collections...');
  const collectionsRes = await qdrantRequest('/collections');
  const exists = collectionsRes.result.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    console.log(`Creating collection ${COLLECTION_NAME}...`);
    await qdrantRequest(`/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      }),
    });

    await qdrantRequest(`/collections/${COLLECTION_NAME}/index`, {
      method: 'PUT',
      body: JSON.stringify({
        field_name: 'notebookId',
        field_schema: 'keyword',
      }),
    });
    console.log('Collection created successfully!');
  } else {
    console.log(`Collection ${COLLECTION_NAME} already exists!`);
  }

  console.log('2. Testing Upsert...');
  const dummyVector = new Array(1536).fill(0).map(() => Math.random());
  const upsertRes = await qdrantRequest(`/collections/${COLLECTION_NAME}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({
      points: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          vector: dummyVector,
          payload: {
            notebookId: 'test-nb-123',
            sourceId: 'test-src-123',
            sourceTitle: 'Test Title',
            sourceType: 'youtube',
            text: 'Hello world RAG test caption chunk',
            chunkIndex: 0,
          },
        },
      ],
    }),
  });

  console.log('Upsert Result:', upsertRes.status);

  console.log('3. Testing Search...');
  const searchRes = await qdrantRequest(`/collections/${COLLECTION_NAME}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector: dummyVector,
      limit: 5,
      filter: {
        must: [
          {
            key: 'notebookId',
            match: {
              value: 'test-nb-123',
            },
          },
        ],
      },
    }),
  });

  console.log('Search Result Count:', searchRes.result.length);
  console.log('Sample Match:', searchRes.result[0]?.payload?.text);
}

testFullFlow();
