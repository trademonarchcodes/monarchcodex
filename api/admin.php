<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if(session_status()!==PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(bool $ok,string $m='',array $d=[],int $s=200):never{
  http_response_code($s);
  echo json_encode(array_merge(['success'=>$ok,'message'=>$m],$d),JSON_UNESCAPED_SLASHES);
  exit;
}

function admin(PDO $p):array{
  $id=(int)($_SESSION['user_id']??0);
  if(!$id) out(false,'Please log in again.',[],401);
  $q=$p->prepare('SELECT a.*,u.full_name,u.email,u.role FROM admin_access a JOIN users u ON u.id=a.user_id WHERE a.user_id=? LIMIT 1');
  $q->execute([$id]);
  $a=$q->fetch(PDO::FETCH_ASSOC);
  if(!$a||(!(int)$a['monarch_admin']&&!(int)$a['sovereign_admin'])) out(false,'Administrator access required.',[],403);
  return $a;
}

function require_monarch_admin(array $a):void{
  if(!(int)$a['monarch_admin']) out(false,'Monarch Codex admin access required.',[],403);
}

function notify_monarch(PDO $p,int $userId,string $title,string $message,string $type='general'):void{
  try{
    $q=$p->prepare('INSERT INTO notifications (user_id,audience,title,message,type) VALUES (?,"monarch",?,?,?)');
    $q->execute([$userId,$title,$message,$type]);
  }catch(Throwable $e){ error_log('Monarch notification error: '.$e->getMessage()); }
}

function audit(PDO $p,int $adminId,?int $target,string $action,?float $amount,string $currency,string $description):void{
  try{
    $q=$p->prepare('INSERT INTO admin_audit_log (admin_user_id,target_user_id,action,amount,currency,description) VALUES (?,?,?,?,?,?)');
    $q->execute([$adminId,$target,$action,$amount,$currency,$description]);
  }catch(Throwable $e){ error_log('Admin audit error: '.$e->getMessage()); }
}

function balance(PDO $p,int $userId):float{
  $sql='SELECT
    COALESCE(SUM(CASE WHEN type="deposit" AND status IN ("approved","completed") THEN amount ELSE 0 END),0)
    +COALESCE(SUM(CASE WHEN type IN ("referral_earning","investment_profit","refund","adjustment") AND status IN ("approved","completed") THEN amount ELSE 0 END),0)
    -COALESCE(SUM(CASE WHEN type IN ("withdrawal","investment_purchase","fee") AND status IN ("approved","completed") THEN amount ELSE 0 END),0)
    FROM wallet_transactions WHERE user_id=?';
  $q=$p->prepare($sql);$q->execute([$userId]);
  return round((float)$q->fetchColumn(),2);
}

try{
  if($_SERVER['REQUEST_METHOD']!=='POST') out(false,'POST requests only.',[],405);
  $p=db();$a=admin($p);$action=$_GET['action']??'';

  if($action==='session'){
    out(true,'',['admin'=>[
      'full_name'=>$a['full_name'],'email'=>$a['email'],
      'monarch_admin'=>(bool)$a['monarch_admin'],
      'sovereign_admin'=>(bool)$a['sovereign_admin'],
      'is_main_admin'=>(bool)$a['is_main_admin']
    ]]);
  }

  if($action==='notifications'){
    $q=$p->prepare('SELECT id,title,message,type,is_read,created_at FROM notifications WHERE user_id=? AND audience="admin" ORDER BY created_at DESC LIMIT 30');
    $q->execute([(int)$a['user_id']]);
    $items=$q->fetchAll(PDO::FETCH_ASSOC);$unread=0;
    foreach($items as $item){if((int)$item['is_read']===0)$unread++;}
    out(true,'',['notifications'=>$items,'unread'=>$unread]);
  }

  if($action==='notification_read'){
    $id=(int)($_POST['id']??0);
    $q=$p->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=? AND audience="admin"');
    $q->execute([$id,(int)$a['user_id']]);
    out(true,'Notification marked as read.');
  }

  if($action==='notification_read_all'){
    $q=$p->prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND audience="admin" AND is_read=0');
    $q->execute([(int)$a['user_id']]);
    out(true,'All notifications marked as read.');
  }

  if($action==='kyc_list'){
    require_monarch_admin($a);
    $st=$_POST['status']??'all';$search=trim((string)($_POST['q']??''));$w=[];$v=[];
    if(in_array($st,['under_review','approved','rejected'],true)){$w[]='k.status=?';$v[]=$st;}
    if($q=$search){
      $w[]='(k.first_name LIKE ? OR k.surname LIKE ? OR k.email LIKE ? OR u.uid LIKE ?)';
      $x='%'.$q.'%';array_push($v,$x,$x,$x,$x);
    }
    $sql='SELECT k.id,k.user_id,u.uid,u.full_name,k.first_name,k.surname,k.middle_name,k.email,k.phone,k.nin_number,k.address,k.occupation,k.status,k.rejection_reason,k.created_at
          FROM kyc_submissions k JOIN users u ON u.id=k.user_id';
    if($w)$sql.=' WHERE '.implode(' AND ',$w);
    $sql.=' ORDER BY k.created_at DESC';
    $q2=$p->prepare($sql);$q2->execute($v);
    out(true,'',['kyc'=>$q2->fetchAll(PDO::FETCH_ASSOC)]);
  }

  if($action==='kyc_review'){
    require_monarch_admin($a);
    $id=(int)($_POST['kyc_id']??0);$decision=$_POST['decision']??'';$reason=trim((string)($_POST['reason']??''));
    if(!in_array($decision,['approved','rejected'],true)) out(false,'Invalid KYC decision.',[],422);
    if($decision==='rejected'&&$reason==='') out(false,'A rejection reason is required.',[],422);
    $q=$p->prepare('SELECT user_id FROM kyc_submissions WHERE id=? LIMIT 1');$q->execute([$id]);$target=(int)($q->fetchColumn()?:0);
    if(!$target) out(false,'KYC record not found.',[],404);
    $q=$p->prepare('UPDATE kyc_submissions SET status=?,rejection_reason=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?');
    $q->execute([$decision,$decision==='rejected'?$reason:null,(int)$a['user_id'],$id]);
    notify_monarch($p,$target,$decision==='approved'?'KYC approved':'KYC needs attention',
      $decision==='approved'?'Your KYC has been approved. Protected MONARCH CODEX services are now unlocked.':'Your KYC was rejected. Reason: '.$reason,
      'kyc');
    audit($p,(int)$a['user_id'],$target,'kyc_'.$decision,null,'USD','KYC review');
    out(true,$decision==='approved'?'KYC approved successfully.':'KYC rejected with the recorded reason.');
  }

  if($action==='monarchs'){
    require_monarch_admin($a);
    $search=trim((string)($_POST['q']??''));$kycFilter=$_POST['kyc']??'all';$onlineFilter=$_POST['online']??'all';
    $w=['u.role IN ("member")'];$v=[];
    if($search!==''){
      $w[]='(u.full_name LIKE ? OR u.email LIKE ? OR u.uid LIKE ? OR u.phone LIKE ?)';
      $x='%'.$search.'%';array_push($v,$x,$x,$x,$x);
    }
    if(in_array($kycFilter,['not_submitted','under_review','approved','rejected'],true)){
      if($kycFilter==='not_submitted') $w[]='k.status IS NULL';
      else {$w[]='k.status=?';$v[]=$kycFilter;}
    }
    if($onlineFilter==='online') $w[]='p.last_seen_at >= (NOW() - INTERVAL 90 SECOND)';
    if($onlineFilter==='offline') $w[]='(p.last_seen_at IS NULL OR p.last_seen_at < (NOW() - INTERVAL 90 SECOND))';

    $sql='SELECT u.id,u.uid,u.full_name,u.email,u.phone,u.account_status,u.created_at,
      COALESCE(k.status,"not_submitted") kyc_status,
      COALESCE(p.last_seen_at,NULL) last_seen_at,
      CASE WHEN p.last_seen_at IS NOT NULL AND p.last_seen_at >= (NOW() - INTERVAL 90 SECOND) THEN 1 ELSE 0 END is_online,
      COALESCE(w.deposited,0) deposited_amount,
      COALESCE(w.earnings,0) earnings,
      COALESCE(w.refunds,0) refunds,
      COALESCE(w.withdrawals,0) withdrawals,
      COALESCE(w.purchases,0) purchases,
      COALESCE(w.fees,0) fees,
      COALESCE(w.adjustments,0) adjustments
      FROM users u
      LEFT JOIN kyc_submissions k ON k.user_id=u.id
      LEFT JOIN monarch_presence p ON p.user_id=u.id
      LEFT JOIN (
        SELECT user_id,
          SUM(CASE WHEN type="deposit" AND status IN ("approved","completed") THEN amount ELSE 0 END) deposited,
          SUM(CASE WHEN type IN ("referral_earning","investment_profit") AND status IN ("approved","completed") THEN amount ELSE 0 END) earnings,
          SUM(CASE WHEN type="refund" AND status IN ("approved","completed") THEN amount ELSE 0 END) refunds,
          SUM(CASE WHEN type="withdrawal" AND status IN ("approved","completed") THEN amount ELSE 0 END) withdrawals,
          SUM(CASE WHEN type="investment_purchase" AND status IN ("approved","completed") THEN amount ELSE 0 END) purchases,
          SUM(CASE WHEN type="fee" AND status IN ("approved","completed") THEN amount ELSE 0 END) fees,
          SUM(CASE WHEN type="adjustment" AND status IN ("approved","completed") THEN amount ELSE 0 END) adjustments
        FROM wallet_transactions GROUP BY user_id
      ) w ON w.user_id=u.id';
    if($w)$sql.=' WHERE '.implode(' AND ',$w);
    $sql.=' ORDER BY u.created_at DESC';
    $q=$p->prepare($sql);$q->execute($v);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
    foreach($rows as &$row){
      $row['is_online']=(bool)$row['is_online'];
      $row['available_balance']=round((float)$row['deposited_amount']+(float)$row['earnings']+(float)$row['refunds']+(float)$row['adjustments']-(float)$row['withdrawals']-(float)$row['purchases']-(float)$row['fees'],2);
    }unset($row);
    out(true,'',['monarchs'=>$rows]);
  }

  if($action==='monarch_view'){
    require_monarch_admin($a);
    $target=(int)($_POST['user_id']??0);
    if($target<1) out(false,'Invalid Monarch.',[],422);
    $q=$p->prepare('SELECT id,uid,full_name,email,phone,role,account_status,created_at FROM users WHERE id=? AND role="member" LIMIT 1');
    $q->execute([$target]);$user=$q->fetch(PDO::FETCH_ASSOC);
    if(!$user) out(false,'Monarch not found.',[],404);

    $q=$p->prepare('SELECT status,rejection_reason,first_name,surname,middle_name,email,phone,address,occupation,created_at,updated_at FROM kyc_submissions WHERE user_id=? LIMIT 1');$q->execute([$target]);$kyc=$q->fetch(PDO::FETCH_ASSOC)?:null;
    $q=$p->prepare('SELECT type,amount,currency,status,reference,description,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 25');$q->execute([$target]);$transactions=$q->fetchAll(PDO::FETCH_ASSOC);
    $q=$p->prepare('SELECT u.uid,u.full_name,u.account_status,u.created_at,CASE WHEN p.last_seen_at IS NOT NULL AND p.last_seen_at >= (NOW() - INTERVAL 90 SECOND) THEN 1 ELSE 0 END is_online FROM monarch_referrals r JOIN users u ON u.id=r.referred_user_id LEFT JOIN monarch_presence p ON p.user_id=u.id WHERE r.referrer_user_id=? ORDER BY r.created_at DESC');$q->execute([$target]);$referrals=$q->fetchAll(PDO::FETCH_ASSOC);
    $q=$p->prepare('SELECT feature,status,expires_at FROM member_access WHERE user_id=? ORDER BY feature');$q->execute([$target]);$access=$q->fetchAll(PDO::FETCH_ASSOC);
    $user['is_online']=false;
    $q=$p->prepare('SELECT last_seen_at FROM monarch_presence WHERE user_id=? LIMIT 1');$q->execute([$target]);$last=$q->fetchColumn();
    $user['last_seen_at']=$last?:null;$user['is_online']=$last && strtotime((string)$last)>=time()-90;
    $user['available_balance']=balance($p,$target);
    out(true,'',['user'=>$user,'kyc'=>$kyc,'transactions'=>$transactions,'referrals'=>$referrals,'access'=>$access]);
  }

  if($action==='balance_adjust'){
    require_monarch_admin($a);
    $target=(int)($_POST['user_id']??0);$direction=$_POST['direction']??'credit';$category=$_POST['category']??'balance';
    $amount=round((float)($_POST['amount']??0),2);$description=trim((string)($_POST['description']??''));
    if($target<1||$amount<=0) out(false,'Enter a valid amount.',[],422);
    if(!in_array($direction,['credit','debit'],true)) out(false,'Invalid balance direction.',[],422);
    if(!in_array($category,['balance','profit','bonus','refund','fee'],true)) out(false,'Invalid adjustment type.',[],422);
    $q=$p->prepare('SELECT id,full_name FROM users WHERE id=? AND role="member" LIMIT 1');$q->execute([$target]);$monarch=$q->fetch(PDO::FETCH_ASSOC);
    if(!$monarch) out(false,'Only Monarch accounts can be adjusted.',[],404);

    $signed=$direction==='debit' ? -$amount : $amount;
    $current=balance($p,$target);
    if($signed<0 && $current+$signed < 0) out(false,'This debit would make the Monarch balance negative.',[],422);

    $typeMap=['balance'=>'adjustment','profit'=>'investment_profit','bonus'=>'adjustment','refund'=>'refund','fee'=>'fee'];
    $type=$typeMap[$category];
    $status='completed';
    $label=ucfirst($category).' '.($direction==='credit'?'credit':'debit');
    $desc=$description!==''?$description:$label.' issued by administrator.';
    if($category==='fee' || ($category!=='profit' && $direction==='debit')) $signed=-abs($amount);

    $q=$p->prepare('INSERT INTO wallet_transactions (user_id,type,amount,currency,status,reference,description) VALUES (?,?,?,"USD",? ,?,?)');
    $q->execute([$target,$type,$signed,$status,'ADMIN-'.strtoupper(bin2hex(random_bytes(5))),$desc]);
    $newBalance=balance($p,$target);

    $formatted='$'.number_format($amount,2);
    $noticeTitle=$direction==='credit' ? ucfirst($category).' credited' : ucfirst($category).' deducted';
    $noticeMessage=$direction==='credit'
      ? $formatted.' has been credited to your MONARCH CODEX account as '.$category.'.'
      : $formatted.' has been deducted from your MONARCH CODEX account as '.$category.'.';
    notify_monarch($p,$target,$noticeTitle,$noticeMessage,'wallet');
    audit($p,(int)$a['user_id'],$target,'balance_'.$category,$signed,'USD',$desc);

    out(true,$noticeTitle.' successfully.',['new_balance'=>$newBalance]);
  }

  out(false,'Unknown administrator action.',[],404);
}catch(Throwable $e){
  error_log('MONARCH admin error: '.$e->getMessage());
  out(false,'Administrator service is unavailable right now.',[],500);
}
