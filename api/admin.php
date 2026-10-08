<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
if(session_status()!==PHP_SESSION_ACTIVE)session_start();
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
function out(bool $ok,string $m='',array $d=[],int $s=200):never{http_response_code($s);echo json_encode(array_merge(['success'=>$ok,'message'=>$m],$d));exit;}
function admin(PDO $p):array{
 $id=(int)($_SESSION['user_id']??0);if(!$id)out(false,'Please log in again.',[],401);
 $q=$p->prepare('SELECT a.*,u.full_name,u.email FROM admin_access a JOIN users u ON u.id=a.user_id WHERE a.user_id=? LIMIT 1');$q->execute([$id]);$a=$q->fetch(PDO::FETCH_ASSOC);
 if(!$a||(!(int)$a['monarch_admin']&&!(int)$a['sovereign_admin']))out(false,'Administrator access required.',[],403);return $a;
}
try{
 if($_SERVER['REQUEST_METHOD']!=='POST')out(false,'POST requests only.',[],405);
 $p=db();$a=admin($p);$action=$_GET['action']??'';
 if($action==='session')out(true,'',['admin'=>['full_name'=>$a['full_name'],'email'=>$a['email'],'monarch_admin'=>(bool)$a['monarch_admin'],'sovereign_admin'=>(bool)$a['sovereign_admin'],'is_main_admin'=>(bool)$a['is_main_admin']]]);
 if($action==='kyc_list'){
  if(!(int)$a['monarch_admin'])out(false,'Monarch Codex admin access required.',[],403);
  $st=$_POST['status']??'all';$q=trim((string)($_POST['q']??''));$w=[];$v=[];
  if(in_array($st,['under_review','approved','rejected'],true)){$w[]='k.status=?';$v[]=$st;}
  if($q!==''){$w[]='(k.first_name LIKE ? OR k.surname LIKE ? OR k.email LIKE ? OR u.uid LIKE ?)';$x='%'.$q.'%';array_push($v,$x,$x,$x,$x);}
  $sql='SELECT k.id,k.user_id,u.uid,u.full_name,k.first_name,k.surname,k.middle_name,k.email,k.phone,k.nin_number,k.address,k.occupation,k.status,k.rejection_reason,k.created_at FROM kyc_submissions k JOIN users u ON u.id=k.user_id';
  if($w)$sql.=' WHERE '.implode(' AND ',$w);$sql.=' ORDER BY k.created_at DESC';
  $q2=$p->prepare($sql);$q2->execute($v);out(true,'',['kyc'=>$q2->fetchAll(PDO::FETCH_ASSOC)]);
 }
 if($action==='kyc_review'){
  if(!(int)$a['monarch_admin'])out(false,'Monarch Codex admin access required.',[],403);
  $id=(int)($_POST['kyc_id']??0);$decision=$_POST['decision']??'';$reason=trim((string)($_POST['reason']??''));
  if(!in_array($decision,['approved','rejected'],true))out(false,'Invalid KYC decision.',[],422);
  if($decision==='rejected'&&$reason==='')out(false,'A rejection reason is required.',[],422);
  $q=$p->prepare('UPDATE kyc_submissions SET status=?,rejection_reason=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?');$q->execute([$decision,$decision==='rejected'?$reason:null,(int)$a['user_id'],$id]);
  if($q->rowCount()<1)out(false,'KYC record not found.',[],404);
  out(true,$decision==='approved'?'KYC approved successfully.':'KYC rejected with the recorded reason.');
 }
 out(false,'Unknown administrator action.',[],404);
}catch(Throwable $e){error_log('MONARCH admin error: '.$e->getMessage());out(false,'Administrator service is unavailable right now.',[],500);}
