async function testSearch() {
  console.log('Testing vector search with with_payload: true...');
  try {
    const collectionsRes = await fetch(`${process.env.QDRANT_URL}/collections/synthmind_notebook_chunks/points/search`, {
      method: 'POST',
      headers: {
        'api-key': process.env.QDRANT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: new Array(1536).fill(0).map(() => Math.random()),
        limit: 5,
        with_payload: true,
      }),
    });

    const data = await collectionsRes.json();
    console.log('Search Raw Data Count:', data.result?.length);
    if (data.result && data.result.length > 0) {
      console.log('Sample Match Payload:', JSON.stringify(data.result[0].payload, null, 2));
    }
  } catch (err) {
    console.error('Search Test Error:', err);
  }
}

testSearch();
