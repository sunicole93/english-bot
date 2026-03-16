import { getPendingQuiz, saveQuizResult, updateSRS, updateQuizSession } from '../services/supabaseService.js';
import { gradeAnswer, translateText } from '../services/gemini.js';
import { replyMessage, pushQuizResult, replyTranslation } from '../services/lineService.js';

// 判斷是否為翻譯請求：含中文字且不符合測驗回答格式
function isTranslationRequest(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const isQuizFormat = /^1\..+\/\s*2\..+\/\s*3\..+/.test(text);
  return hasChinese && !isQuizFormat;
}

export async function handleReply(event) {
  const replyToken = event.replyToken;
  const userText = event.message.text.trim();
  console.log('[HandleReply] User input:', userText);

  // 翻譯模式：訊息含中文且不是測驗回答格式
  if (isTranslationRequest(userText)) {
    try {
      const result = await translateText(userText);
      await replyTranslation(replyToken, result);
    } catch (err) {
      console.error('[HandleReply] translateText error:', err);
      await replyMessage(replyToken, '翻譯失敗，請稍後再試。');
    }
    return;
  }

  // 取得待回答測驗
  const quizSession = await getPendingQuiz();
  if (!quizSession) {
    await replyMessage(replyToken, '目前沒有待回答的測驗喔！');
    return;
  }

  // 解析格式：「1. 答案 / 2. A / 3. 造句」
  const parts = userText.split('/').map((s) => s.trim());
  if (parts.length !== 3) {
    await replyMessage(
      replyToken,
      '格式錯誤！請用以下格式回答：\n1. 填空答案 / 2. A或B或C或D / 3. 造句句子\n\n例：1. unprecedented / 2. B / 3. The unprecedented event shocked everyone.'
    );
    return;
  }

  const answer1 = parts[0].replace(/^1\.\s*/, '').trim();
  const answer2 = parts[1].replace(/^2\.\s*/, '').trim().toUpperCase();
  const answer3 = parts[2].replace(/^3\.\s*/, '').trim();

  if (!answer1 || !answer2 || !answer3) {
    await replyMessage(
      replyToken,
      '格式錯誤！請確認每一題都有填寫。\n格式：1. 填空答案 / 2. A或B或C或D / 3. 造句句子'
    );
    return;
  }

  // quiz_sessions 欄位為 questions_json
  const quiz = quizSession.questions_json;
  const results = [];

  // 批改填空題
  const fillCorrect =
    answer1.toLowerCase().trim() === quiz.fill_blank.answer.toLowerCase().trim();
  results.push({
    quiz_session_id: quizSession.id,
    vocab_id:        quiz.fill_blank.vocab_id || null,
    quiz_type:       '填空題',
    user_answer:     answer1,
    is_correct:      fillCorrect,
    feedback:        fillCorrect ? '答對了！' : `正確答案是：${quiz.fill_blank.answer}`,
    corrected:       fillCorrect ? '' : quiz.fill_blank.answer,
  });

  // 批改選擇題
  const mcCorrect = answer2 === quiz.multiple_choice.answer.toUpperCase().trim();
  results.push({
    quiz_session_id: quizSession.id,
    vocab_id:        quiz.multiple_choice.vocab_id || null,
    quiz_type:       '選擇題',
    user_answer:     answer2,
    is_correct:      mcCorrect,
    feedback:        mcCorrect ? '選對了！' : `正確答案是：${quiz.multiple_choice.answer}`,
    corrected:       mcCorrect ? '' : `${quiz.multiple_choice.answer}. ${quiz.multiple_choice.options[quiz.multiple_choice.answer]}`,
  });

  // 批改造句題（Gemini）
  let sentenceResult = { correct: false, feedback: '批改失敗，請稍後再試', corrected: '' };
  try {
    const targetWord = quiz.make_sentence.target_word;
    sentenceResult = await gradeAnswer(targetWord, targetWord, answer3);
  } catch (err) {
    console.error('[HandleReply] gradeAnswer error:', err);
  }

  results.push({
    quiz_session_id: quizSession.id,
    vocab_id:        quiz.make_sentence.vocab_id || null,
    quiz_type:       '造句題',
    user_answer:     answer3,
    is_correct:      sentenceResult.correct,
    feedback:        sentenceResult.feedback,
    corrected:       sentenceResult.corrected || '',
  });

  // 存測驗結果
  for (const result of results) {
    try {
      await saveQuizResult(result);
    } catch (err) {
      console.error('[HandleReply] saveQuizResult error:', err);
    }
  }

  // 更新 SRS
  for (const result of results) {
    if (result.vocab_id) {
      try {
        await updateSRS(result.vocab_id, result.is_correct);
      } catch (err) {
        console.error('[HandleReply] updateSRS error:', err);
      }
    }
  }

  // 標記測驗完成
  try {
    await updateQuizSession(quizSession.id, 'completed');
  } catch (err) {
    console.error('[HandleReply] updateQuizSession error:', err);
  }

  // 推播結果
  await pushQuizResult(results);
  console.log('[HandleReply] Quiz graded and result pushed');
}
