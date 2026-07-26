import { parseYouTubeVideo } from '../src/lib/parsers/youtube-parser.ts';

async function test() {
  try {
    const url = 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA';
    console.log('Testing parseYouTubeVideo for URL:', url);
    const result = await parseYouTubeVideo(url, 'test-notebook', 'test-source');
    console.log('Success!');
    console.log('Title:', result.title);
    console.log('Chunks count:', result.chunks.length);
    console.log('Sample chunk:', result.chunks[0]);
  } catch (err) {
    console.error('Error parsing video:', err);
  }
}

test();
