-- =====================================================================
-- 李志 · 叁叁肆 音乐站 —— 数据库结构
-- 目标库：lizhi_music   字符集：utf8mb4   引擎：InnoDB
-- 兼容 MySQL 5.7+ / 8.0+
-- 幂等：所有表均为 CREATE TABLE IF NOT EXISTS
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 站点全局设置（key-value，后台可编辑）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `k` VARCHAR(64) NOT NULL,
  `v` TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 内容模块：专辑
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `albums` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `year` INT NOT NULL DEFAULT 0,
  `date` VARCHAR(32) NOT NULL DEFAULT '',
  `type` VARCHAR(32) NOT NULL DEFAULT 'studio',
  `description` TEXT NULL,
  `cover` VARCHAR(512) NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 内容模块：曲目
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `songs` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `album_id` VARCHAR(32) NULL DEFAULT NULL,
  `track_no` INT NOT NULL DEFAULT 0,
  `duration` INT NOT NULL DEFAULT 0,
  `audio_url` VARCHAR(512) NULL DEFAULT '',
  `lyrics` MEDIUMTEXT NULL,
  `bpm` INT NOT NULL DEFAULT 0,
  `song_key` VARCHAR(16) NOT NULL DEFAULT '',
  `capo` INT NOT NULL DEFAULT 0,
  `difficulty` TINYINT NOT NULL DEFAULT 0,
  `tags` JSON NULL,
  `play_count` INT NOT NULL DEFAULT 0,
  `year` INT NOT NULL DEFAULT 0,
  `city` VARCHAR(64) NULL DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_album` (`album_id`),
  KEY `idx_year` (`year`),
  KEY `idx_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 内容模块：视频 / MV
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `videos` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `video_url` VARCHAR(512) NULL DEFAULT '',
  `poster` VARCHAR(512) NULL DEFAULT '',
  `duration` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(32) NOT NULL DEFAULT 'live',
  `year` INT NOT NULL DEFAULT 0,
  `city` VARCHAR(64) NULL DEFAULT NULL,
  `related_song_id` VARCHAR(32) NULL DEFAULT NULL,
  `description` TEXT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 内容模块：短视频
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorts` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `author` VARCHAR(64) NOT NULL DEFAULT '',
  `desc` VARCHAR(512) NULL DEFAULT '',
  `tags` JSON NULL,
  `city` VARCHAR(64) NULL DEFAULT NULL,
  `duration` INT NOT NULL DEFAULT 0,
  `likes` INT NOT NULL DEFAULT 0,
  `comments` INT NOT NULL DEFAULT 0,
  `saves` INT NOT NULL DEFAULT 0,
  `downloads` INT NOT NULL DEFAULT 0,
  `views` INT NOT NULL DEFAULT 0,
  `song` VARCHAR(128) NULL DEFAULT NULL,
  `video_url` VARCHAR(512) NULL DEFAULT '',
  `poster` VARCHAR(512) NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 工具模块：和弦指型库
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chord_library` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL,
  `display` VARCHAR(32) NOT NULL DEFAULT '',
  `frets` JSON NULL,
  `fingers` JSON NULL,
  `root_string` INT NOT NULL DEFAULT 0,
  `quality` VARCHAR(32) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 工具模块：六线谱 / 和弦谱（每首歌一份，正文存 JSON 保留全部字段）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chord_sheets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `song_id` VARCHAR(32) NOT NULL,
  `data` JSON NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_song` (`song_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 工具模块：常用和弦走向
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `progressions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `roman` VARCHAR(64) NOT NULL DEFAULT '',
  `degrees` JSON NULL,
  `example` VARCHAR(128) NOT NULL DEFAULT '',
  `hint` VARCHAR(256) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 工具模块：难度刻度
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `difficulty_scale` (
  `level` TINYINT NOT NULL,
  `label` VARCHAR(32) NOT NULL,
  `desc` VARCHAR(256) NOT NULL DEFAULT '',
  PRIMARY KEY (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 百科：人物资料（单行，整对象存 JSON）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bio_profile` (
  `id` TINYINT NOT NULL DEFAULT 1,
  `data` JSON NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bio_facts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(64) NOT NULL,
  `value` VARCHAR(256) NOT NULL,
  `note` VARCHAR(256) NULL DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bio_chapters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(128) NOT NULL,
  `paras` JSON NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bio_band_members` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `instrument` VARCHAR(64) NOT NULL,
  `since` VARCHAR(16) NOT NULL DEFAULT '',
  `note` VARCHAR(256) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bio_faqs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `q` VARCHAR(256) NOT NULL,
  `a` TEXT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bio_awards` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `year` VARCHAR(16) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `note` VARCHAR(256) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 巡演：城市清单 + 时间线 + 全局配置
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tour_cities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `city` VARCHAR(64) NOT NULL,
  `province` VARCHAR(64) NOT NULL,
  `year` INT NOT NULL DEFAULT 0,
  `venue` VARCHAR(128) NOT NULL DEFAULT '',
  `done` TINYINT(1) NOT NULL DEFAULT 0,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_province` (`province`),
  KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tour_timeline` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` VARCHAR(32) NOT NULL,
  `year` INT NOT NULL DEFAULT 0,
  `title` VARCHAR(128) NOT NULL,
  `text` TEXT NULL,
  `kind` VARCHAR(32) NOT NULL DEFAULT 'other',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tour_config` (
  `id` TINYINT NOT NULL DEFAULT 1,
  `target` INT NOT NULL DEFAULT 334,
  `name` VARCHAR(128) NOT NULL DEFAULT '',
  `slogan` VARCHAR(256) NOT NULL DEFAULT '',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 赞助：档位 / 收款渠道 / 留言墙 / 统计 / 资金去向
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sponsor_tiers` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `icon` VARCHAR(32) NOT NULL DEFAULT '',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `benefits` JSON NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `accent` VARCHAR(16) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsor_channels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `hint` VARCHAR(128) NOT NULL DEFAULT '',
  `qr_image` VARCHAR(512) NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsor_wall` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nick` VARCHAR(64) NOT NULL,
  `tier` VARCHAR(64) NOT NULL DEFAULT '',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `date` VARCHAR(16) NOT NULL DEFAULT '',
  `words` VARCHAR(256) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsor_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(64) NOT NULL,
  `value` VARCHAR(64) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsor_use_cases` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(64) NOT NULL,
  `text` VARCHAR(512) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 首页：语录 + 横幅
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `text` VARCHAR(512) NOT NULL,
  `source` VARCHAR(128) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `kicker` VARCHAR(64) NOT NULL DEFAULT '',
  `title` VARCHAR(128) NOT NULL,
  `desc` VARCHAR(512) NOT NULL DEFAULT '',
  `song_id` VARCHAR(32) NULL DEFAULT NULL,
  `link_to` VARCHAR(128) NULL DEFAULT NULL,
  `image` VARCHAR(512) NULL DEFAULT '',
  `hue` INT NOT NULL DEFAULT 0,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 成就（阈值可配置：metric + threshold）+ 彩蛋配置
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` VARCHAR(32) NOT NULL,
  `icon` VARCHAR(32) NOT NULL DEFAULT '',
  `name` VARCHAR(64) NOT NULL,
  `hint` VARCHAR(128) NOT NULL DEFAULT '',
  `metric` VARCHAR(32) NOT NULL DEFAULT 'playCount',
  `threshold` INT NOT NULL DEFAULT 1,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `easter_eggs` (
  `id` TINYINT NOT NULL DEFAULT 1,
  `data` JSON NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 导航（侧边栏主项 + 我的库项）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `nav_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `to` VARCHAR(128) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `icon` VARCHAR(32) NOT NULL,
  `desc` VARCHAR(128) NULL DEFAULT NULL,
  `group` VARCHAR(16) NOT NULL DEFAULT 'main',
  `sort` INT NOT NULL DEFAULT 0,
  `visible` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 用户与互动
-- =====================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `email` VARCHAR(128) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(512) NULL DEFAULT '',
  `bio` VARCHAR(256) NULL DEFAULT '',
  `role` VARCHAR(16) NOT NULL DEFAULT 'user',
  `status` TINYINT NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论：target_type = song / video / short
CREATE TABLE IF NOT EXISTS `comments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `target_type` VARCHAR(16) NOT NULL,
  `target_id` VARCHAR(32) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `user_name` VARCHAR(64) NOT NULL,
  `text` VARCHAR(500) NOT NULL,
  `parent_id` BIGINT NULL DEFAULT NULL,
  `reply_to_name` VARCHAR(64) NULL DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `ip` VARCHAR(64) NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_target` (`target_type`, `target_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comment_likes` (
  `comment_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id` BIGINT NOT NULL,
  `song_id` VARCHAR(32) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `playlists` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `desc` VARCHAR(256) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `playlist_songs` (
  `playlist_id` BIGINT NOT NULL,
  `song_id` VARCHAR(32) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`playlist_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `play_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `song_id` VARCHAR(32) NOT NULL,
  `played_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `played_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `play_positions` (
  `user_id` BIGINT NOT NULL,
  `song_id` VARCHAR(32) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_play_counts` (
  `user_id` BIGINT NOT NULL,
  `song_id` VARCHAR(32) NOT NULL,
  `count` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_daily_stats` (
  `user_id` BIGINT NOT NULL,
  `stat_date` DATE NOT NULL,
  `seconds` INT NOT NULL DEFAULT 0,
  `night_count` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profile_stats` (
  `user_id` BIGINT NOT NULL,
  `total_seconds` BIGINT NOT NULL DEFAULT 0,
  `completed_songs` INT NOT NULL DEFAULT 0,
  `capo_calcs` INT NOT NULL DEFAULT 0,
  `active_days` JSON NULL,
  `unlocked_achievements` JSON NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 投稿审核
CREATE TABLE IF NOT EXISTS `uploads` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NULL DEFAULT NULL,
  `type` VARCHAR(16) NOT NULL DEFAULT 'other',
  `title` VARCHAR(128) NOT NULL,
  `song_ref` VARCHAR(128) NULL DEFAULT NULL,
  `file_name` VARCHAR(256) NULL DEFAULT NULL,
  `file_url` VARCHAR(512) NULL DEFAULT NULL,
  `link` VARCHAR(512) NULL DEFAULT NULL,
  `note` VARCHAR(512) NULL DEFAULT NULL,
  `contact` VARCHAR(128) NULL DEFAULT NULL,
  `author` VARCHAR(64) NULL DEFAULT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `reviewer_note` VARCHAR(256) NULL DEFAULT NULL,
  `reviewer_id` BIGINT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 短视频互动
CREATE TABLE IF NOT EXISTS `short_likes` (
  `user_id` BIGINT NOT NULL,
  `short_id` VARCHAR(32) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `short_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `short_saves` (
  `user_id` BIGINT NOT NULL,
  `short_id` VARCHAR(32) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `short_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `short_downloads` (
  `user_id` BIGINT NOT NULL,
  `short_id` VARCHAR(32) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `short_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 播放上报事件（用于全局播放量聚合与统计）
CREATE TABLE IF NOT EXISTS `play_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `song_id` VARCHAR(32) NOT NULL,
  `user_id` BIGINT NULL DEFAULT NULL,
  `seconds` INT NOT NULL DEFAULT 0,
  `finished` TINYINT(1) NOT NULL DEFAULT 0,
  `ip` VARCHAR(64) NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_song` (`song_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单（在线支付 / 赞助）
CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT NULL DEFAULT NULL,
  `subject` VARCHAR(128) NOT NULL DEFAULT '',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `provider` VARCHAR(16) NOT NULL DEFAULT '',
  `channel` VARCHAR(16) NOT NULL DEFAULT 'alipay',
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `trade_no` VARCHAR(64) NULL DEFAULT NULL,
  `contact` VARCHAR(64) NULL DEFAULT NULL,
  `raw` JSON NULL,
  `remark` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_status` (`status`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 后台登录尝试（限流与审计）
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(64) NOT NULL DEFAULT '',
  `email` VARCHAR(128) NOT NULL DEFAULT '',
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_created` (`ip`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 后台操作日志
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT NOT NULL,
  `admin_name` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target` VARCHAR(128) NOT NULL DEFAULT '',
  `detail` JSON NULL,
  `ip` VARCHAR(64) NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
