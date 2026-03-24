import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cleanJSON(text) {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

async function chat(prompt, temperature = 0.7) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature,
  });
  return completion.choices[0].message.content;
}

export async function selectArticle(articleList) {
  try {
    console.log("[Groq] selectArticle called");
    const prompt = `你是英文學習材料篩選器。從以下文章清單選出1篇最適合B2-C1程度學習者的文章。
選擇標準：詞彙豐富但不過度學術、話題具時事性、避免純政治爭議內容。
文章清單：${JSON.stringify(articleList)}
只回傳JSON不要加說明或markdown：
{"title":"","url":"","summary_zh":"（50字繁體中文摘要）","source":"","level":"B2或C1"}`;

    const text = await chat(prompt);
    const cleaned = cleanJSON(text);
    console.log("[Groq] selectArticle response:", cleaned);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] selectArticle error:", err);
    throw err;
  }
}

export async function extractVocabulary(articleTitle, articleSummary) {
  try {
    console.log("[Groq] extractVocabulary called");
    const prompt = `你是專業英漢詞典編輯，請從以下英文文章擷取10個對C1-C2程度學習者最有價值的單字。
目標：挑選母語者日常不常說、但在正式寫作/閱讀中頻繁出現的高價值單字。
優先選：學術詞彙AWL、低頻但實用的動詞/形容詞、容易誤用的詞、有豐富搭配詞的詞。
避免：太基礎的詞（如 important, show, use）、純專業術語（如 GDP, algorithm）。
文章標題：${articleTitle}
文章摘要：${articleSummary}

重要規則：
1. definition_zh 必須使用正確的「繁體中文」，不可用簡體字
2. definition_zh 要簡短精確，例如：loom → "隱約浮現；迫在眉睫"、disrupt → "擾亂；中斷"、unprecedented → "前所未有的"
3. mnemonic 用一句有趣的繁體中文記憶法，幫助聯想記憶
4. example 必須是含該單字的完整英文句子，展示道地用法

只回傳JSON array不要加說明或markdown：
[{"word":"","pos":"n./v./adj./adv.","definition_zh":"（精確繁體中文解釋）","example":"（含單字的完整英文句子）","mnemonic":"（一句繁體中文記憶法）"}]`;

    const text = await chat(prompt, 0.2);
    const cleaned = cleanJSON(text);
    console.log("[Groq] extractVocabulary response received");
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] extractVocabulary error:", err);
    throw err;
  }
}

export async function generateQuiz(vocabList) {
  try {
    console.log("[Groq] generateQuiz called");

    // 為每個單字各出一道 4 選 1 定義題
    const mcPrompt = `根據以下單字清單，為「每一個」單字各出一道4選1定義選擇題。
單字清單：${JSON.stringify(vocabList.map((v) => ({ id: v.id, word: v.word, definition_zh: v.definition_zh })))}

規則：
1. 每個單字出一題，問「哪個是這個單字的正確中文意思？」
2. 4個選項中只有1個正確，其他3個是合理但錯誤的干擾選項
3. 正確答案位置要隨機分佈（不要全是A）
4. vocab_id 填入該單字的 id

只回傳JSON array不要加說明或markdown：
[{"word":"","question":"Which meaning is correct for 'word'?","options":{"A":"","B":"","C":"","D":""},"answer":"A","vocab_id":""}]`;

    const mcText = await chat(mcPrompt, 0.3);
    const mcQuestions = JSON.parse(cleanJSON(mcText));

    // 選第一個單字出造句題
    const sentenceWord = vocabList[0];
    const sentenceQuestion = {
      question: `請用單字 "${sentenceWord.word}" 造一個完整的英文句子`,
      target_word: sentenceWord.word,
      vocab_id: sentenceWord.id || null,
    };

    console.log("[Groq] generateQuiz response received");
    return { mc_questions: mcQuestions, make_sentence: sentenceQuestion };
  } catch (err) {
    console.error("[Groq] generateQuiz error:", err);
    throw err;
  }
}

export async function gradeAnswer(targetWord, definition, userAnswer) {
  try {
    console.log("[Groq] gradeAnswer called for word:", targetWord);
    const prompt = `學習者用單字「${targetWord}」（中文：${definition}）造了句子：「${userAnswer}」
判斷是否正確使用（語法、語意、搭配詞）。
只回傳JSON不要加說明或markdown：
{"correct":true,"feedback":"（繁體中文50字內鼓勵性語氣）","corrected":"（若有錯給修正版，正確則空字串）"}`;

    const text = await chat(prompt);
    const cleaned = cleanJSON(text);
    console.log("[Groq] gradeAnswer response:", cleaned);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] gradeAnswer error:", err);
    throw err;
  }
}

