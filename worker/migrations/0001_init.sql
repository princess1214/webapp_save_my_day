CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  category TEXT,
  date TEXT,
  time TEXT,
  duration_minutes INTEGER,
  recurrence TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
