import Parser from "rss-parser";

const parser = new Parser();

const RSS_SOURCES = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC" },
  { url: "http://rss.cnn.com/rss/edition_world.rss", source: "CNN" },
  { url: "https://feeds.feedburner.com/TedtalksHD", source: "TED" },
];

// 只保留 7 天內的文章
const RECENT_DAYS = 7;

export async function fetchArticles() {
  const articles = [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

  for (const { url, source } of RSS_SOURCES) {
    try {
      console.log(`[RSS] Fetching from ${source}: ${url}`);
      const feed = await parser.parseURL(url);

      for (const item of feed.items) {
        // 檢查文章日期，過濾掉太舊的
        const pubDate = item.isoDate
          ? new Date(item.isoDate)
          : item.pubDate
            ? new Date(item.pubDate)
            : null;
        if (pubDate && pubDate < cutoff) {
          console.log(
            `[RSS] ${source}: skipping old article (${pubDate.toISOString().slice(0, 10)}): ${item.title?.slice(0, 40)}`,
          );
          continue;
        }

        const summary =
          item.contentSnippet || item.summary || item.content || "";
        if (!summary.trim()) continue;

        articles.push({
          title: item.title || "",
          url: item.link || "",
          summary,
          source,
          pubDate: pubDate ? pubDate.toISOString().slice(0, 10) : "",
        });
      }

      console.log(
        `[RSS] ${source}: fetched ${articles.length} recent items so far`,
      );
    } catch (err) {
      console.error(`[RSS] Failed to fetch from ${source}:`, err.message);
    }
  }

  console.log(`[RSS] Total recent articles fetched: ${articles.length}`);
  return articles;
}
