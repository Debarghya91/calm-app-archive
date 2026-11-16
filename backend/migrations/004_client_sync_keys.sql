ALTER TABLE moods ADD COLUMN source_key TEXT;
ALTER TABLE journal ADD COLUMN source_key TEXT;
ALTER TABLE sleep_diary ADD COLUMN source_key TEXT;
CREATE UNIQUE INDEX moods_user_source_key ON moods(user_id,source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX journal_user_source_key ON journal(user_id,source_key) WHERE source_key IS NOT NULL;
CREATE UNIQUE INDEX sleep_user_source_key ON sleep_diary(user_id,source_key) WHERE source_key IS NOT NULL;
