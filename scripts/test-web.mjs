import * as cheerio from 'cheerio';

async function testWeb() {
  const url = 'https://pydantic.dev/docs/ai/harness/guardrails/';
  console.log('Fetching URL:', url);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    console.log('HTTP Status:', res.status);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || $('h1').first().text().trim();
    console.log('Scraped Title:', title);

    $('script, style, nav, footer, header, iframe, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    console.log('Extracted Body Text Length:', bodyText.length);
    console.log('Sample Text:', bodyText.slice(0, 300));
  } catch (err) {
    console.error('Scrape Error:', err);
  }
}

testWeb();
