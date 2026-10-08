const $=s=>document.querySelector(s);
const msg=(t,type="")=>{$("#adminMessage").textContent=t;$("#adminMessage").className="admin-message "+type};
async function api(action,body={}){
 const r=await fetch("/api/admin.php?action="+encodeURIComponent(action),{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:new URLSearchParams(body)});
 const x=await r.json().catch(()=>({success:false,message:"Invalid server response."}));
 if(!r.ok||!x.success)throw new Error(x.message||"Administrator request failed.");
 return x;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function load(){
 try{
  const x=await api("session");
  $("#adminIdentity").textContent=x.admin.full_name+" · "+x.admin.email;
  $("#adminLevel").textContent=x.admin.is_main_admin?"MAIN ADMIN":(x.admin.sovereign_admin?"SOVEREIGN DESK ADMIN":"MONARCH CODEX ADMIN");
  if(x.admin.is_main_admin){$("#workspaceSwitcher").hidden=false}
  if(!x.admin.monarch_admin) $("#kycWorkspace").hidden=true;
  // Sovereign Desk-only administrators land directly in their permitted workspace.
  if(!x.admin.is_main_admin && !x.admin.monarch_admin && x.admin.sovereign_admin){
   $("#sovereignWorkspace").hidden=false;
   document.querySelectorAll(".workspace-btn").forEach(b=>b.classList.remove("active"));
  }
  if(!x.admin.sovereign_admin) $(".workspace-btn[data-workspace=sovereign]").hidden=true;
  await listKyc();
 }catch(e){msg(e.message,"error");setTimeout(()=>location.href="/login.html",1800)}
}
async function listKyc(){
 try{
  const x=await api("kyc_list",{status:$("#kycStatus").value,q:$("#kycSearch").value});
  $("#kycCount").textContent=x.kyc.length;
  $("#kycList").innerHTML=x.kyc.length?x.kyc.map(k=>`<article class="kyc-item">
   <div class="kyc-item-top"><div><h3>${esc(k.first_name+" "+(k.middle_name?k.middle_name+" ":"")+k.surname)}</h3><div class="kyc-meta">${esc(k.uid)} · ${esc(k.email)} · ${esc(k.created_at)}</div></div><span class="kyc-status">${esc(k.status.replace("_"," "))}</span></div>
   <div class="kyc-data"><div><span>Phone</span><strong>${esc(k.phone)}</strong></div><div><span>NIN</span><strong>${esc(k.nin_number)}</strong></div><div><span>Occupation</span><strong>${esc(k.occupation)}</strong></div><div><span>Address</span><strong>${esc(k.address)}</strong></div><div><span>Account</span><strong>${esc(k.full_name)}</strong></div><div><span>UID</span><strong>${esc(k.uid)}</strong></div></div>
   <div class="kyc-actions">${k.status!=="approved"?'<button class="approve" data-id="'+k.id+'">Approve</button>':""}${k.status!=="rejected"?'<button class="reject" data-id="'+k.id+'">Reject</button>':""}</div>
  </article>`).join(""):'<div class="empty">No KYC records found.</div>';
 }catch(e){msg(e.message,"error")}
}
$("#kycRefresh").onclick=listKyc;$("#kycStatus").onchange=listKyc;$("#kycSearch").oninput=()=>{clearTimeout(window.kt);window.kt=setTimeout(listKyc,300)};
$("#kycList").onclick=async e=>{
 const b=e.target.closest("button");if(!b)return;const id=b.dataset.id;
 if(b.classList.contains("approve")){
  if(!confirm("Approve this KYC submission?"))return;
  try{await api("kyc_review",{kyc_id:id,decision:"approved"});msg("KYC approved.","success");await listKyc()}catch(x){msg(x.message,"error")}
 }else{
  const reason=prompt("Enter the rejection reason. This is required:");
  if(!reason||!reason.trim())return;
  try{await api("kyc_review",{kyc_id:id,decision:"rejected",reason:reason.trim()});msg("KYC rejected with a reason.","success");await listKyc()}catch(x){msg(x.message,"error")}
 }
};
document.querySelectorAll(".workspace-btn").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".workspace-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 const sovereign=b.dataset.workspace==="sovereign";$("#kycWorkspace").hidden=sovereign;$("#sovereignWorkspace").hidden=!sovereign;
});
$("#adminLogout").onclick=async()=>{try{await fetch("/api/auth.php?action=logout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});location.href="/login.html"}catch(e){location.href="/login.html"}};
load();