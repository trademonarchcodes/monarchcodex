const form = document.getElementById("registerForm");
const message = document.getElementById("formMessage");

if (form && message) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const password = data.get("password");
    const confirmPassword = data.get("confirmPassword");

    if (password !== confirmPassword) {
      message.textContent = "Your passwords do not match.";
      return;
    }

    message.textContent = "Registration will be connected to secure account creation next.";
  });
}

const params = new URLSearchParams(window.location.search);
if (params.get("mode") === "login") {
  const heading = document.querySelector(".auth-card-head h2");
  const eyebrow = document.querySelector(".auth-card-head .eyebrow");
  const submit = document.querySelector(".auth-submit");
  const confirm = document.querySelector('input[name="confirmPassword"]')?.closest("label");
  const terms = document.querySelector(".auth-check");
  const divider = document.querySelector(".auth-divider");
  const login = document.querySelector(".auth-login");

  if (heading && eyebrow && submit && confirm && terms && divider && login) {
    eyebrow.textContent = "WELCOME BACK";
    heading.textContent = "Enter The Kingdom.";
    confirm.style.display = "none";
    terms.style.display = "none";
    submit.innerHTML = 'Login to My Account <span>→</span>';
    login.style.display = "none";
    divider.style.display = "none";
  }
}