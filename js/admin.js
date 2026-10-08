const $=s=>document.querySelector(s);
const msg=(t,type="")=>{$("#adminMessage").textContent=t;$("#adminMessage").className="admin-message "+type};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let adminState=null;
let activeMonarchId=0;

async function api(action,body={}){
 let r;
 try{
  r=await fetch("/api/admin.php?action="+encodeURIComponent(action),{
   method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},
   body:new URLSearchParams(body)
 });
 }catch{
  throw new Error("MONARCH CODEX server connection is unavailable. Please refresh and try again.");
 }
 const x=await r.json().catch(()=>({success:false,message:"Invalid server response."}));
 if(!r.ok||!x.success)throw new Error(x.message||"Administrator request failed.");
 return x;
}

function money(v){return "$"+Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}

function renderAdminNotifications(items,unread){
 const count=$("#adminNotificationCount"); if(count){count.textContent=String(unread||0);count.hidden=!unread;}
 const list=$("#adminNotificationList"); if(!list)return;
 list.innerHTML=items?.length?items.map(n=>`<button class="notification-item ${Number(n.is_read)?"read":"unread"}" data-notification-id="${n.id}" type="button"><span><b>${esc(n.title)}</b><small>${esc(n.message)}</small><em>${new Date(n.created_at.replace(" ","T")).toLocaleString()}</em></span></button>`).join(""):'<div class="notification-empty">No notifications yet.</div>';
}

async function loadAdminNotifications(){
 try{const x=await api("notifications");renderAdminNotifications(x.notifications,x.unread);}catch{}
}

async function load(){
 try{
  const x=await api("session"); adminState=x.admin;
  $("#adminIdentity").textContent=x.admin.full_name+" · "+x.admin.email;
  $("#adminLevel").textContent=x.admin.is_main_admin?"MAIN ADMIN":(x.admin.sovereign_admin?"SOVEREIGN DESK ADMIN":"MONARCH CODEX ADMIN");

  if(x.admin.is_main_admin)$("#workspaceSwitcher").hidden=false;
  if(!x.admin.monarch_admin){
    $("#kycWorkspace").hidden=true;
    $("#monarchWorkspace").hidden=true;
  }
  if(!x.admin.sovereign_admin)$("#sovereignWorkspace").hidden=true;
  if(!x.admin.sovereign_admin)$(".workspace-btn[data-workspace=sovereign]").hidden=true;

  if(x.admin.monarch_admin){
    await listKyc();
    await listMonarchs();
  }else{
    $("#sovereignWorkspace").hidden=false;
  }

  await loadAdminNotifications();
  window.setInterval(loadAdminNotifications,15000);
  if(x.admin.monarch_admin)window.setInterval(listMonarchs,30000);
 }catch(e){
  msg(e.message,"error");
  setTimeout(()=>location.href="/login.html",1800);
 }
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

async function listMonarchs(){
 if(!adminState?.monarch_admin)return;
 try{
  const x=await api("monarchs",{q:$("#monarchSearch").value,kyc:$("#monarchKyc").value,online:$("#monarchOnline").value});
  $("#monarchCount").textContent=x.monarchs.length;
  $("#monarchList").innerHTML=x.monarchs.length?x.monarchs.map(m=>`<article class="monarch-item">
    <div class="monarch-main">
      <div class="monarch-identity"><div class="presence-dot ${m.is_online?"online":"offline"}"></div><div><h3>${esc(m.full_name)}</h3><p>${esc(m.uid)} · ${esc(m.email)}</p></div></div>
      <span class="presence-label ${m.is_online?"online":"offline"}">${m.is_online?"Online":"Offline"}</span>
    </div>
    <div class="monarch-metrics">
      <div><span>Balance</span><strong>${money(m.available_balance)}</strong></div>
      <div><span>Earnings</span><strong>${money(m.earnings)}</strong></div>
      <div><span>KYC</span><strong>${esc(String(m.kyc_status).replace("_"," "))}</strong></div>
      <div><span>Joined</span><strong>${esc(m.created_at)}</strong></div>
    </div>
    <div class="monarch-actions"><button class="view-monarch" data-id="${m.id}">View dashboard</button><button class="manage-monarch approve" data-id="${m.id}" data-name="${esc(m.full_name)}" data-balance="${m.available_balance}">Manage balance</button></div>
  </article>`).join(""):'<div class="empty">No Monarchs found.</div>';
 }catch(e){msg(e.message,"error")}
}

function openBalanceModal(id,name,current){
 activeMonarchId=Number(id)||0;
 $("#balanceTarget").textContent=name+" · "+id;
 $("#balanceCurrent").textContent=money(current);
 $("#balanceForm").reset();
 $("#balanceModal").hidden=false;
 document.body.classList.add("modal-open");
}

function closeBalanceModal(){activeMonarchId=0;$("#balanceModal").hidden=true;document.body.classList.remove("modal-open");}

$("#kycRefresh").onclick=listKyc;
$("#kycStatus").onchange=listKyc;
$("#kycSearch").oninput=()=>{clearTimeout(window.kt);window.kt=setTimeout(listKyc,300)};
$("#monarchRefresh").onclick=listMonarchs;
$("#monarchKyc").onchange=listMonarchs;
$("#monarchOnline").onchange=listMonarchs;
$("#monarchSearch").oninput=()=>{clearTimeout(window.mt);window.mt=setTimeout(listMonarchs,300)};

$("#kycList").onclick=async e=>{
 const b=e.target.closest("button");if(!b)return;const id=b.dataset.id;
 if(b.classList.contains("approve")){
  if(!confirm("Approve this KYC submission?"))return;
  try{await api("kyc_review",{kyc_id:id,decision:"approved"});msg("KYC approved.","success");await listKyc();}catch(x){msg(x.message,"error")}
 }else{
  const reason=prompt("Enter the rejection reason. This is required:");
  if(!reason||!reason.trim())return;
  try{await api("kyc_review",{kyc_id:id,decision:"rejected",reason:reason.trim()});msg("KYC rejected with a reason.","success");await listKyc();}catch(x){msg(x.message,"error")}
 }
};

$("#monarchList").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.classList.contains("view-monarch")){location.href="/admin-monarch.html?id="+encodeURIComponent(b.dataset.id);return;}
 if(b.classList.contains("manage-monarch"))openBalanceModal(b.dataset.id,b.dataset.name,b.dataset.balance);
};

