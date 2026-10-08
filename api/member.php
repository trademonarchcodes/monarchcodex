<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if(session_status()!==PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');

function member_json(bool $success,string $message='',array $data=[],int $status=200):never{
  http_response_code($status); echo json_encode(array_merge(['success'=>$success,'message'=>$message],$data)); exit;
}
try{
  if($_SERVER['REQUEST_METHOD']!=='POST') member_json(false,'POST requests only.',[],405);
  $uid=(int)($_SESSION['user_id']??0); if($uid<1) member_json(false,'Please log in again.',[],401);
  $pdo=db();

  $kyc=$pdo->prepare('SELECT status FROM kyc_submissions WHERE user_id=? LIMIT 1');$kyc->execute([$uid]);
  $kycStatus=$kyc->fetchColumn() ?: 'not_submitted';
  if($kycStatus!=='approved') member_json(true,'KYC approval required.',[
    'locked'=>true,'kyc_status'=>$kycStatus,
    'summary'=>['available_balance'=>0,'earnings'=>0,'deposited_amount'=>0,'invested_amount'=>0,'monthly_investment_profit'=>0],
    'access'=>['academy'=>false,'signals'=>false]
  ]);

  $sql='SELECT
    COALESCE(SUM(CASE WHEN type="deposit" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) deposited,
    COALESCE(SUM(CASE WHEN type IN ("referral_earning","investment_profit") AND status IN ("approved","completed") THEN amount ELSE 0 END),0) earnings,
    COALESCE(SUM(CASE WHEN type="refund" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) refunds,
    COALESCE(SUM(CASE WHEN type="adjustment" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) adjustments,
    COALESCE(SUM(CASE WHEN type="withdrawal" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) withdrawals,
    COALESCE(SUM(CASE WHEN type="investment_purchase" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) purchases,
    COALESCE(SUM(CASE WHEN type="fee" AND status IN ("approved","completed") THEN amount ELSE 0 END),0) fees
    FROM wallet_transactions WHERE user_id=?';
  $s=$pdo->prepare($sql);$s->execute([$uid]);$w=$s->fetch(PDO::FETCH_ASSOC)?:[];
  $i=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN status IN ("pending","active","completed") THEN principal ELSE 0 END),0) invested,COALESCE(SUM(CASE WHEN status="active" THEN monthly_profit ELSE 0 END),0) monthly_profit FROM investments WHERE user_id=?');
  $i->execute([$uid]);$inv=$i->fetch(PDO::FETCH_ASSOC)?:[];
  $a=$pdo->prepare('SELECT feature,status,expires_at FROM member_access WHERE user_id=? AND feature IN ("academy","signals")');$a->execute([$uid]);
  $access=['academy'=>false,'signals'=>false];
  foreach($a->fetchAll(PDO::FETCH_ASSOC) as $row){
    $valid=$row['status']==='approved' && (!$row['expires_at'] || strtotime($row['expires_at'])>time());
    $access[$row['feature']]=$valid;
  }
  $deposited=(float)$w['deposited'];$earnings=(float)$w['earnings'];$refunds=(float)$w['refunds'];$adjustments=(float)$w['adjustments'];
  $available=$deposited+$earnings+$refunds+$adjustments-(float)$w['withdrawals']-(float)$w['purchases']-(float)$w['fees'];
  member_json(true,'',[
    'locked'=>false,'kyc_status'=>$kycStatus,
    'summary'=>[
      'available_balance'=>round($available,2),
      'earnings'=>round($earnings,2),
      'deposited_amount'=>round($deposited,2),
      'invested_amount'=>(float)$inv['invested'],
      'monthly_investment_profit'=>(float)$inv['monthly_profit']
    ],
    'access'=>$access
  ]);
}catch(Throwable $e){
  error_log('Member data error: '.$e->getMessage());
  member_json(false,'Member financial data is not available yet.',[],500);
}
