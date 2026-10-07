const memberName = document.getElementById("memberName");
const memberUid = document.getElementById("memberUid");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileUid = document.getElementById("profileUid");
const profileRole = document.getElementById("profileRole");
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");

function showDashboardMessage(text, type = "") {
  if (!dashboardMessage) return;
  dashboardMessage.textContent = text;
  dashboardMessage.dataset.type = type;
}

async function api(action, options = {}) {
  const response = await fetch(`api/auth.php?action=${encodeURIComponent(action)}`, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options.headers || {})
    },
    credentials: "same-origin"
  });

  const raw = await response.text();
  let result;

  try {
    result = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Request failed (HTTP ${response.status}).`);
  }

  return result;
}

function renderUser(user) {
  const name = user?.name || "Member";
  const uid = user?.uid || "—";
  const email = user?.email || "—";
  const role = user?.role || "member";

  memberName.textContent = name;
  memberUid.textContent = uid;
  profileName.textContent = name;
  profileEmail.textContent = email;
  profileUid.textContent = uid;
  profileRole.textContent = role;
}

async function loadDashboard() {
  try {
    const result = await api("me");
    renderUser(result.user);
  } catch (error) {
    window.location.replace("login.html");
  }
}

logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out…";

  try {
    await api("logout", { method: "POST" });
    window.location.replace("login.html");
  } catch (error) {
    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
    showDashboardMessage(error.message, "error");
  }
});

loadDashboard();