$("#balanceModalClose").onclick=closeBalanceModal;
$("#balanceModal").addEventListener("click",e=>{if(e.target.id==="balanceModal")closeBalanceModal()});
$("#balanceForm").onsubmit=async e=>{
 e.preventDefault();
 if(!activeMonarchId)return;
 const fd=new FormData(e.currentTarget);
 const button=e.currentTarget.querySelector("button[type=submit]");
 button.disabled=true;button.textContent="Applying…";
 try{
  const x=await api("balance_adjust",{
   user_id:String(activeMonarchId),
   direction:String(fd.get("direction")||"credit"),
   category:String(fd.get("category")||"balance"),
   amount:String(fd.get("amount")||"0"),
   description:String(fd.get("description")||"")
  });
  closeBalanceModal();msg(x.message+" New balance: "+money(x.new_balance),"success");await listMonarchs();await loadAdminNotifications();
 }catch(x){msg(x.message,"error")}finally{button.disabled=false;button.textContent="Apply ledger entry";}
};

document.querySelectorAll(".workspace-btn").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".workspace-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 const sovereign=b.dataset.workspace==="sovereign";
 if(adminState?.monarch_admin)$("#kycWorkspace").hidden=sovereign;
 if(adminState?.monarch_admin)$("#monarchWorkspace").hidden=sovereign;
 if(adminState?.sovereign_admin)$("#sovereignWorkspace").hidden=!sovereign;
});

$("#adminNotificationButton").onclick=()=>{
 const panel=$("#adminNotificationPanel"),open=panel.hidden===false;
 panel.hidden=open;$("#adminNotificationButton").setAttribute("aria-expanded",String(!open));
 if(!open)loadAdminNotifications();
};
$("#adminNotificationReadAll").onclick=async()=>{try{await api("notification_read_all");await loadAdminNotifications();}catch{}};
$("#adminNotificationList").onclick=async e=>{
 const item=e.target.closest("[data-notification-id]");if(!item)return;
 try{await api("notification_read",{id:item.dataset.notificationId});await loadAdminNotifications();}catch{}
};
document.addEventListener("click",e=>{
 const panel=$("#adminNotificationPanel");
 if(panel&&!panel.hidden&&!e.target.closest(".admin-notification-wrap")){panel.hidden=true;$("#adminNotificationButton").setAttribute("aria-expanded","false");}
});
$("#adminLogout").onclick=async()=>{try{await fetch("/api/auth.php?action=logout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});location.href="/login.html"}catch(e){location.href="/login.html"}};
$("#balanceModal").hidden=true;
load();
