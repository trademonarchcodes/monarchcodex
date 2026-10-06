<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

register_shutdown_function(function (): void {
    $error = error_get_last();

    if ($error === null) {
        return;
    }

    if (in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }

        echo json_encode([
            'success' => false,
            'stage' => 'php',
            'error' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
        ], JSON_UNESCAPED_SLASHES);
    }
});

try {
    require_once __DIR__ . '/config.php';

    $pdo = db();
    $pdo->query('SELECT 1');

    $columns = [];
    $stmt = $pdo->query('DESCRIBE users');

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $columns[] = $row['Field'];
    }

    echo json_encode([
        'success' => true,
        'php' => PHP_VERSION,
        'database' => 'connected',
        'users_table' => 'found',
        'users_columns' => $columns,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'stage' => 'database_or_config',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_SLASHES);
}
