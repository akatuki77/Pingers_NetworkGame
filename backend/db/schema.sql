-- network_game データベースとユーザーの作成（初回のみ）
-- MySQL root ユーザーで実行してください:
--   mysql -u root < backend/db/schema.sql

CREATE DATABASE IF NOT EXISTS network_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'gameusr'@'localhost' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON network_game.* TO 'gameusr'@'localhost';
FLUSH PRIVILEGES;

USE network_game;

CREATE TABLE IF NOT EXISTS users (
  id       INT          NOT NULL AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UNIQUE (user_id, stage_id) は PR-7.3 で追加予定
CREATE TABLE IF NOT EXISTS clear_records (
  id         INT NOT NULL AUTO_INCREMENT,
  user_id    INT NOT NULL,
  stage_id   INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
