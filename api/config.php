<?php
declare(strict_types=1);

/*
 * MONARCH CODEX database bootstrap.
 *
 * The real password MUST live in api/config.local.php on Hostinger.
 * That local file is ignored by Git and must never be committed.
 */

$localConfig = __DIR__ . '/config.local.php';

if (is_file($localConfig)) {
    require $localConfig;
} else {
    const DB_HOST = 'localhost';
    const DB_NAME = 'u415805897_kingdomdb';
    const DB_USER = 'u415805897_kingdomuser';
    const DB_PASSWORD = 'PASTE_HOSTINGER_DATABASE_PASSWORD_HERE';
}

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
