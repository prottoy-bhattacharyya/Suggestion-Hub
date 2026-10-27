-- =====================================================================
-- Notes and Suggestions Sharing Platform: MySQL schema
-- Target: MySQL 8.0+ (InnoDB, utf8mb4)
-- Usage:  mysql -u root -p < schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS notes_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE notes_platform;

-- Drop in reverse dependency order (safe re-run during development)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS teacher_courses;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------
CREATE TABLE departments (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(150) NOT NULL,
  code  VARCHAR(20)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code),
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- users (students, teachers, admins)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(254) NOT NULL,
  password       VARCHAR(255) NOT NULL,              -- hashed (Django)
  full_name      VARCHAR(150) NOT NULL,
  role           ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  student_id     VARCHAR(30)  NULL,                  -- students only
  department_id  INT UNSIGNED NULL,
  intake         VARCHAR(10)  NULL,                  -- students only
  section        VARCHAR(10)  NULL,                  -- students only
  is_verified    TINYINT(1)   NOT NULL DEFAULT 0,    -- email verified
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_student_id (student_id),       -- multiple NULLs allowed
  KEY idx_users_role (role),
  KEY idx_users_dept_intake (department_id, intake, section),
  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
CREATE TABLE courses (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code           VARCHAR(20)  NOT NULL,              -- e.g. CSE220
  title          VARCHAR(200) NOT NULL,
  department_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_code (code),
  KEY idx_courses_department (department_id),
  CONSTRAINT fk_courses_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- teacher_courses (which teacher reviews which course)
-- ---------------------------------------------------------------------
CREATE TABLE teacher_courses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id  INT UNSIGNED NOT NULL,
  course_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teacher_course (teacher_id, course_id),
  KEY idx_tc_course (course_id),
  CONSTRAINT fk_tc_teacher
    FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tc_course
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- notes (uploaded PDFs: notes and suggestions)
-- ---------------------------------------------------------------------
CREATE TABLE notes (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uploader_id       INT UNSIGNED NOT NULL,
  course_id         INT UNSIGNED NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NULL,               -- optional
  type              ENUM('note','suggestion') NOT NULL DEFAULT 'note',
  intake            VARCHAR(10)  NOT NULL,
  section           VARCHAR(10)  NULL,
  file              VARCHAR(255) NOT NULL,           -- path from Django storage
  file_hash         CHAR(64)     NOT NULL,           -- SHA-256, blocks duplicates
  page_count        INT UNSIGNED NULL,
  ocr_used          TINYINT(1)   NOT NULL DEFAULT 0, -- set during preprocessing
  review_status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  processing_status ENUM('processing','ready','failed')   NOT NULL DEFAULT 'processing',
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0.00,  -- cached from ratings
  rating_count      INT UNSIGNED NOT NULL DEFAULT 0,     -- cached from ratings
  approved_at       DATETIME     NULL,               -- used for feed ordering
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notes_file_hash (file_hash),
  KEY idx_notes_course_intake_section (course_id, intake, section),
  KEY idx_notes_status_approved (review_status, approved_at),
  KEY idx_notes_uploader (uploader_id, review_status),
  FULLTEXT KEY ft_notes_title_desc (title, description),
  CONSTRAINT fk_notes_uploader
    FOREIGN KEY (uploader_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notes_course
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- reviews (teacher decisions, also the audit log)
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id     INT UNSIGNED NOT NULL,
  teacher_id  INT UNSIGNED NOT NULL,
  decision    ENUM('approved','rejected') NOT NULL,
  comment     TEXT         NULL,                     -- reason shown to the student
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_note (note_id),
  KEY idx_reviews_teacher (teacher_id, created_at),
  CONSTRAINT fk_reviews_note
    FOREIGN KEY (note_id) REFERENCES notes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_teacher
    FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ratings (1 to 5 stars, one per user per note)
-- ---------------------------------------------------------------------
CREATE TABLE ratings (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id     INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  stars       TINYINT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ratings_note_user (note_id, user_id),
  KEY idx_ratings_user (user_id),
  CONSTRAINT chk_ratings_stars CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT fk_ratings_note
    FOREIGN KEY (note_id) REFERENCES notes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- follows (user follows user)
-- ---------------------------------------------------------------------
CREATE TABLE follows (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  follower_id   INT UNSIGNED NOT NULL,
  following_id  INT UNSIGNED NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_follows_pair (follower_id, following_id),
  KEY idx_follows_following (following_id),
  CONSTRAINT fk_follows_follower
    FOREIGN KEY (follower_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_follows_following
    FOREIGN KEY (following_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,                 -- recipient
  type        ENUM('new_pending_note','note_approved','note_rejected',
                   'followed_user_upload') NOT NULL,
  note_id     INT UNSIGNED NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_note
    FOREIGN KEY (note_id) REFERENCES notes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- reports (flagged notes)
-- ---------------------------------------------------------------------
CREATE TABLE reports (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_id      INT UNSIGNED NOT NULL,
  reporter_id  INT UNSIGNED NOT NULL,
  reason       TEXT         NOT NULL,
  status       ENUM('open','resolved') NOT NULL DEFAULT 'open',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_note (note_id),
  CONSTRAINT fk_reports_note
    FOREIGN KEY (note_id) REFERENCES notes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Triggers: rules that a CHECK constraint cannot express here
-- (MySQL does not allow CHECK on columns used in FK referential actions)
-- ---------------------------------------------------------------------
DELIMITER $$

-- A user cannot follow themselves
CREATE TRIGGER trg_follows_no_self
BEFORE INSERT ON follows
FOR EACH ROW
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A user cannot follow themselves';
  END IF;
END$$

-- A user cannot rate their own note
CREATE TRIGGER trg_ratings_no_self
BEFORE INSERT ON ratings
FOR EACH ROW
BEGIN
  IF NEW.user_id = (SELECT uploader_id FROM notes WHERE id = NEW.note_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A user cannot rate their own note';
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Optional sample data (uncomment to test)
-- ---------------------------------------------------------------------
-- INSERT INTO departments (name, code) VALUES ('Computer Science and Engineering', 'CSE');
-- INSERT INTO courses (code, title, department_id) VALUES ('CSE220', 'Data Structures', 1);