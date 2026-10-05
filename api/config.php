<?php
declare(strict_types=1);

/*
 * MONARCH CODEX — private database configuration.
 *
 * This file is intentionally kept free of real secrets in GitHub.
 * Enter the real database password on the Hostinger server only.
 *
 * Database host: localhost
 * Database name: u415805897_kingdomdb
 * Database user: u415805897_kingdomuser
 */

const DB_HOST = 'localhost';
const DB_NAME = 'u415805897_kingdomdb';
const DB_USER = 'u415805897_kingdomuser';
const DB_PASSWORD = 'PASTE_HOSTINGER_DATABASE_PASSWORD_HERE';

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if (DB_PASSWORD === 'PASTE_HOSTINGER_DATABASE_PASSWORD_HERE') {
        throw new RuntimeException('Database connection is not configured yet.');
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
