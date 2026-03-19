import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cleanJSON(text) {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

async function chat(prompt) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
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
    const prompt = `根據以下英文文章擷取10個對B2-C1學習者最有價值的單字。
優先選：多義詞、學術詞彙AWL、高頻搭配詞、常見誤用詞。
文章標題：${articleTitle}
文章摘要：${articleSummary}
只回傳JSON array不要加說明或markdown：
[{"word":"","pos":"n./v./adj./adv.","definition_zh":"","example":"（含單字的完整例句）","mnemonic":"（一句中文記憶法）"}]`;

    const text = await chat(prompt);
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
    const prompt = `根據以下單字清單出3道測驗題。
單字清單：${JSON.stringify(vocabList)}
題型1(fill_blank)：選1個單字造填空句，用___表示空格
題型2(multiple_choice)：選1個單字出4選1定義題，選項用A/B/C/D
題型3(make_sentence)：選1個單字請學習者造句
只回傳JSON不要加說明或markdown：
{"fill_blank":{"question":"","answer":"","vocab_id":""},"multiple_choice":{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"","vocab_id":""},"make_sentence":{"question":"請用單字___造一個完整英文句子","target_word":"","vocab_id":""}}`;

    const text = await chat(prompt);
    const cleaned = cleanJSON(text);
    console.log("[Groq] generateQuiz response received");
    return JSON.parse(cleaned);
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
