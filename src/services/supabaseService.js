import { createClient } from '@supabase/supabase-js';
import { calculateNextReview } from './srsEngine.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function saveArticle(articleData) {
  try {
    console.log('[Supabase] saveArticle:', articleData.title);
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select('id')
      .single();

    if (error) throw error;
    console.log('[Supabase] article saved, id:', data.id);
    return data.id;
  } catch (err) {
    console.error('[Supabase] saveArticle error:', err);
    throw err;
  }
}

export async function saveVocabulary(vocabList, articleId) {
  try {
    console.log(`[Supabase] saveVocabulary: ${vocabList.length} words for article ${articleId}`);
    const rows = vocabList.map((v) => ({
      article_id:       articleId,
      word:             v.word,
      pos:              v.pos,
      definition_zh:    v.definition_zh,
      example_sentence: v.example,   // Gemini returns "example", DB uses "example_sentence"
      mnemonic:         v.mnemonic,
      srs_interval:     1,
      next_review_date: new Date().toISOString().split('T')[0],
    }));

    const { error } = await supabase.from('vocabulary').insert(rows);
    if (error) throw error;
    console.log('[Supabase] vocabulary saved');
  } catch (err) {
    console.error('[Supabase] saveVocabulary error:', err);
    throw err;
  }
}

export async function getTodayVocab() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[Supabase] getTodayVocab for:', today);

    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (error) throw error;
    console.log(`[Supabase] found ${data.length} vocab for today`);
    return data;
  } catch (err) {
    console.error('[Supabase] getTodayVocab error:', err);
    throw err;
  }
}

export async function getVocabDueToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[Supabase] getVocabDueToday for:', today);

    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .lte('next_review_date', today);

    if (error) throw error;
    console.log(`[Supabase] found ${data.length} vocab due today`);
    return data;
  } catch (err) {
    console.error('[Supabase] getVocabDueToday error:', err);
    throw err;
  }
}

export async function saveQuizSession(quizData) {
  try {
    console.log('[Supabase] saveQuizSession');
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({ questions_json: quizData, status: 'pending' })
      .select('id')
      .single();

    if (error) throw error;
    console.log('[Supabase] quiz session saved, id:', data.id);
    return data.id;
  } catch (err) {
    console.error('[Supabase] saveQuizSession error:', err);
    throw err;
  }
}

export async function getPendingQuiz() {
  try {
    console.log('[Supabase] getPendingQuiz');
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase] getPendingQuiz error:', err);
    throw err;
  }
}

export async function updateQuizSession(id, status) {
  try {
    console.log(`[Supabase] updateQuizSession ${id} → ${status}`);
    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error('[Supabase] updateQuizSession error:', err);
    throw err;
  }
}

export async function saveQuizResult(resultData) {
  try {
    console.log('[Supabase] saveQuizResult');
    const { error } = await supabase.from('quiz_results').insert(resultData);
    if (error) throw error;
  } catch (err) {
    console.error('[Supabase] saveQuizResult error:', err);
    throw err;
  }
}

export async function updateSRS(vocabId, isCorrect) {
  try {
    console.log(`[Supabase] updateSRS vocabId=${vocabId} isCorrect=${isCorrect}`);
    const { data: vocab, error: fetchErr } = await supabase
      .from('vocabulary')
      .select('srs_interval')
      .eq('id', vocabId)
      .single();

    if (fetchErr) throw fetchErr;

    const { newInterval, nextReviewDate } = calculateNextReview(
      vocab.srs_interval || 1,
      isCorrect
    );

    const { error: updateErr } = await supabase
      .from('vocabulary')
      .update({ srs_interval: newInterval, next_review_date: nextReviewDate })
      .eq('id', vocabId);

    if (updateErr) throw updateErr;
    console.log(`[Supabase] SRS updated: interval=${newInterval}, next=${nextReviewDate}`);
  } catch (err) {
    console.error('[Supabase] updateSRS error:', err);
    throw err;
  }
}

export async function getWeeklyStats() {
  try {
    console.log('[Supabase] getWeeklyStats');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const [vocabRes, resultsRes] = await Promise.all([
      supabase.from('vocabulary').select('*').gte('created_at', weekAgoStr),
      supabase.from('quiz_results').select('*').gte('created_at', weekAgoStr),
    ]);

    if (vocabRes.error) throw vocabRes.error;
    if (resultsRes.error) throw resultsRes.error;

    const stats = {
      total_vocab_learned: vocabRes.data.length,
      total_quizzes:       resultsRes.data.length,
      correct_count:       resultsRes.data.filter((r) => r.is_correct).length,
      vocabulary:          vocabRes.data,
      quiz_results:        resultsRes.data,
    };

    console.log('[Supabase] weekly stats:', {
      vocab: stats.total_vocab_learned,
      quizzes: stats.total_quizzes,
    });
    return stats;
  } catch (err) {
    console.error('[Supabase] getWeeklyStats error:', err);
    throw err;
  }
}
