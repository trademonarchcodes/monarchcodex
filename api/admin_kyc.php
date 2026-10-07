<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');

function admin_json(bool $success, string $message = '', array $data = [], int $status = 200): never {
    http_response_code($status);
    echo json_encode(array_merge(['success'=>$success,'message'=>$message],$data));
    exit;
}
function require_admin(PDO $pdo): array {
    $uid=(int)($_SESSION['user_id']??0);
    if($uid<1) admin_json(false,'Please log in again.',[],401);
    $s=$pdo->prepare('SELECT a.*, u.email, u.full_name, u.role FROM admin_access a JOIN users u ON u.id=a.user_id WHERE a.user_id=? LIMIT 1');
    $s->execute([$uid]); $a=$s->fetch(PDO::FETCH_ASSOC);
    if(!$a || (!$a['monarch_admin'] && !$a['sovereign_admin'])) admin_json(false,'Administrator access required.',[],403);
    return $a;
}
try {
    if($_SERVER['REQUEST_METHOD']!=='POST') admin_json(false,'POST requests only.',[],405);
    $pdo=db(); $admin=require_admin($pdo); $action=$_GET['action']??'list';

    if($action==='list'){
        $status=$_POST['status']??'all'; $q=trim((string)($_POST['q']??''));
        $where=[];$params=[];
        if(in_array($status,['under_review','approved','rejected'],true)){ $where[]='k.status=?';$params[]=$status; }
        if($q!==''){ $where[]='(k.first_name LIKE ? OR k.surname LIKE ? OR k.email LIKE ? OR u.uid LIKE ?)';$x='%'.$q.'%';array_push($params,$x,$x,$x,$x); }
        $sql='SELECT k.id,k.user_id,u.uid,u.full_name,k.first_name,k.surname,k.middle_name,k.email,k.phone,k.nin_number,k.address,k.occupation,k.nin_front_path,k.nin_back_path,k.selfie_path,k.status,k.rejection_reason,k.created_at,k.updated_at FROM kyc_submissions k JOIN users u ON u.id=k.user_id';
        if($where)$sql.=' WHERE '.implode(' AND ',$where); $sql.=' ORDER BY k.updated_at DESC';
        $s=$pdo->prepare($sql);$s->execute($params);
        admin_json(true,'',['kyc'=>$s->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if($action==='review'){
        $id=(int)($_POST['kyc_id']??0); $decision=$_POST['decision']??'';
        if(!in_array($decision,['approved','rejected'],true)) admin_json(false,'Choose approve or reject.');
        $reason=trim((string)($_POST['reason']??''));
        if($decision==='rejected' && $reason==='') admin_json(false,'A rejection reason is required.');
        $s=$pdo->prepare('SELECT user_id FROM kyc_submissions WHERE id=? LIMIT 1');$s->execute([$id]);$row=$s->fetch(PDO::FETCH_ASSOC);
        if(!$row) admin_json(false,'KYC record not found.',[],404);
        $s=$pdo->prepare('UPDATE kyc_submissions SET status=?, rejection_reason=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?');
        $s->execute([$decision,$decision==='rejected'?$reason:null,(int)$_SESSION['user_id'],$id]);
        admin_json(true,$decision==='approved'?'KYC approved successfully.':'KYC rejected with the recorded reason.');
    }

    if($action==='access'){
        $uid=(int)($_POST['user_id']??0);$feature=$_POST['feature']??'';$decision=$_POST['decision']??'';
        if(!in_array($feature,['academy','signals'],true) || !in_array($decision,['approved','rejected'],true)) admin_json(false,'Invalid access request.');
        $s=$pdo->prepare('INSERT INTO member_access (user_id,feature,status,approved_by,approved_at) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE status=VALUES(status),approved_by=VALUES(approved_by),approved_at=VALUES(approved_at)');
        $s->execute([$uid,$feature,$decision,(int)$_SESSION['user_id']]);
        admin_json(true,'Member access updated.');
    }

    admin_json(false,'Unknown admin action.',[],400);
} catch(Throwable $e) {
    error_log('Admin KYC error: '.$e->getMessage());
    admin_json(false,'We could not process the administrator request right now.',[],500);
}
