PRAGMA foreign_keys = ON;
CREATE TABLE countries (code TEXT PRIMARY KEY, name_pt TEXT NOT NULL, name_original TEXT);
CREATE TABLE languages (code TEXT PRIMARY KEY, name_pt TEXT NOT NULL, name_original TEXT);
CREATE TABLE targets (code TEXT PRIMARY KEY, name_pt TEXT NOT NULL);
CREATE TABLE transmitters (code TEXT PRIMARY KEY, name TEXT NOT NULL, country_code TEXT, latitude REAL, longitude REAL, FOREIGN KEY(country_code) REFERENCES countries(code));
CREATE TABLE broadcasts (
  id TEXT PRIMARY KEY, season TEXT NOT NULL, frequency_khz REAL NOT NULL CHECK(frequency_khz BETWEEN 10 AND 30000),
  start_utc_minutes INTEGER NOT NULL, end_utc_minutes INTEGER NOT NULL, days_json TEXT NOT NULL,
  day_expression_original TEXT NOT NULL DEFAULT '', station_name TEXT NOT NULL, country_code TEXT NOT NULL,
  language_code TEXT NOT NULL, target_code TEXT NOT NULL, transmitter_code TEXT NOT NULL DEFAULT '',
  transmitter_name TEXT, latitude REAL, longitude REAL, notes TEXT, source TEXT NOT NULL, source_row_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE broadcasts_staging (
  version TEXT NOT NULL, id TEXT NOT NULL, season TEXT NOT NULL, frequency_khz REAL NOT NULL, start_utc_minutes INTEGER NOT NULL,
  end_utc_minutes INTEGER NOT NULL, days_json TEXT NOT NULL, day_expression_original TEXT NOT NULL, station_name TEXT NOT NULL,
  country_code TEXT NOT NULL, language_code TEXT NOT NULL, target_code TEXT NOT NULL, transmitter_code TEXT NOT NULL,
  notes TEXT, source TEXT NOT NULL, source_row_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE schedule_imports (id TEXT PRIMARY KEY, season TEXT NOT NULL, source TEXT NOT NULL, source_hash TEXT NOT NULL, record_count INTEGER NOT NULL, invalid_count INTEGER NOT NULL DEFAULT 0, imported_at TEXT NOT NULL, status TEXT NOT NULL, error_message TEXT);
CREATE TABLE space_weather_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, observed_at TEXT NOT NULL, collected_at TEXT NOT NULL, payload_json TEXT NOT NULL, valid INTEGER NOT NULL DEFAULT 1);
CREATE TABLE source_status (source TEXT PRIMARY KEY, status TEXT NOT NULL, checked_at TEXT NOT NULL, last_success_at TEXT, message TEXT);
CREATE INDEX idx_broadcasts_frequency ON broadcasts(frequency_khz);
CREATE INDEX idx_broadcasts_time_start ON broadcasts(start_utc_minutes);
CREATE INDEX idx_broadcasts_time_end ON broadcasts(end_utc_minutes);
CREATE INDEX idx_broadcasts_season ON broadcasts(season);
CREATE INDEX idx_broadcasts_language ON broadcasts(language_code);
CREATE INDEX idx_broadcasts_country ON broadcasts(country_code);
CREATE INDEX idx_broadcasts_transmitter ON broadcasts(transmitter_code);
CREATE INDEX idx_weather_source_time ON space_weather_snapshots(source, collected_at DESC);
