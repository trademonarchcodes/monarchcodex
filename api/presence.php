<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if(session_status()!==PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function presence_json(bool $ok,string $message='',array $data=[],int $status=200):never{
  http_response_code($status);
  echo json_encode(array_merge(['success'=>$ok,'message'=>$message],$data));
  exit;
}

try{
  if($_SERVER['REQUEST_METHOD']!=='POST') presence_json(false,'POST requests only.',[],405);
  $userId=(int)($_SESSION['user_id']??0);
  if($userId<1) presence_json(false,'Please log in again.',[],401);
  $pdo=db();
  $stmt=$pdo->prepare('INSERT INTO monarch_presence (user_id,last_seen_at) VALUES (?,NOW()) ON DUPLICATE KEY UPDATE last_seen_at=NOW()');
  $stmt->execute([$userId]);
  presence_json(true,'');
}catch(Throwable $e){
  error_log('Presence error: '.$e->getMessage());
  presence_json(false,'Presence could not be updated.',[],500);
}
