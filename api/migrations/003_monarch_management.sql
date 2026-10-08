-- MONARCH CODEX Monarch management, referrals, presence and monarch_notifications
-- Additive migration. Run after the existing foundation migrations.
-- No existing table is dropped or recreated.

CREATE TABLE IF NOT EXISTS monarch_referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_user_id BIGINT UNSIGNED NOT NULL,
  referred_user_id BIGINT UNSIGNED NOT NULL,
  referral_code VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referred_user (referred_user_id),
  KEY idx_referrer (referrer_user_id),
  KEY idx_referral_code (referral_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monarch_presence (
  user_id BIGINT UNSIGNED NOT NULL,
  last_seen_at DATETIME NOT NULL,
  PRIMARY KEY (user_id),
  KEY idx_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monarch_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  audience ENUM('monarch','admin') NOT NULL,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notification_recipient (user_id,audience,is_read,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  target_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  amount DECIMAL(18,2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin (admin_user_id,created_at),
  KEY idx_audit_target (target_user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
