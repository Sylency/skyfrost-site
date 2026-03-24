-- ============================================================
--  HyMultiLanguage — Setup database licenze
--  Eseguire una sola volta come utente root/admin di MariaDB:
--    mysql -u root -p < setup_license_db.sql
-- ============================================================

-- 1. Crea il database
CREATE DATABASE IF NOT EXISTS hytale_licenses
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Crea la tabella
USE hytale_licenses;

CREATE TABLE IF NOT EXISTS license_requests (
    fingerprint  VARCHAR(64)  NOT NULL PRIMARY KEY COMMENT 'SHA-256(MAC+hostname) della macchina',
    hostname     VARCHAR(255) NOT NULL DEFAULT ''  COMMENT 'Hostname del server al momento della registrazione',
    status       VARCHAR(16)  NOT NULL DEFAULT 'pending'
                 COMMENT 'pending | approved | revoked'
                 CHECK (status IN ('pending', 'approved', 'revoked')),
    requested_at DATETIME     NOT NULL DEFAULT NOW() COMMENT 'Data prima richiesta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Crea un utente dedicato (cambia la password prima di eseguire)
CREATE USER IF NOT EXISTS 'hylicense'@'%' IDENTIFIED BY 'CambiaQuestaPassword!';

-- 4. Permessi minimi: SELECT, INSERT e UPDATE sulla tabella licenze
GRANT SELECT, INSERT, UPDATE ON hytale_licenses.license_requests TO 'hylicense'@'%';

FLUSH PRIVILEGES;
