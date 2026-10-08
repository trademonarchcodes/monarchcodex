<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function notification_json(bool $ok,string $message='',array $data=[],int $status=200):never{
  http_response_code($status);
  echo json_encode(array_merge(['success'=>$ok,'message'=>$message],$data),JSON_UNESCAPED_SLASHES);
  exit;
}

try{
  if($_SERVER['REQUEST_METHOD']!=='POST') notification_json(false,'POST requests only.',[],405);
  $userId=(int)($_SESSION['user_id']??0);
  if($userId<1) notification_json(false,'Please log in again.',[],401);
  $pdo=db();
  $action=$_GET['action']??'list';

  if($action==='list'){
    $stmt=$pdo->prepare('SELECT id,title,message,type,is_read,created_at FROM notifications WHERE user_id=? AND audience="monarch" ORDER BY created_at DESC LIMIT 30');
    $stmt->execute([$userId]);
    $items=$stmt->fetchAll(PDO::FETCH_ASSOC);
    $unread=0;
    foreach($items as $item){if((int)$item['is_read']===0)$unread++;}
    notification_json(true,'',['notifications'=>$items,'unread'=>$unread]);
  }

  if($action==='read'){
    $id=(int)($_POST['id']??0);
    if($id<1) notification_json(false,'Invalid notification.',[],422);
    $stmt=$pdo->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=? AND audience="monarch"');
    $stmt->execute([$id,$userId]);
    notification_json(true,'Notification marked as read.');
  }

  if($action==='read_all'){
    $stmt=$pdo->prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND audience="monarch" AND is_read=0');
    $stmt->execute([$userId]);
    notification_json(true,'All notifications marked as read.');
  }

  notification_json(false,'Unknown notification action.',[],404);
}catch(Throwable $e){
  error_log('Monarch notifications error: '.$e->getMessage());
  notification_json(false,'Notifications are temporarily unavailable.',[],500);
}
