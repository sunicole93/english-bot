import { messagingApi } from "@line/bot-sdk";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const USER_ID = process.env.LINE_USER_ID;

export async function pushDailyLesson(article, vocabList, youtubeUrl) {
  console.log("[LINE] pushDailyLesson");

  const vocabLines = vocabList.map((v) => ({
    type: "text",
    text: `${v.word} ${v.pos} — ${v.definition_zh}`,
    size: "sm",
    color: "#333333",
    wrap: true,
  }));

  const firstVocab = vocabList[0];

  const message = {
    type: "flex",
    altText: `📚 今日英文課：${article.title}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0F6E56",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: article.source || "今日英文",
            color: "#AFFFDE",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: article.title,
            color: "#FFFFFF",
            size: "md",
            weight: "bold",
            wrap: true,
          },
          {
            type: "text",
            text: `程度：${article.level || "B2-C1"}`,
            color: "#CCFFEE",
            size: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: article.summary_zh || "",
            size: "sm",
            color: "#444444",
            wrap: true,
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "📖 今日單字",
            size: "md",
            weight: "bold",
            color: "#0F6E56",
            margin: "md",
          },
          ...vocabLines,
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: `💡 記憶法：${firstVocab?.mnemonic || ""}`,
            size: "sm",
            color: "#666666",
            wrap: true,
            margin: "md",
          },
          {
            type: "text",
            text: `🎬 延伸影片：${article.title} explained`,
            size: "sm",
            color: "#185FA5",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0F6E56",
            action: {
              type: "uri",
              label: "閱讀原文",
              uri: article.url,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "搜尋影片",
              uri: youtubeUrl,
            },
          },
        ],
      },
    },
  };

  await client.pushMessage({ to: USER_ID, messages: [message] });
  console.log("[LINE] pushDailyLesson sent");
}

export async function pushDailyQuiz(quizSession) {
  console.log("[LINE] pushDailyQuiz");
  const quiz = quizSession.quiz_data;
  const mcQuestions = quiz.mc_questions || [];

  // 每個選擇題產生一個區塊
  const mcContents = mcQuestions.flatMap((q, i) => [
    {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        {
          type: "text",
          text: `${i + 1}. ${q.word}`,
          size: "sm",
          weight: "bold",
          color: "#534AB7",
        },
        {
          type: "text",
          text: Object.entries(q.options)
            .map(([k, v]) => `${k}. ${v}`)
            .join("　"),
          size: "xs",
          wrap: true,
          color: "#555555",
        },
      ],
    },
    { type: "separator", margin: "sm" },
  ]);

  const message = {
    type: "flex",
    altText: "📝 今日單字測驗！",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#534AB7",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📝 今日單字測驗",
            color: "#FFFFFF",
            size: "lg",
            weight: "bold",
          },
          {
            type: "text",
            text: `${mcQuestions.length} 題選擇 + 1 題造句`,
            color: "#CCCCFF",
            size: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "每個單字選出正確的中文意思：",
            size: "xs",
            color: "#888888",
          },
          { type: "separator", margin: "sm" },
          ...mcContents,
          {
            type: "text",
            text: "✍️ 造句題",
            size: "sm",
            weight: "bold",
            color: "#534AB7",
            margin: "md",
          },
          {
            type: "text",
            text: quiz.make_sentence?.question || "",
            size: "sm",
            wrap: true,
            color: "#333333",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        spacing: "xs",
        contents: [
          {
            type: "text",
            text: "回答格式：",
            size: "sm",
            weight: "bold",
            color: "#333333",
          },
          {
            type: "text",
            text: `選擇題：依序填每題答案，例如 ABCDBACADB`,
            size: "xs",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `造句：在答案後加 / 然後造句`,
            size: "xs",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `範例：ABCDBACADB / The policy was severely criticized.`,
            size: "xs",
            color: "#999999",
            wrap: true,
          },
        ],
      },
    },
  };

  await client.pushMessage({ to: USER_ID, messages: [message] });
  console.log("[LINE] pushDailyQuiz sent");
}

export async function pushQuizResult(results) {
  console.log("[LINE] pushQuizResult");
  const correctCount = results.filter((r) => r.is_correct).length;
  const total = results.length;

  let headerColor = "#D85A30";
  if (correctCount === total) headerColor = "#0F6E56";
  else if (correctCount > 0) headerColor = "#EF9F27";

  const resultItems = results.map((r) => ({
    type: "box",
    layout: "vertical",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: `${r.is_correct ? "✅" : "❌"} ${r.question_type}`,
        size: "sm",
        weight: "bold",
        color: r.is_correct ? "#0F6E56" : "#D85A30",
      },
      {
        type: "text",
        text: r.feedback || "",
        size: "xs",
        wrap: true,
        color: "#555555",
      },
      ...(r.corrected
        ? [
            {
              type: "text",
              text: `修正：${r.corrected}`,
              size: "xs",
              wrap: true,
              color: "#185FA5",
            },
          ]
        : []),
    ],
  }));

  const message = {
    type: "flex",
    altText: `測驗結果：${correctCount}/${total} 題正確`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerColor,
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📋 測驗結果",
            color: "#FFFFFF",
            size: "lg",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: resultItems,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "text",
            text: `得分：${correctCount} / ${total}`,
            size: "md",
            weight: "bold",
            color: headerColor,
            align: "center",
          },
          {
            type: "text",
            text:
              correctCount === total
                ? "太棒了！全部答對！繼續保持！🎉"
                : correctCount > 0
                  ? "不錯喔！繼續加油！💪"
                  : "沒關係，明天再接再厲！📚",
            size: "sm",
            align: "center",
            color: "#666666",
            wrap: true,
          },
        ],
      },
    },
  };

  await client.pushMessage({ to: USER_ID, messages: [message] });
  console.log("[LINE] pushQuizResult sent");
}

export async function pushWeeklyReport(report) {
  console.log("[LINE] pushWeeklyReport");

  const strengthItems = (report.strengths || []).map((w) => ({
    type: "text",
    text: `✨ ${w}`,
    size: "sm",
    color: "#0F6E56",
    wrap: true,
  }));

  const weaknessItems = (report.weaknesses || []).map((w) => ({
    type: "text",
    text: `📌 ${w.word}：${w.suggestion}`,
    size: "sm",
    color: "#D85A30",
    wrap: true,
  }));

  const retryItems = (report.retry_list || []).map((w) => ({
    type: "text",
    text: `🔄 ${w}`,
    size: "sm",
    color: "#EF9F27",
    wrap: true,
  }));

  const message = {
    type: "flex",
    altText: "📊 本週學習週報出爐！",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#185FA5",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📊 本週學習週報",
            color: "#FFFFFF",
            size: "lg",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "📝 學習摘要",
            size: "sm",
            weight: "bold",
            color: "#185FA5",
          },
          {
            type: "text",
            text: report.summary || "",
            size: "sm",
            wrap: true,
            color: "#333333",
          },
          { type: "separator" },
          {
            type: "text",
            text: "💪 本週最強單字",
            size: "sm",
            weight: "bold",
            color: "#0F6E56",
          },
          ...strengthItems,
          { type: "separator" },
          {
            type: "text",
            text: "📚 需加強單字",
            size: "sm",
            weight: "bold",
            color: "#D85A30",
          },
          ...weaknessItems,
          { type: "separator" },
          {
            type: "text",
            text: "🔄 補考清單",
            size: "sm",
            weight: "bold",
            color: "#EF9F27",
          },
          ...retryItems,
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "text",
            text: report.motivation || "持續學習，你最棒！",
            size: "sm",
            align: "center",
            wrap: true,
            color: "#185FA5",
          },
        ],
      },
    },
  };

  await client.pushMessage({ to: USER_ID, messages: [message] });
  console.log("[LINE] pushWeeklyReport sent");
}

export async function replyTranslation(replyToken, result) {
  try {
    console.log("[LINE] replyTranslation type:", result.type);

    let contents;

    if (result.type === "word") {
      contents = {
        type: "bubble",
        size: "giga",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#1A1A2E",
          paddingAll: "16px",
          contents: [
            {
              type: "text",
              text: "🔤 單字翻譯",
              color: "#A8D8EA",
              size: "xs",
              weight: "bold",
            },
            {
              type: "text",
              text: result.english,
              color: "#FFFFFF",
              size: "xxl",
              weight: "bold",
            },
            {
              type: "text",
              text: result.pronunciation || "",
              color: "#A8D8EA",
              size: "sm",
            },
            {
              type: "text",
              text: result.chinese + "　" + result.definition_zh,
              color: "#CCCCFF",
              size: "sm",
              wrap: true,
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "16px",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: "💬 例句",
              size: "sm",
              weight: "bold",
              color: "#1A1A2E",
            },
            {
              type: "text",
              text: result.example || "",
              size: "sm",
              wrap: true,
              color: "#333333",
            },
            { type: "separator" },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "🔗 相似詞",
                  size: "sm",
                  weight: "bold",
                  color: "#0F6E56",
                },
                {
                  type: "text",
                  text: (result.synonyms || []).join("　"),
                  size: "sm",
                  color: "#333333",
                  wrap: true,
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "↔️ 相反詞",
                  size: "sm",
                  weight: "bold",
                  color: "#D85A30",
                },
                {
                  type: "text",
                  text: (result.antonyms || []).join("　"),
                  size: "sm",
                  color: "#333333",
                  wrap: true,
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "📌 常見搭配",
                  size: "sm",
                  weight: "bold",
                  color: "#534AB7",
                },
                {
                  type: "text",
                  text: (result.collocations || []).join("、"),
                  size: "sm",
                  color: "#333333",
                  wrap: true,
                },
              ],
            },
          ],
        },
      };
    } else {
      contents = {
        type: "bubble",
        size: "giga",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#1A1A2E",
          paddingAll: "16px",
          contents: [
            {
              type: "text",
              text: "🌐 道地英文翻譯",
              color: "#A8D8EA",
              size: "xs",
              weight: "bold",
            },
            {
              type: "text",
              text: result.chinese,
              color: "#CCCCFF",
              size: "sm",
              wrap: true,
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "16px",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: result.english,
              size: "lg",
              weight: "bold",
              color: "#1A1A2E",
              wrap: true,
            },
            { type: "separator" },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "💡 為什麼這樣翻？",
                  size: "sm",
                  weight: "bold",
                  color: "#534AB7",
                },
                {
                  type: "text",
                  text: result.explanation || "",
                  size: "sm",
                  color: "#555555",
                  wrap: true,
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "🔄 其他說法",
                  size: "sm",
                  weight: "bold",
                  color: "#0F6E56",
                },
                ...(result.alternatives || []).map((a) => ({
                  type: "text",
                  text: `• ${a}`,
                  size: "sm",
                  color: "#333333",
                  wrap: true,
                })),
              ],
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: "📝 直譯（供對比）",
                  size: "xs",
                  weight: "bold",
                  color: "#999999",
                },
                {
                  type: "text",
                  text: result.literal || "",
                  size: "xs",
                  color: "#AAAAAA",
                  wrap: true,
                },
              ],
            },
          ],
        },
      };
    }

    await client.replyMessage({
      replyToken,
      messages: [
        { type: "flex", altText: `翻譯：${result.english}`, contents },
      ],
    });
    console.log("[LINE] replyTranslation sent");
  } catch (err) {
    console.error("[LINE] replyTranslation error:", err);
    throw err;
  }
}

export async function replyMessage(replyToken, text) {
  try {
    console.log("[LINE] replyMessage:", text.substring(0, 50));
    await client.replyMessage({
      replyToken,
      messages: [{ type: "text", text }],
    });
  } catch (err) {
    console.error("[LINE] replyMessage error:", err);
    throw err;
  }
}
