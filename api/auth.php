<?php
declare(strict_types=1);

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';

function respond(bool $success, string $message, array $extra = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        array_merge(['success' => $success, 'message' => $message], $extra),
        JSON_UNESCAPED_SLASHES
    );
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        respond(false, 'Invalid request.', [], 400);
    }

    return $data;
}

function clean_name(string $value): string
{
    return trim(preg_replace('/\s+/', ' ', $value) ?? '');
}

function clean_email(string $value): string
{
    return strtolower(trim($value));
}

function clean_phone(string $value): string
{
    return trim(preg_replace('/\s+/', ' ', $value) ?? '');
}

function same_origin_request(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin === '') {
        return true;
    }

    $host = $_SERVER['HTTP_HOST'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST);

    return $originHost !== false
        && $originHost !== null
        && hash_equals($host, $originHost);
}

if (!same_origin_request()) {
    respond(false, 'Request origin not allowed.', [], 403);
}

$action = $_GET['action'] ?? '';

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(false, 'Method not allowed.', [], 405);
    }

    $data = request_json();

    if ($action === 'register') {
        $name = clean_name((string)($data['name'] ?? ''));
        $phone = clean_phone((string)($data['phone'] ?? ''));
        $email = clean_email((string)($data['email'] ?? ''));
        $password = (string)($data['password'] ?? '');

        if ($name === '' || mb_strlen($name) < 2 || mb_strlen($name) > 120) {
            respond(false, 'Please enter your full name.', [], 422);
        }

        if ($phone === '' || mb_strlen($phone) < 7 || mb_strlen($phone) > 30) {
            respond(false, 'Please enter a valid phone number.', [], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, 'Please enter a valid email address.', [], 422);
        }

        if (strlen($password) < 8 || strlen($password) > 72) {
            respond(false, 'Your password must be between 8 and 72 characters.', [], 422);
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $check->execute(['email' => $email]);

        if ($check->fetch()) {
            respond(false, 'An account with that email already exists.', [], 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $insert = $pdo->prepare(
            'INSERT INTO users
                (full_name, phone, email, password_hash, role, account_status, terms_accepted_at)
             VALUES
                (:full_name, :phone, :email, :password_hash, :role, :account_status, NOW())'
        );

        $insert->execute([
            'full_name' => $name,
            'phone' => $phone,
            'email' => $email,
            'password_hash' => $hash,
            'role' => 'member',
            'account_status' => 'active',
        ]);

        $userId = (int)$pdo->lastInsertId();

        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = 'member';

        respond(true, 'Account created successfully.', [
            'user' => [
                'id' => $userId,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'role' => 'member',
            ],
        ], 201);
    }

    if ($action === 'login') {
        $email = clean_email((string)($data['email'] ?? ''));
        $password = (string)($data['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            respond(false, 'Enter your email and password.', [], 422);
        }

        $stmt = $pdo->prepare(
            'SELECT id, full_name, email, password_hash, role, account_status
             FROM users
             WHERE email = :email
             LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            respond(false, 'Invalid email or password.', [], 401);
        }

        if ($user['account_status'] !== 'active') {
            respond(false, 'Your account is not currently active.', [], 403);
        }

        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $update = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
            $update->execute(['hash' => $newHash, 'id' => $user['id']]);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['role'] = $user['role'];

        $touch = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $touch->execute(['id' => $user['id']]);

        respond(true, 'Login successful.', [
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    }

    if ($action === 'logout') {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();

            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
        respond(true, 'Logged out successfully.');
    }

    if ($action === 'me') {
        if (empty($_SESSION['user_id'])) {
            respond(false, 'Not authenticated.', [], 401);
        }

        $stmt = $pdo->prepare(
            'SELECT id, full_name, email, role, account_status, created_at
             FROM users
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user || $user['account_status'] !== 'active') {
            $_SESSION = [];
            session_destroy();
            respond(false, 'Session is no longer valid.', [], 401);
        }

        respond(true, 'Authenticated.', [
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'created_at' => $user['created_at'],
            ],
        ]);
    }

    respond(false, 'Unknown authentication action.', [], 404);
} catch (Throwable $e) {
    error_log('MONARCH CODEX auth error: ' . $e->getMessage());

    // Temporary diagnostic response. This will be replaced with a generic
    // production-safe message after the database issue is identified.
    respond(
        false,
        'Authentication service error: ' . $e->getMessage(),
        [],
        500
    );
}
