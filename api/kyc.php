<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

function kyc_json(bool $success, string $message = '', array $data = [], int $status = 200): never {
    http_response_code($status);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

function kyc_require_user(): int {
    $id = (int)($_SESSION['user_id'] ?? 0);
    if ($id < 1) {
        kyc_json(false, 'Please log in again.', [], 401);
    }
    return $id;
}

function kyc_require_member(): int {
    $id = kyc_require_user();
    $role = (string)($_SESSION['role'] ?? 'member');
    if ($role !== 'member') {
        kyc_json(false, 'KYC submission is available to members only.', [], 403);
    }
    return $id;
}

function kyc_upload(array $file, string $prefix): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('A required document could not be uploaded.');
    }
    if (($file['size'] ?? 0) > 8 * 1024 * 1024) {
        throw new RuntimeException('Each KYC image must be 8MB or smaller.');
    }

    $tmp = $file['tmp_name'] ?? '';
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];
    if (!isset($allowed[$mime])) {
        throw new RuntimeException('KYC documents must be JPG, PNG or WEBP images.');
    }

    $base = dirname(__DIR__) . '/private_uploads/kyc';
    if (!is_dir($base) && !mkdir($base, 0750, true) && !is_dir($base)) {
        throw new RuntimeException('KYC storage is not available.');
    }

    $name = $prefix . '_' . bin2hex(random_bytes(18)) . '.' . $allowed[$mime];
    $destination = $base . '/' . $name;
    if (!move_uploaded_file($tmp, $destination)) {
        throw new RuntimeException('The KYC document could not be saved.');
    }
    return 'private_uploads/kyc/' . $name;
}

function kyc_cleanup(array $paths): void {
    foreach ($paths as $path) {
        if (!$path) continue;
        $absolute = dirname(__DIR__) . '/' . ltrim((string)$path, '/');
        if (is_file($absolute)) @unlink($absolute);
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        kyc_json(false, 'POST requests only.', [], 405);
    }

    $userId = kyc_require_member();
    $action = $_GET['action'] ?? 'status';
    $pdo = db();

    if ($action === 'status') {
        $stmt = $pdo->prepare('SELECT status, rejection_reason, first_name, surname, middle_name, email, phone, address, occupation, created_at, updated_at FROM kyc_submissions WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $kyc = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        kyc_json(true, '', ['kyc' => $kyc]);
    }

    if ($action === 'submit') {
        $first = trim((string)($_POST['first_name'] ?? ''));
        $surname = trim((string)($_POST['surname'] ?? ''));
        $middle = trim((string)($_POST['middle_name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $phone = trim((string)($_POST['phone'] ?? ''));
        $nin = preg_replace('/\s+/', '', (string)($_POST['nin_number'] ?? ''));
        $address = trim((string)($_POST['address'] ?? ''));
        $occupation = trim((string)($_POST['occupation'] ?? ''));

        if ($first === '' || $surname === '' || $email === '' || $phone === '' || $nin === '' || $address === '' || $occupation === '') {
            kyc_json(false, 'Please complete all required KYC fields.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            kyc_json(false, 'Please enter a valid email address.');
        }
        if (!preg_match('/^[0-9]{8,20}$/', $nin)) {
            kyc_json(false, 'Please enter a valid NIN number.');
        }

        $existing = $pdo->prepare('SELECT status, nin_hash, nin_front_path, nin_back_path, selfie_path FROM kyc_submissions WHERE user_id = ? LIMIT 1');
        $existing->execute([$userId]);
        $old = $existing->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($old && $old['status'] === 'approved') {
            kyc_json(false, 'Your KYC is already approved.');
        }

        $hash = hash('sha256', $nin);
        $dup = $pdo->prepare('SELECT user_id FROM kyc_submissions WHERE nin_hash = ? AND user_id <> ? LIMIT 1');
        $dup->execute([$hash, $userId]);
        if ($dup->fetchColumn()) {
            kyc_json(false, 'This NIN is already associated with another account.');
        }

        $front = $back = $selfie = null;
        try {
            $front = kyc_upload($_FILES['nin_front'] ?? [], 'front_' . $userId);
            $back = kyc_upload($_FILES['nin_back'] ?? [], 'back_' . $userId);
            $selfie = kyc_upload($_FILES['selfie'] ?? [], 'selfie_' . $userId);
        } catch (Throwable $uploadError) {
            kyc_cleanup([$front, $back, $selfie]);
            throw $uploadError;
        }

        $pdo->beginTransaction();
        if ($old) {
            $stmt = $pdo->prepare("UPDATE kyc_submissions SET first_name=?, surname=?, middle_name=?, email=?, phone=?, nin_number=?, nin_hash=?, address=?, occupation=?, nin_front_path=?, nin_back_path=?, selfie_path=?, status='under_review', rejection_reason=NULL, reviewed_by=NULL, reviewed_at=NULL WHERE user_id=?");
            $stmt->execute([$first,$surname,$middle ?: null,$email,$phone,$nin,$hash,$address,$occupation,$front,$back,$selfie,$userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO kyc_submissions (user_id,first_name,surname,middle_name,email,phone,nin_number,nin_hash,address,occupation,nin_front_path,nin_back_path,selfie_path,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'under_review')");
            $stmt->execute([$userId,$first,$surname,$middle ?: null,$email,$phone,$nin,$hash,$address,$occupation,$front,$back,$selfie]);
        }
        $pdo->commit();

        // Notify only administrators responsible for Monarch/KYC operations.
        try {
            $adminQ = $pdo->query('SELECT user_id FROM admin_access WHERE monarch_admin=1');
            $notify = $pdo->prepare('INSERT INTO monarch_notifications (user_id,audience,title,message,type) VALUES (?,"admin",?,?,?)');
            while ($adminId = $adminQ->fetchColumn()) {
                $notify->execute([
                    (int)$adminId,
                    'New KYC submission',
                    $first . ' ' . $surname . ' has submitted KYC for review.',
                    'kyc'
                ]);
            }
        } catch (Throwable $notifyError) {
            error_log('KYC admin notification error: ' . $notifyError->getMessage());
        }

        if ($old) kyc_cleanup([$old['nin_front_path'] ?? null, $old['nin_back_path'] ?? null, $old['selfie_path'] ?? null]);
        kyc_json(true, 'KYC submitted successfully and is now under review.');
    }

    kyc_json(false, 'Unknown KYC action.', [], 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    // Remove newly uploaded files if the database write fails after upload.
    if (isset($front, $back, $selfie)) kyc_cleanup([$front, $back, $selfie]);
    error_log('KYC error: ' . $e->getMessage());
    kyc_json(false, 'We could not process your KYC request right now.', [], 500);
}
