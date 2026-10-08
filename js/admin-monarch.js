const qs=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"$"+Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(action,body={}){
 const r=await fetch("/api/admin.php?action="+encodeURIComponent(action),{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:new URLSearchParams(body)});
 const x=await r.json().catch(()=>({success:false,message:"Invalid server response."}));
 if(!r.ok||!x.success)throw new Error(x.message||"Request failed.");
 return x;
}
async function load(){
 const id=new URLSearchParams(location.search).get("id");
 if(!id){qs("#viewMessage").textContent="No Monarch selected.";return;}
 try{
  const x=await api("monarch_view",{user_id:id});
  const u=x.user||{};
  qs("#viewName").textContent=u.full_name||"Monarch";
  qs("#viewMeta").textContent=[u.uid,u.email,u.phone].filter(Boolean).join(" · ");
  qs("#viewPresence").textContent=u.is_online?"ONLINE":"OFFLINE";
  qs("#viewPresence").className="admin-level "+(u.is_online?"presence-online":"presence-offline");
  qs("#viewBalance").textContent=money(u.available_balance);
  qs("#viewMetrics").innerHTML=[
    ["Available balance",money(u.available_balance)],
    ["Account status",u.account_status||"—"],
    ["Joined",u.created_at||"—"],
    ["Last seen",u.last_seen_at||"Never"]
  ].map(x=>"<div><span>"+esc(x[0])+"</span><strong>"+esc(x[1])+"</strong></div>").join("");
  const k=x.kyc;
  qs("#viewKyc").textContent=k?.status?String(k.status).replace("_"," "):"NOT SUBMITTED";
  qs("#viewKycData").innerHTML=k?[
    ["Name",[k.first_name,k.middle_name,k.surname].filter(Boolean).join(" ")],
    ["Email",k.email],["Phone",k.phone],["Occupation",k.occupation],["Address",k.address],["Submitted",k.created_at]
  ].map(x=>"<div><span>"+esc(x[0])+"</span><strong>"+esc(x[1])+"</strong></div>").join(""):"<div><span>Status</span><strong>No KYC submission</strong></div>";
  const refs=x.referrals||[];qs("#viewReferralCount").textContent=String(refs.length);
  qs("#viewReferrals").innerHTML=refs.length?refs.map(r=>"<article class='monarch-item'><div class='monarch-main'><div class='monarch-identity'><div class='presence-dot "+(r.is_online?"online":"offline")+"'></div><div><h3>"+esc(r.full_name)+"</h3><p>"+esc(r.uid)+" · "+esc(r.created_at)+"</p></div></div><span class='presence-label "+(r.is_online?"online":"offline")+"'>"+(r.is_online?"Online":"Offline")+"</span></div></article>").join(""):"<div class='empty'>No referrals yet.</div>";
  const tx=x.transactions||[];qs("#viewTransactions").innerHTML=tx.length?tx.map(t=>"<div class='ledger-row'><div><strong>"+esc(t.type.replaceAll("_"," "))+"</strong><span>"+esc(t.description||"")+" · "+esc(t.created_at)+"</span></div><b class='"+(Number(t.amount)>=0?"credit":"debit")+"'>"+(Number(t.amount)>=0?"+":"")+money(t.amount)+"</b></div>").join(""):"<div class='empty'>No transactions yet.</div>";
  const access=x.access||[];qs("#viewAccess").innerHTML=access.length?access.map(a=>"<div class='access-row'><strong>"+esc(a.feature)+"</strong><span>"+esc(a.status)+(a.expires_at?" · expires "+esc(a.expires_at):"")+"</span></div>").join(""):"<div class='empty'>No Academy or Signals access records.</div>";
 }catch(e){qs("#viewMessage").textContent=e.message;qs("#viewMessage").className="admin-message error";}
}
load();