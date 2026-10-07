const memberName = document.getElementById("memberName");
const memberUid = document.getElementById("memberUid");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileUid = document.getElementById("profileUid");
const profileRole = document.getElementById("profileRole");
const sidebarMemberName = document.getElementById("sidebarMemberName");
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");
const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");
const retryButton = document.getElementById("retryButton");
const sidebar = document.getElementById("dashboardSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarOpen = document.getElementById("sidebarOpen");
const sidebarClose = document.getElementById("sidebarClose");

function showDashboardMessage(text, type = "") {
  if (!dashboardMessage) return;
  dashboardMessage.textContent = text;
  dashboardMessage.dataset.type = type;
}

async function api(action, options = {}) {
  const response = await fetch(`/api/auth.php?action=${encodeURIComponent(action)}`, {
    ...options,
    headers: {"Accept":"application/json", ...(options.headers || {})},
    credentials: "same-origin",
    cache: "no-store"
  });

  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : null; }
  catch { throw new Error(`Server returned an invalid response (HTTP ${response.status}).`); }

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Request failed (HTTP ${response.status}).`);
  }
  return result;
}

function showWelcomeMessage(user) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("welcome") !== "1") return;
  const name = user?.name || "Member";
  showDashboardMessage(`Account created successfully! Welcome to MONARCH CODEX, ${name}.`, "success");
  window.history.replaceState({}, "", "dashboard.html");
}

function renderUser(user) {
  const name = user?.name || "Member";
  const uid = user?.uid || "—";
  const email = user?.email || "—";
  const role = user?.role || "member";
  if (memberName) memberName.textContent = name;
  if (memberUid) memberUid.textContent = uid;
  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;
  if (profileUid) profileUid.textContent = uid;
  if (profileRole) profileRole.textContent = role;
  if (sidebarMemberName) sidebarMemberName.textContent = name;
}

async function loadDashboard() {
  if (retryButton) retryButton.hidden = true;
  showDashboardMessage("Loading your account…");
  try {
    const result = await api("me", { method: "POST" });
    renderUser(result.user);
    showWelcomeMessage(result.user);
    if (!new URLSearchParams(window.location.search).has("welcome")) showDashboardMessage("Account information loaded.", "success");
  } catch (error) {
    showDashboardMessage(error.message || "We could not load your account information.", "error");
    if (retryButton) retryButton.hidden = false;
  }
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("open");
  sidebarOpen?.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  sidebar?.classList.add("open");
  sidebarOverlay?.classList.add("open");
  sidebarOpen?.setAttribute("aria-expanded", "true");
}

document.querySelectorAll(".sidebar-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    const target = document.getElementById(link.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    closeSidebar();
  });
});

sidebarOpen?.addEventListener("click", openSidebar);
sidebarClose?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);
retryButton?.addEventListener("click", loadDashboard);

async function logout() {
  [logoutButton, sidebarLogoutButton].forEach((button) => {
    if (button) { button.disabled = true; button.textContent = "Logging out…"; }
  });
  try {
    await api("logout", { method: "POST" });
    window.location.replace("/login.html");
  } catch (error) {
    [logoutButton, sidebarLogoutButton].forEach((button) => {
      if (button) { button.disabled = false; button.textContent = "Logout"; }
    });
    showDashboardMessage(error.message || "Logout failed.", "error");
  }
}

logoutButton?.addEventListener("click", logout);
sidebarLogoutButton?.addEventListener("click", logout);

loadDashboard();
