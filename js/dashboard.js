const memberName=document.getElementById("memberName");
const memberUid=document.getElementById("memberUid");
const profileName=document.getElementById("profileName");
const profileEmail=document.getElementById("profileEmail");
const profileUid=document.getElementById("profileUid");
const profileRole=document.getElementById("profileRole");
const sidebarMemberName=document.getElementById("sidebarMemberName");
const dashboardMessage=document.getElementById("dashboardMessage");
const retryButton=document.getElementById("retryButton");
const kycForm=document.getElementById("kycForm");
const kycSubmitButton=document.getElementById("kycSubmitButton");
const kycNotice=document.getElementById("kycNotice");
const kycStatusLabel=document.getElementById("kycStatusLabel");
const kycBadge=document.getElementById("kycBadge");
const protectedArea=document.getElementById("protectedArea");
const financialOverview=document.getElementById("financialOverview");
const sovereignAdminNav=document.getElementById("sovereignAdminNav");
const sovereignCard=document.getElementById("sovereignCard");
const sidebar=document.getElementById("dashboardSidebar");
const sidebarOverlay=document.getElementById("sidebarOverlay");
const sidebarOpen=document.getElementById("sidebarOpen");
const sidebarClose=document.getElementById("sidebarClose");
const logoutButton=document.getElementById("logoutButton");
const sidebarLogoutButton=document.getElementById("sidebarLogoutButton");
const notificationButton=document.getElementById("notificationButton");
const notificationPanel=document.getElementById("notificationPanel");
const notificationCount=document.getElementById("notificationCount");
const notificationList=document.getElementById("notificationList");
const notificationReadAll=document.getElementById("notificationReadAll");
const referralCode=document.getElementById("referralCode");
const referralLink=document.getElementById("referralLink");
const referralTotal=document.getElementById("referralTotal");
const referralList=document.getElementById("referralList");
const copyReferralCode=document.getElementById("copyReferralCode");
const copyReferralLink=document.getElementById("copyReferralLink");

function showDashboardMessage(text,type=""){if(!dashboardMessage)return;dashboardMessage.textContent=text;dashboardMessage.dataset.type=type}
async function request(url,options={}) {
  const response=await fetch(url,{...options,headers:{"Accept":"application/json",...(options.headers||{})},credentials:"same-origin",cache:"no-store"});
  const raw=await response.text(); let result;
  try{result=raw?JSON.parse(raw):null}catch{throw new Error(`Server returned an invalid response (HTTP ${response.status}).`)}
  if(!response.ok||!result?.success)throw new Error(result?.message||`Request failed (HTTP ${response.status}).`);
  return result;
}
const auth=(action,options={})=>request(`/api/auth.php?action=${encodeURIComponent(action)}`,options);
const kycApi=(action,options={})=>request(`/api/kyc.php?action=${encodeURIComponent(action)}`,options);

