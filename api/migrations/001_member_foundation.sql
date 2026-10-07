-- MONARCH CODEX additive member/KYC foundation
-- Run this once on the existing Hostinger MySQL database.
-- This migration does NOT alter or drop the existing users table.

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  nin_number VARCHAR(100) NOT NULL,
  nin_hash CHAR(64) NOT NULL,
  address TEXT NOT NULL,
  occupation VARCHAR(150) NOT NULL,
  nin_front_path VARCHAR(500) NOT NULL,
  nin_back_path VARCHAR(500) NOT NULL,
  selfie_path VARCHAR(500) NOT NULL,
  status ENUM('under_review','approved','rejected') NOT NULL DEFAULT 'under_review',
  rejection_reason TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kyc_user (user_id),
  KEY idx_kyc_status (status),
  KEY idx_kyc_nin_hash (nin_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deposit','withdrawal','investment_purchase','investment_profit','referral_earning','fee','refund','adjustment') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  reference VARCHAR(190) NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wallet_user_status (user_id,status),
  KEY idx_wallet_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  principal DECIMAL(18,2) NOT NULL,
  monthly_profit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  status ENUM('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  next_profit_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_investment_user_status (user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_access (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  feature ENUM('academy','signals') NOT NULL,
  status ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_member_feature (user_id,feature),
  KEY idx_member_access_status (feature,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_access (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  monarch_admin TINYINT(1) NOT NULL DEFAULT 0,
  sovereign_admin TINYINT(1) NOT NULL DEFAULT 0,
  is_main_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Initial role mapping requested for the existing admin accounts.
INSERT INTO admin_access (user_id, monarch_admin, sovereign_admin, is_main_admin)
SELECT id, 1, 1, 1 FROM users WHERE LOWER(email) = 'trademonarchofficial@gmail.com'
ON DUPLICATE KEY UPDATE monarch_admin=VALUES(monarch_admin), sovereign_admin=VALUES(sovereign_admin), is_main_admin=VALUES(is_main_admin);

INSERT INTO admin_access (user_id, monarch_admin, sovereign_admin, is_main_admin)
SELECT id, 0, 1, 0 FROM users WHERE LOWER(email) = 'handsomeprovidence38@gmail.com'
ON DUPLICATE KEY UPDATE sovereign_admin=VALUES(sovereign_admin);
