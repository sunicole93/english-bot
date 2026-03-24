import {
  getPendingQuiz,
  saveQuizResult,
  updateSRS,
  updateQuizSession,
} from "../services/supabaseService.js";
import {
  gradeAnswer,
  translateText,
  lookupEnglishWord,
} from "../services/groq.js";
import {
  replyMessage,
  pushQuizResult,
  replyTranslation,
} from "../services/lineService.js";

// 判斷是否為測驗回答格式：大寫字母串 + 斜線 + 造句，例如 "ABCDBACADB / sentence"
function isQuizAnswer(text) {
  return /^[A-Da-d]+\s*\/\s*.+/.test(text.trim());
}

// 判斷是否為中文翻譯請求：含中文字
function isTranslationRequest(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

// 判斷是否為英文單字查詢：純英文字母（單字或短片語），沒有斜線
function isEnglishWordLookup(text) {
  return /^[a-zA-Z\s'-]+$/.test(text.trim()) && !text.includes("/");
}

export async function handleReply(event) {
  const replyToken = event.replyToken;
  const userText = event.message.text.trim();
  console.log("[HandleReply] User input:", userText);

  // 測驗回答模式（優先判斷，避免被誤判為單字查詢）
  if (isQuizAnswer(userText)) {
    const quizSession = await getPendingQuiz();
    if (!quizSession) {
      await replyMessage(replyToken, "目前沒有待回答的測驗喔！");
      return;
    }
    await gradeQuiz(replyToken, quizSession, userText);
    return;
  }

  // 英文單字查詢模式
  if (isEnglishWordLookup(userText)) {
    try {
      const result = await lookupEnglishWord(userText);
      await replyTranslation(replyToken, result);
    } catch (err) {
      console.error("[HandleReply] lookupEnglishWord error:", err);
      await replyMessage(replyToken, "查詢失敗，請稍後再試。");
    }
    return;
  }

  // 中文翻譯模式
  if (isTranslationRequest(userText)) {
    try {
      const result = await translateText(userText);
      await replyTranslation(replyToken, result);
    } catch (err) {
      console.error("[HandleReply] translateText error:", err);
      await replyMessage(replyToken, "翻譯失敗，請稍後再試。");
    }
    return;
  }

  // 其他輸入：提示使用方式
  await replyMessage(
    replyToken,
    "你可以：\n• 輸入英文單字查詢（如 unprecedented）\n• 輸入中文翻譯（如 我想去旅行）\n• 回答測驗（如 ABCDBACADB / The policy was criticized.）",
  );
}

async function gradeQuiz(replyToken, quizSession, userText) {
  // 解析新格式：「ABCDBACADB / 造句」
  const slashIndex = userText.indexOf("/");
  const mcPart = userText.slice(0, slashIndex).trim().toUpperCase();
  const sentence = userText.slice(slashIndex + 1).trim();

  const quiz = quizSession.questions_json;
  const mcQuestions = quiz.mc_questions || [];

  if (!sentence) {
    await replyMessage(
      replyToken,
      `格式錯誤！請用：\n選擇答案 / 造句\n\n例：ABCDBACADB / The policy was severely criticized.`,
    );
    return;
  }

  const results = [];

  // 批改每一道選擇題
  const mcAnswers = mcPart.split("").filter((c) => /[A-D]/.test(c));
  for (let i = 0; i < mcQuestions.length; i++) {
    const q = mcQuestions[i];
    const userAnswer = mcAnswers[i] || "";
    const isCorrect = userAnswer === q.answer.toUpperCase();
    results.push({
      quiz_session_id: quizSession.id,
      vocab_id: q.vocab_id || null,
      quiz_type: `選擇題`,
      user_answer: userAnswer,
      is_correct: isCorrect,
      feedback: isCorrect
        ? `✅ ${q.word}：答對了！`
        : `❌ ${q.word}：正確答案是 ${q.answer}（${q.options[q.answer]}）`,
      corrected: isCorrect ? "" : `${q.answer}. ${q.options[q.answer]}`,
    });
  }

  // 批改造句題
  const targetWord = quiz.make_sentence?.target_word || "";
  let sentenceResult = {
    correct: false,
    feedback: "批改失敗，請稍後再試",
    corrected: "",
  };
  try {
    sentenceResult = await gradeAnswer(targetWord, targetWord, sentence);
  } catch (err) {
    console.error("[HandleReply] gradeAnswer error:", err);
  }

  results.push({
    quiz_session_id: quizSession.id,
    vocab_id: quiz.make_sentence?.vocab_id || null,
    quiz_type: "造句題",
    user_answer: sentence,
    is_correct: sentenceResult.correct,
    feedback: sentenceResult.feedback,
    corrected: sentenceResult.corrected || "",
  });

  // 存測驗結果
  for (const result of results) {
    try {
      await saveQuizResult(result);
    } catch (err) {
      console.error("[HandleReply] saveQuizResult error:", err);
    }
  }

  // 更新 SRS
  for (const result of results) {
    if (result.vocab_id) {
      try {
        await updateSRS(result.vocab_id, result.is_correct);
      } catch (err) {
        console.error("[HandleReply] updateSRS error:", err);
      }
    }
  }

  // 標記測驗完成
  try {
    await updateQuizSession(quizSession.id, "completed");
  } catch (err) {
    console.error("[HandleReply] updateQuizSession error:", err);
  }

  // 推播結果
  await pushQuizResult(results);
  console.log("[HandleReply] Quiz graded and result pushed");
}
