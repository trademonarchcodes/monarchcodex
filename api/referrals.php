<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if(session_status()!==PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function referral_json(bool $ok,string $message='',array $data=[],int $status=200):never{
  http_response_code($status);
  echo json_encode(array_merge(['success'=>$ok,'message'=>$message],$data),JSON_UNESCAPED_SLASHES);
  exit;
}

try{
  if($_SERVER['REQUEST_METHOD']!=='POST') referral_json(false,'POST requests only.',[],405);
  $userId=(int)($_SESSION['user_id']??0);
  if($userId<1) referral_json(false,'Please log in again.',[],401);
  $pdo=db();
  $stmt=$pdo->prepare('SELECT id,uid FROM users WHERE id=? LIMIT 1');
  $stmt->execute([$userId]);
  $me=$stmt->fetch(PDO::FETCH_ASSOC);
  if(!$me) referral_json(false,'Account not found.',[],404);

  $host=$_SERVER['HTTP_HOST']??'';
  $scheme=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http';
  $code=(string)$me['uid'];
  $link=$scheme.'://'.$host.'/register.html?ref='.rawurlencode($code);

  $q=$pdo->prepare('
    SELECT u.id,u.uid,u.full_name,u.account_status,u.created_at,
           CASE WHEN p.last_seen_at IS NOT NULL AND p.last_seen_at >= (NOW() - INTERVAL 90 SECOND) THEN 1 ELSE 0 END AS is_online
    FROM monarch_referrals r
    JOIN users u ON u.id=r.referred_user_id
    LEFT JOIN monarch_presence p ON p.user_id=u.id
    WHERE r.referrer_user_id=?
    ORDER BY r.created_at DESC
  ');
  $q->execute([$userId]);
  $referrals=$q->fetchAll(PDO::FETCH_ASSOC);
  foreach($referrals as &$row){$row['is_online']=(bool)$row['is_online'];}
  unset($row);

  referral_json(true,'',[
    'referral'=>[
      'code'=>$code,
      'link'=>$link,
      'total'=>count($referrals),
      'referrals'=>$referrals
    ]
  ]);
}catch(Throwable $e){
  error_log('Referral error: '.$e->getMessage());
  referral_json(false,'Referral information is temporarily unavailable.',[],500);
}
