# MONARCH CODEX

> Discover The Secret Of The King.

## Stable foundation

The current `main` branch is the frozen foundation for the public website and basic authentication flow.

### Working foundation
- Public MONARCH CODEX homepage
- Responsive navigation and mobile menu
- Dedicated registration page
- Dedicated login page
- Email + password login
- Password visibility controls
- Registration phone normalization
- Hostinger PHP authentication API
- MySQL/MariaDB connection through Hostinger
- Permanent MONARCH UID generation
- Session-based authentication
- Protected member dashboard
- Dashboard logout
- Safe public health check

### Current authentication path

`index.html` → `register.html` → `dashboard.html`

or

`index.html` → `login.html` → `dashboard.html`

The dashboard loads the authenticated account from `api/auth.php?action=me`. Unauthenticated visitors are returned to the login page.

### Important deployment rule

Do not make unrelated changes to the stable authentication, homepage, database bootstrap, or dashboard files while adding future features. Future features should be added incrementally and tested without replacing this foundation.

Database credentials remain Hostinger-only in `api/config.local.php`, which is ignored by Git.