function renderNotifications(items,unread){
  if(notificationCount){notificationCount.textContent=String(unread||0);notificationCount.hidden=!unread;}
  if(!notificationList)return;
  notificationList.innerHTML=items?.length?items.map(n=>`<button class="notification-item ${Number(n.is_read)?"read":"unread"}" data-notification-id="${n.id}" type="button"><span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.message)}</small><em>${new Date(n.created_at.replace(" ","T")).toLocaleString()}</em></span></button>`).join(""):'<div class="notification-empty">No notifications yet.</div>';
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function loadNotifications(){
  try{const result=await request("/api/notifications.php?action=list",{method:"POST"});renderNotifications(result.notifications,result.unread);}
  catch(error){if(notificationList)notificationList.innerHTML='<div class="notification-empty">Notifications unavailable.</div>';}
}
async function markNotification(id){
  try{await request("/api/notifications.php?action=read",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({id:String(id)})});await loadNotifications();}catch{}
}
async function loadReferrals(){
  try{
    const result=await request("/api/referrals.php",{method:"POST"});
    const data=result.referral||{};
    if(referralCode)referralCode.textContent=data.code||"—";
    if(referralLink)referralLink.textContent=data.link||"—";
    if(referralTotal)referralTotal.textContent=`${data.total||0} REFERRED`;
    if(referralList){
      referralList.innerHTML=data.referrals?.length?data.referrals.map(r=>`<article class="referral-card"><div><strong>${escapeHtml(r.full_name)}</strong><span>${escapeHtml(r.uid)} · Joined ${escapeHtml(r.created_at)}</span></div><div class="referral-status ${r.is_online?"online":"offline"}"><i></i>${r.is_online?"Online":"Offline"}</div></article>`).join(""):'<div class="referral-empty">No Monarchs have joined through your referral yet.</div>';
    }
  }catch(error){if(referralList)referralList.innerHTML='<div class="referral-empty">Referral information is temporarily unavailable.</div>';}
}
async function heartbeat(){try{await fetch("/api/presence.php",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json"}})}catch{}}
function renderUser(user){
  const name=user?.name||"Monarch",uid=user?.uid||"—",email=user?.email||"—",role=user?.role||"member";
  [memberName,profileName,sidebarMemberName].forEach(x=>{if(x)x.textContent=name});
  if(memberUid)memberUid.textContent=uid;
  if(profileEmail)profileEmail.textContent=email;
  if(profileUid)profileUid.textContent=uid;
  if(profileRole)profileRole.textContent=role;
}

function setKycLocked(locked){
  document.querySelectorAll(".protected-card").forEach(card=>{
    if(card.closest("#profile")||card.closest("#sovereignCard"))return;
    card.classList.toggle("is-locked",locked);
    card.setAttribute("aria-disabled",locked?"true":"false");
  });
  if(protectedArea)protectedArea.classList.toggle("content-locked",locked);
  if(financialOverview)financialOverview.classList.toggle("content-locked",locked);
  document.querySelectorAll(".locked-nav").forEach(link=>{
    link.classList.toggle("nav-disabled",locked);
    const label=link.querySelector("i");
    if(label)label.textContent=locked?"Locked":"Open";
  });
}

function renderKyc(kyc){
  const status=kyc?.status||"not_submitted";
  const labels={not_submitted:"NOT SUBMITTED",under_review:"UNDER REVIEW",approved:"APPROVED",rejected:"REJECTED"};
  const text=labels[status]||"NOT SUBMITTED";
  if(kycStatusLabel)kycStatusLabel.textContent=text;
  if(kycBadge)kycBadge.textContent=`KYC ${text}`;
  if(kycBadge)kycBadge.dataset.status=status;
  if(kycStatusLabel)kycStatusLabel.dataset.status=status;
  const approved=status==="approved";
  setKycLocked(!approved);

  if(kycNotice){
    if(status==="not_submitted")kycNotice.textContent="Complete the form below. Your protected Monarch services remain locked until an administrator approves your KYC.";
    else if(status==="under_review")kycNotice.textContent="Your KYC has been submitted and is under review. Protected services remain locked until approval.";
    else if(status==="rejected")kycNotice.textContent=`KYC rejected. Reason: ${kyc.rejection_reason||"Please review your details and resubmit."}`;
    else kycNotice.textContent="KYC approved. Your protected member services are now unlocked.";
  }

  if(kycForm){
    const canEdit=status==="not_submitted"||status==="rejected";
    kycForm.classList.toggle("form-disabled",!canEdit);
    kycForm.querySelectorAll("input,textarea,button").forEach(x=>x.disabled=!canEdit);
    if(kycSubmitButton)kycSubmitButton.textContent=status==="rejected"?"Resubmit KYC":"Submit KYC for review";
    if(approved)kycForm.hidden=true; else kycForm.hidden=false;
  }
}

function fillKycForm(kyc,user){
  if(!kycForm)return;
  const values={first_name:kyc?.first_name||"",surname:kyc?.surname||"",middle_name:kyc?.middle_name||"",email:kyc?.email||user?.email||"",phone:kyc?.phone||"",nin_number:"",address:kyc?.address||"",occupation:kyc?.occupation||""};
  Object.entries(values).forEach(([name,value])=>{const input=kycForm.elements[name];if(input)input.value=value});
}

async function loadMemberData(){
  try{
    const result=await request("/api/member.php",{method:"POST"});
    const s=result.summary||{};
    const money=(value)=>"$"+Number(value||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    set("availableBalance",money(s.available_balance));
    set("earningsBalance",money(s.earnings));
    set("depositedAmount",money(s.deposited_amount));
    set("investedAmount",money(s.invested_amount));
    set("monthlyInvestmentProfit",money(s.monthly_investment_profit));
    set("academyAccess",result.access?.academy?"Approved":"Locked");
    set("signalsAccess",result.access?.signals?"Approved":"Locked");
  }catch(error){
    showDashboardMessage(error.message||"Monarch data could not be loaded.","error");
  }
}

async function loadKyc(user){
  try{
    const result=await kycApi("status",{method:"POST"});
    renderKyc(result.kyc);
    fillKycForm(result.kyc,user);
    if(result.kyc?.status==="approved") await loadMemberData();
  }catch(error){
    renderKyc(null);
    if(kycNotice)kycNotice.textContent=error.message||"KYC service is not available yet. Please contact support.";
    showDashboardMessage(error.message||"KYC service could not be loaded.","error");
  }
}

async function submitKyc(event){
  event.preventDefault();
  if(!kycForm||!kycSubmitButton)return;
  kycSubmitButton.disabled=true;kycSubmitButton.textContent="Submitting…";
  try{
    const result=await kycApi("submit",{method:"POST",body:new FormData(kycForm)});
    showDashboardMessage(result.message||"KYC submitted.","success");
    await loadKyc(window.__memberUser);
    document.getElementById("kycSection")?.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(error){
    showDashboardMessage(error.message||"KYC submission failed.","error");
  }finally{
    if(kycSubmitButton&&!kycSubmitButton.disabled)kycSubmitButton.textContent="Submit KYC for review";
  }
}

function showWelcomeMessage(user){
  const params=new URLSearchParams(window.location.search);
  if(params.get("welcome")!=="1")return;
  showDashboardMessage(`Account created successfully! Welcome to MONARCH CODEX, ${user?.name||"Monarch"}.`,"success");
  window.history.replaceState({}, "", "dashboard.html");
}

async function loadDashboard(){
  if(retryButton)retryButton.hidden=true;
  showDashboardMessage("Loading your account…");
  try{
    const result=await auth("me",{method:"POST"});
    window.__memberUser=result.user;
    if(result.user?.role && result.user.role!=="member"){
      window.location.replace("/admin.html");
      return;
    }
    renderUser(result.user);showWelcomeMessage(result.user);
    // Administrative controls live only in the separate admin dashboard.
    if(sovereignAdminNav)sovereignAdminNav.hidden=true;
    if(sovereignCard)sovereignCard.hidden=true;
    await loadKyc(result.user);
    await loadReferrals();
    await loadNotifications();
    await heartbeat();
    window.setInterval(heartbeat,30000);
    window.setInterval(loadNotifications,15000);
    if(!new URLSearchParams(window.location.search).has("welcome"))showDashboardMessage("Account information loaded.","success");
  }catch(error){
    showDashboardMessage(error.message||"We could not load your account information.","error");
    if(retryButton)retryButton.hidden=false;
  }
}

function closeSidebar(){sidebar?.classList.remove("open");sidebarOverlay?.classList.remove("open");sidebarOpen?.setAttribute("aria-expanded","false")}
function openSidebar(){sidebar?.classList.add("open");sidebarOverlay?.classList.add("open");sidebarOpen?.setAttribute("aria-expanded","true")}

document.querySelectorAll(".sidebar-link").forEach(link=>link.addEventListener("click",()=>{
  if(link.classList.contains("nav-disabled")){showDashboardMessage("Complete KYC verification to unlock protected Monarch services.","error");closeSidebar();document.getElementById("kycSection")?.scrollIntoView({behavior:"smooth",block:"start"});return}
  document.querySelectorAll(".sidebar-link").forEach(x=>x.classList.remove("active"));link.classList.add("active");
  const target=document.getElementById(link.dataset.target);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});closeSidebar();
}));
sidebarOpen?.addEventListener("click",openSidebar);sidebarClose?.addEventListener("click",closeSidebar);sidebarOverlay?.addEventListener("click",closeSidebar);
retryButton?.addEventListener("click",loadDashboard);kycForm?.addEventListener("submit",submitKyc);
notificationButton?.addEventListener("click",()=>{
  const open=notificationPanel?.hidden===false;
  if(notificationPanel)notificationPanel.hidden=open;
  notificationButton.setAttribute("aria-expanded",String(!open));
  if(!open)loadNotifications();
});
notificationReadAll?.addEventListener("click",async()=>{
  try{await request("/api/notifications.php?action=read_all",{method:"POST"});await loadNotifications();}catch{}
});
notificationList?.addEventListener("click",e=>{
  const item=e.target.closest("[data-notification-id]");
  if(item)markNotification(item.dataset.notificationId);
});
document.addEventListener("click",e=>{
  if(notificationPanel&&!notificationPanel.hidden&&!e.target.closest(".notification-wrap")){
    notificationPanel.hidden=true;notificationButton?.setAttribute("aria-expanded","false");
  }
});
copyReferralCode?.addEventListener("click",async()=>{if(referralCode?.textContent)try{await navigator.clipboard.writeText(referralCode.textContent);showDashboardMessage("Referral code copied.","success")}catch{}});
copyReferralLink?.addEventListener("click",async()=>{if(referralLink?.textContent)try{await navigator.clipboard.writeText(referralLink.textContent);showDashboardMessage("Referral link copied.","success")}catch{}});


async function logout(){
  [logoutButton,sidebarLogoutButton].forEach(x=>{if(x){x.disabled=true;x.textContent="Logging out…"}});
  try{await auth("logout",{method:"POST"});window.location.replace("/login.html")}
  catch(error){[logoutButton,sidebarLogoutButton].forEach(x=>{if(x){x.disabled=false;x.textContent="Logout"}});showDashboardMessage(error.message||"Logout failed.","error")}
}
logoutButton?.addEventListener("click",logout);sidebarLogoutButton?.addEventListener("click",logout);
loadDashboard();
