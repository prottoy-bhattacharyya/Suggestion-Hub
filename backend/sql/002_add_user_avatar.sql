USE suggestion_hub;

ALTER TABLE users
  ADD COLUMN avatar VARCHAR(255) NULL AFTER full_name;
