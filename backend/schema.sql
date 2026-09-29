-- ============================================================
-- Nagrik — Master Database Schema (Updated)
-- Covers Day 1 (Stage 2) requirements, including the
-- multi-language columns and audit-trail table added later.
--
-- Run this in MySQL Workbench (or `mysql -u root -p < schema.sql`)
-- to set up the entire database from scratch in one shot.
--
-- NOTE: This uses DROP TABLE IF EXISTS for a clean rebuild.
-- If you already have real data in your current database and
-- just want to verify it matches this, do NOT run this file —
-- your earlier ALTER TABLE migration already brought you here.
-- Use this only for a fresh setup or a new machine.
-- ============================================================

CREATE DATABASE IF NOT EXISTS nagrik
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE nagrik;

-- ------------------------------------------------------------
-- Drop in dependency order (status_history depends on issues)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS status_history;
DROP TABLE IF EXISTS weekly_summaries;
DROP TABLE IF EXISTS issues;

-- ------------------------------------------------------------
-- Table: issues
-- Core table storing every reported civic issue + AI analysis
-- ------------------------------------------------------------
CREATE TABLE issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,                    -- always English-normalized
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',   -- e.g. 'en','hi','ta'
    description_original TEXT DEFAULT NULL,        -- exactly what the user wrote/saw
    severity TINYINT UNSIGNED NOT NULL,
    ai_confidence DECIMAL(4,3) DEFAULT NULL,
    is_likely_genuine BOOLEAN DEFAULT TRUE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    area_name VARCHAR(100) DEFAULT NULL,
    image_path VARCHAR(255) DEFAULT NULL,
    status ENUM('reported','acknowledged','resolved') NOT NULL DEFAULT 'reported',
    reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_severity CHECK (severity BETWEEN 1 AND 5),
    CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE INDEX idx_reported_at ON issues (reported_at);
CREATE INDEX idx_category ON issues (category);
CREATE INDEX idx_status ON issues (status);
CREATE INDEX idx_location ON issues (latitude, longitude);

-- ------------------------------------------------------------
-- Table: weekly_summaries
-- Stores the AI-generated weekly report text (Feature #6)
-- ------------------------------------------------------------
CREATE TABLE weekly_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    summary_text TEXT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_week_range UNIQUE (week_start, week_end)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: status_history
-- Audit trail — every status change on an issue gets logged here.
-- Added after the admin-security discussion, so changes are
-- always traceable (who/what/when, even if "who" is basic for now).
-- ------------------------------------------------------------
CREATE TABLE status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by VARCHAR(100),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------
SHOW TABLES;
DESCRIBE issues;
DESCRIBE weekly_summaries;
DESCRIBE status_history;

-- ------------------------------------------------------------
-- Optional: seed a few test rows
-- ------------------------------------------------------------
INSERT INTO issues (category, description, language_code, description_original, severity, latitude, longitude, area_name, status)
VALUES
('pothole', 'Large pothole on main road near bus stop', 'en', 'Large pothole on main road near bus stop', 4, 12.9716, 77.5946, 'Sector 15', 'reported'),
('garbage', 'Garbage not collected for 3 days near market', 'en', 'Garbage not collected for 3 days near market', 3, 12.9720, 77.5950, 'Sector 15', 'reported'),
('streetlight', 'Streetlight not working since a week', 'en', 'Streetlight not working since a week', 2, 12.9700, 77.5930, 'Sector 12', 'acknowledged');

-- Translation cache — ek baar translate hone ke baad dobara Gemini call na lage
CREATE TABLE issue_translations (
    issue_id INT NOT NULL,
    lang_code VARCHAR(5) NOT NULL,
    translated_text TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (issue_id, lang_code),
    FOREIGN KEY (issue_id) REFERENCES issues(id)
) ENGINE=InnoDB;