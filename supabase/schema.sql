-- English Learning Bot - Supabase Schema
-- 使用前請先在 Supabase SQL Editor 執行：
-- DROP TABLE IF EXISTS quiz_results, quiz_sessions, vocabulary, articles CASCADE;

CREATE TABLE articles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  source      TEXT,
  title       TEXT,
  url         TEXT,
  summary_zh  TEXT,
  level       TEXT,
  youtube_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vocabulary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       UUID REFERENCES articles(id),
  word             TEXT NOT NULL,
  pos              TEXT,
  definition_zh    TEXT,
  example_sentence TEXT,
  mnemonic         TEXT,
  srs_interval     INTEGER DEFAULT 1,
  next_review_date DATE DEFAULT (CURRENT_DATE + 1),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocabulary_next_review ON vocabulary(next_review_date);
CREATE INDEX idx_vocabulary_created_at  ON vocabulary(created_at);

CREATE TABLE quiz_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT DEFAULT 'pending',
  questions_json JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_sessions_status ON quiz_sessions(status);

CREATE TABLE quiz_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id  UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  vocab_id         UUID REFERENCES vocabulary(id),
  quiz_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  quiz_type        TEXT,
  user_answer      TEXT,
  is_correct       BOOLEAN,
  feedback         TEXT,
  corrected        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_session    ON quiz_results(quiz_session_id);
CREATE INDEX idx_quiz_results_created_at ON quiz_results(created_at);
