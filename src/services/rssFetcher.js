import Parser from 'rss-parser';

const parser = new Parser();

const RSS_SOURCES = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'http://rss.cnn.com/rss/edition_world.rss', source: 'CNN' },
  { url: 'https://feeds.feedburner.com/TedtalksHD', source: 'TED' },
];

export async function fetchArticles() {
  const articles = [];

  for (const { url, source } of RSS_SOURCES) {
    try {
      console.log(`[RSS] Fetching from ${source}: ${url}`);
      const feed = await parser.parseURL(url);
      const items = feed.items.slice(0, 5);

      for (const item of items) {
        const summary = item.contentSnippet || item.summary || item.content || '';
        if (!summary.trim()) continue;

        articles.push({
          title: item.title || '',
          url: item.link || '',
          summary,
          source,
        });
      }

      console.log(`[RSS] ${source}: fetched ${items.length} items`);
    } catch (err) {
      console.error(`[RSS] Failed to fetch from ${source}:`, err.message);
    }
  }

  console.log(`[RSS] Total articles fetched: ${articles.length}`);
  return articles;
}
