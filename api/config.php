<?php
declare(strict_types=1);

/*
 * MONARCH CODEX database bootstrap.
 *
 * The real database credentials belong only in api/config.local.php on
 * Hostinger. That file is ignored by Git and must never be committed.
 */

// Apply secure session defaults before any API endpoint starts the session.
if (session_status() !== PHP_SESSION_ACTIVE) {
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$localConfig = __DIR__ . '/config.local.php';

if (!is_file($localConfig)) {
    throw new RuntimeException('Database configuration file is missing.');
}

require_once $localConfig;

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as $constant) {
        if (!defined($constant)) {
            throw new RuntimeException('Database configuration is incomplete.');
        }
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
