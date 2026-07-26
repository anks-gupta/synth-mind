import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  try {
    const videoId = 'ekcEWlNoZ7Y';
    console.log('Testing transcript for video:', videoId);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('Success! Transcript count:', transcript.length);
    console.log('Sample:', transcript.slice(0, 3));
  } catch (err) {
    console.error('Error fetching transcript:', err);
  }
}

test();
