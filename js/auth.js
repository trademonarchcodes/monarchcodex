const form = document.getElementById("registerForm");
const message = document.getElementById("formMessage");
const params = new URLSearchParams(window.location.search);
const loginMode = params.get("mode") === "login";

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

async function sendAuth(action, payload) {
  const response = await fetch(`api/auth.php?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Authentication failed.");
  }

  return result;
}

if (form && message) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage("");

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

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

      if (loginMode) {
        window.location.href = "register.html";
      } else {
        form.reset();
        window.history.replaceState({}, "", "register.html");
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  });
}

if (loginMode) {
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