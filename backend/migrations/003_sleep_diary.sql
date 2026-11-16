CREATE TABLE sleep_diary(
 id INTEGER PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 hours REAL NOT NULL CHECK(hours>=0 AND hours<=16),
 quality INTEGER NOT NULL CHECK(quality>=1 AND quality<=5),
 note TEXT DEFAULT '',
 t INTEGER NOT NULL
);
CREATE INDEX sleep_diary_user_time ON sleep_diary(user_id,t);
