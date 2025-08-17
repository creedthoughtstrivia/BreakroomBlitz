# Changelog

All notable changes to this project will be documented in this file.

## [2025-08-16] - Stabilize release

### Added
- **Session‑based admin gate**: implemented a lightweight passcode gate using
  `sessionStorage` and a new `js/admin-gate.js` script.  Admin pages now
  prompt for a passcode once per session, store the authentication flag
  client‑side and provide an *Admin Logout* link in the navigation.
- **Environment template**: added `.env.example` documenting the
  `ADMIN_PASSCODE` variable required for admin authentication.
- **Documentation**: updated `README.md` with quick start instructions,
  admin usage notes and environment variable configuration.

### Fixed
- **Solo mode initialization**: Solo play now loads question packs correctly
  by including `packs/index.js` before `config.js`.  The first question renders
  immediately upon clicking *Start Quiz*.
- **Live mode pack selector**: the question set dropdown in live mode is now
  populated only when packs exist and is hidden otherwise.
- **Navigation security**: non‑authenticated users no longer see the
  *Admin* link.  Attempting to access `/admin.html` without a valid passcode
  keeps sensitive cards hidden and displays an error message.