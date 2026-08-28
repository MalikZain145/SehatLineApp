# Versioning Guide

SehatLine uses **Semantic Versioning** — the international standard
(https://semver.org): **MAJOR.MINOR.PATCH**

- **MAJOR** (e.g. 1.x → 2.0.0) — breaking changes, big redesigns
- **MINOR** (e.g. 1.2 → 1.3.0) — new features, backwards-compatible
- **PATCH** (e.g. 1.2.0 → 1.2.1) — bug fixes, small tweaks

## How to bump the version on every update

Change the SAME number in **three** places so they stay in sync:

1. `src/constants/version.js` → `APP_VERSION`  ← the app reads this (shown on Welcome screen)
2. `package.json` → `"version"`
3. `app.json` → `expo.version`

Example: after adding a new feature, go from `1.2.0` to `1.3.0` in all three.

The Welcome screen shows the version automatically from `version.js`, so once
you bump that file the app updates everywhere it's displayed.

## Current version

**1.2.0** — auth module complete (signup, login, fingerprint, CNIC verify,
OTP forgot-password), domain validation, UI polish.