export async function lookupEnglishWord(word) {
  try {
    console.log("[Groq] lookupEnglishWord called:", word);
    const prompt = `請解釋以下英文單字，用繁體中文說明，幫助中文母語者學習。
英文單字：${word}
只回傳JSON不要加說明或markdown：
{"type":"word","chinese":"（這個字的中文意思）","english":"${word}","pronunciation":"（英式音標，例如 /ˈfed.ər.əl.i/）","definition_zh":"（詳細中文解釋，說明詞性和用法）","example":"（一個自然的英文例句）","synonyms":["相似詞1","相似詞2","相似詞3"],"antonyms":["相反詞1","相反詞2"],"collocations":["常見搭配詞1","常見搭配詞2","常見搭配詞3"]}`;

    const text = await chat(prompt);
    const cleaned = cleanJSON(text);
    console.log("[Groq] lookupEnglishWord response:", cleaned);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] lookupEnglishWord error:", err);
    throw err;
  }
}

export async function translateText(chineseText) {
  try {
    console.log("[Groq] translateText called:", chineseText);

    // Detect if single word (Chinese word ≤ 4 chars, no spaces)
    const isWord =
      chineseText.trim().length <= 4 && !/\s/.test(chineseText.trim());

    if (isWord) {
      const prompt = `請將以下中文單字翻譯成道地英文，並提供延伸學習內容。
中文單字：${chineseText}
只回傳JSON不要加說明或markdown：
{"type":"word","chinese":"${chineseText}","english":"","pronunciation":"（英式音標）","definition_zh":"（中文解釋）","example":"（道地例句）","synonyms":["相似詞1","相似詞2","相似詞3"],"antonyms":["相反詞1","相反詞2"],"collocations":["常見搭配詞1","常見搭配詞2","常見搭配詞3"]}`;

      const text = await chat(prompt);
      const cleaned = cleanJSON(text);
      console.log("[Groq] translateText (word) response:", cleaned);
      return JSON.parse(cleaned);
    } else {
      const prompt = `請將以下中文翻譯成道地自然的英文，避免逐字直譯，使用母語者慣用表達方式。
中文：${chineseText}
只回傳JSON不要加說明或markdown：
{"type":"phrase","chinese":"${chineseText}","english":"（道地英文翻譯）","literal":"（直譯版本，供對比）","explanation":"（為什麼這樣翻比較道地，繁體中文30字內）","alternatives":["另一種說法1","另一種說法2"]}`;

      const text = await chat(prompt);
      const cleaned = cleanJSON(text);
      console.log("[Groq] translateText (phrase) response:", cleaned);
      return JSON.parse(cleaned);
    }
  } catch (err) {
    console.error("[Groq] translateText error:", err);
    throw err;
  }
}

export async function analyzeFinancialReport(text) {
  try {
    console.log("[Groq] analyzeFinancialReport called, length:", text.length);
    const prompt = `你是一位專業的財經分析師，精通台灣股票市場與全球產業鏈。
請分析以下財經報告或文章，並以繁體中文整理輸出。

報告內容：
${text}

請只回傳 JSON，不要加說明或 markdown，格式如下：
{
  "summary": "核心摘要，200字內，用白話文說明這份報告在講什麼",
  "key_points": ["重點1", "重點2", "重點3"],
  "industry_chain": {
    "upstream": [{"name": "環節或公司名", "description": "說明在做什麼"}],
    "midstream": [{"name": "環節或公司名", "description": "說明在做什麼"}],
    "downstream": [{"name": "環節或公司名", "description": "說明在做什麼"}]
  },
  "taiwan_stocks": [
    {
      "name": "公司名稱",
      "ticker": "股票代號（不知道就填空字串）",
      "role": "在產業鏈中的位置（上游/中游/下游）",
      "strengths": ["優勢1", "優勢2"],
      "weaknesses": ["劣勢1", "劣勢2"]
    }
  ],
  "outlook": "整體產業展望，100字內"
}`;

    const text_result = await chat(prompt, 0.3);
    const cleaned = cleanJSON(text_result);
    console.log("[Groq] analyzeFinancialReport response received");
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] analyzeFinancialReport error:", err);
    throw err;
  }
}

export async function generateWeeklyReport(stats) {
  try {
    console.log("[Groq] generateWeeklyReport called");
    const prompt = `以下是我這週的英文學習數據：${JSON.stringify(stats)}
請用繁體中文生成週報包含：1.學習摘要 2.最強項3個單字 3.需加強3個單字 4.補考清單 5.激勵話語
只回傳JSON不要加說明或markdown：
{"summary":"","strengths":[""],"weaknesses":[{"word":"","suggestion":""}],"retry_list":[""],"motivation":""}`;

    const text = await chat(prompt);
    const cleaned = cleanJSON(text);
    console.log("[Groq] generateWeeklyReport response received");
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[Groq] generateWeeklyReport error:", err);
    throw err;
  }
}
