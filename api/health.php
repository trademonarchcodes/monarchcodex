<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require_once __DIR__ . '/config.php';
    db()->query('SELECT 1');

    echo json_encode([
        'success' => true,
        'service' => 'MONARCH CODEX API',
        'database' => 'connected',
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'service' => 'MONARCH CODEX API',
        'message' => 'Service unavailable.',
    ], JSON_UNESCAPED_SLASHES);
}
