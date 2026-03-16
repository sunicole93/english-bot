import 'dotenv/config';
import { fetchArticles } from '../services/rssFetcher.js';
import { selectArticle, extractVocabulary } from '../services/gemini.js';
import { saveArticle, saveVocabulary } from '../services/supabaseService.js';
import { pushDailyLesson } from '../services/lineService.js';

export async function run() {
  try {
    console.log('[DailyLesson] Job started');

    // 1. Fetch RSS articles
    const articles = await fetchArticles();
    if (!articles.length) {
      console.error('[DailyLesson] No articles fetched, aborting');
      return;
    }

    // 2. Select best article via Gemini
    const article = await selectArticle(articles);
    console.log('[DailyLesson] Selected article:', article.title);

    // 3. Extract vocabulary via Gemini
    const vocabList = await extractVocabulary(article.title, article.summary_zh || article.summary || '');
    console.log(`[DailyLesson] Extracted ${vocabList.length} vocabulary items`);

    // 4. Generate YouTube search URL
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(article.title + ' explained english')}`;

    // 5. Save article to Supabase
    const articleId = await saveArticle({
      title:       article.title,
      url:         article.url,
      summary_zh:  article.summary_zh,
      source:      article.source,
      level:       article.level,
      youtube_url: youtubeUrl,
    });

    // 6. Save vocabulary to Supabase
    await saveVocabulary(vocabList, articleId);

    // 7. Push LINE message
    await pushDailyLesson(article, vocabList, youtubeUrl);

    console.log('[DailyLesson] Job completed successfully');
  } catch (err) {
    console.error('[DailyLesson] Job failed:', err);
  }
}
