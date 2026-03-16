import 'dotenv/config';
import { getVocabDueToday, getTodayVocab, saveQuizSession } from '../services/supabaseService.js';
import { generateQuiz } from '../services/gemini.js';
import { pushDailyQuiz } from '../services/lineService.js';

export async function run() {
  try {
    console.log('[DailyQuiz] Job started');

    // 1. Get vocab due for review; fall back to today's vocab
    let vocabList = await getVocabDueToday();
    if (!vocabList.length) {
      console.log('[DailyQuiz] No SRS vocab due, falling back to today\'s vocab');
      vocabList = await getTodayVocab();
    }

    if (!vocabList.length) {
      console.warn('[DailyQuiz] No vocabulary available for quiz, aborting');
      return;
    }

    console.log(`[DailyQuiz] Using ${vocabList.length} vocab items`);

    // 2. Generate quiz via Gemini
    const quiz = await generateQuiz(vocabList);
    console.log('[DailyQuiz] Quiz generated');

    // 3. Save quiz session
    const sessionId = await saveQuizSession({ quiz_data: quiz });
    console.log('[DailyQuiz] Quiz session saved, id:', sessionId);

    // 4. Push LINE message
    await pushDailyQuiz({ id: sessionId, quiz_data: quiz });

    console.log('[DailyQuiz] Job completed successfully');
  } catch (err) {
    console.error('[DailyQuiz] Job failed:', err);
  }
}
