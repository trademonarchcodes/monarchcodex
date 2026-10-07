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

function renderUser(user){
  const name=user?.name||"Member",uid=user?.uid||"—",email=user?.email||"—",role=user?.role||"member";
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
    if(status==="not_submitted")kycNotice.textContent="Complete the form below. Your protected member services remain locked until an administrator approves your KYC.";
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

async function loadKyc(user){
  try{
    const result=await kycApi("status",{method:"POST"});
    renderKyc(result.kyc);
    fillKycForm(result.kyc,user);
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
  showDashboardMessage(`Account created successfully! Welcome to MONARCH CODEX, ${user?.name||"Member"}.`,"success");
  window.history.replaceState({}, "", "dashboard.html");
}

async function loadDashboard(){
  if(retryButton)retryButton.hidden=true;
  showDashboardMessage("Loading your account…");
  try{
    const result=await auth("me",{method:"POST"});
    window.__memberUser=result.user;renderUser(result.user);showWelcomeMessage(result.user);
    if(result.user?.role==="admin"||result.user?.role==="sovereign_admin"){
      if(sovereignAdminNav)sovereignAdminNav.hidden=false;
      if(sovereignCard)sovereignCard.hidden=false;
    }
    await loadKyc(result.user);
    if(!new URLSearchParams(window.location.search).has("welcome"))showDashboardMessage("Account information loaded.","success");
  }catch(error){
    showDashboardMessage(error.message||"We could not load your account information.","error");
    if(retryButton)retryButton.hidden=false;
  }
}

function closeSidebar(){sidebar?.classList.remove("open");sidebarOverlay?.classList.remove("open");sidebarOpen?.setAttribute("aria-expanded","false")}
function openSidebar(){sidebar?.classList.add("open");sidebarOverlay?.classList.add("open");sidebarOpen?.setAttribute("aria-expanded","true")}

document.querySelectorAll(".sidebar-link").forEach(link=>link.addEventListener("click",()=>{
  if(link.classList.contains("nav-disabled")){showDashboardMessage("Complete KYC verification to unlock protected member services.","error");closeSidebar();document.getElementById("kycSection")?.scrollIntoView({behavior:"smooth",block:"start"});return}
  document.querySelectorAll(".sidebar-link").forEach(x=>x.classList.remove("active"));link.classList.add("active");
  const target=document.getElementById(link.dataset.target);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});closeSidebar();
}));
sidebarOpen?.addEventListener("click",openSidebar);sidebarClose?.addEventListener("click",closeSidebar);sidebarOverlay?.addEventListener("click",closeSidebar);
retryButton?.addEventListener("click",loadDashboard);kycForm?.addEventListener("submit",submitKyc);

async function logout(){
  [logoutButton,sidebarLogoutButton].forEach(x=>{if(x){x.disabled=true;x.textContent="Logging out…"}});
  try{await auth("logout",{method:"POST"});window.location.replace("/login.html")}
  catch(error){[logoutButton,sidebarLogoutButton].forEach(x=>{if(x){x.disabled=false;x.textContent="Logout"}});showDashboardMessage(error.message||"Logout failed.","error")}
}
logoutButton?.addEventListener("click",logout);sidebarLogoutButton?.addEventListener("click",logout);
loadDashboard();
