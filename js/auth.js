const form = document.getElementById("registerForm");
const message = document.getElementById("formMessage");
const params = new URLSearchParams(window.location.search);
const isDedicatedLoginPage = window.location.pathname.endsWith("/login.html");
const hasRegistrationFields = Boolean(document.querySelector('input[name="confirmPassword"]'));
const loginMode = isDedicatedLoginPage || params.get("mode") === "login" || !hasRegistrationFields;

function showMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.dataset.type = type;
}

function setLoading(isLoading) {
  const submit = document.querySelector(".auth-submit");
  if (!submit) return;

  submit.disabled = isLoading;
  submit.setAttribute("aria-busy", String(isLoading));

  if (isLoading) {
    submit.dataset.originalText = submit.innerHTML;
    submit.innerHTML = loginMode ? "Signing in…" : "Creating account…";
  } else if (submit.dataset.originalText) {
    submit.innerHTML = submit.dataset.originalText;
  }
}

function setupPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach(toggle => {
    const togglePassword = () => {
      const field = toggle.closest(".password-field");
      const input = field?.querySelector("input");
      if (!input) return;

      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    };

    toggle.addEventListener("click", togglePassword);
    toggle.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePassword();
      }
    });
  });
}

function normalizePhone(value) {
  let phone = String(value || "").trim().replace(/[()\-\.]/g, " ").replace(/\s+/g, " ");
  if (phone.startsWith("00")) {
    phone = "+" + phone.slice(2);
  }
  return phone;
}

async function sendAuth(action, payload) {
  const response = await fetch(`/api/auth.php?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let result = null;

  try {
    result = raw ? JSON.parse(raw) : null;
  } catch {
    const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(
      cleaned
        ? `Server error (HTTP ${response.status}): ${cleaned.slice(0, 240)}`
        : `Server returned no valid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Authentication failed (HTTP ${response.status}).`);
  }

  return result;
}

if (form && message) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage("");

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const phone = normalizePhone(data.get("phone"));
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    // Login never checks confirmPassword because login only requires email + password.
    if (!loginMode && password !== confirmPassword) {
      showMessage("Your passwords do not match.", "error");
      return;
    }

    setLoading(true);

    try {
      const result = await sendAuth(loginMode ? "login" : "register", {
        name: String(data.get("name") || "").trim(),
        phone,
        email,
        password
      });

      showMessage(result.message, "success");

      form.reset();

      if (loginMode) {
        const role = result.user?.role || "member";
        window.location.assign(role === "admin" || role === "sovereign_admin" ? "/admin.html" : "/dashboard.html");
      } else {
        showMessage("Account created successfully! Welcome to MONARCH CODEX.", "success");
        setTimeout(() => {
          window.location.assign("/dashboard.html?welcome=1");
        }, 1000);
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  });
}

if (loginMode && window.location.pathname.endsWith("/register.html")) {
  const heading = document.querySelector(".auth-card-head h2");
  const eyebrow = document.querySelector(".auth-card-head .eyebrow");
  const submit = document.querySelector(".auth-submit");
  const confirm = document.querySelector('input[name="confirmPassword"]')?.closest("label");
  const terms = document.querySelector(".auth-check");
  const divider = document.querySelector(".auth-divider");
  const login = document.querySelector(".auth-login");
  const phone = document.querySelector('input[name="phone"]')?.closest("label");

  if (heading && eyebrow && submit && confirm && terms && divider && login) {
    eyebrow.textContent = "WELCOME BACK";
    heading.textContent = "Enter The Kingdom.";
    confirm.style.display = "none";
    terms.style.display = "none";
    submit.innerHTML = 'Login to My Account <span>→</span>';
    login.style.display = "none";
    divider.style.display = "none";
    if (phone) phone.style.display = "none";
  }
}

setupPasswordToggles();
