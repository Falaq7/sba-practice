# SBA Workspace

A portable SBA practice workspace with local guest mode, editable JSON question banks, optional four-digit accounts and an opt-in Community Library.

## What is included

- Instant or end-of-session feedback
- Deep Review teaching panels
- Editable and importable question banks
- Canonical reporting categories
- Local attempt history and progress reports
- Optional Firebase accounts with private online banks
- Published community banks with category weighting and author filters

## Four-digit accounts

Accounts are intentionally low stakes. Learners choose a username and a four-digit PIN. The browser expands that PIN into a Firebase-compatible credential; the PIN is never stored in Firestore. Signed-in learners can change their PIN, and the owner can issue a temporary PIN with the private utility in `admin/`. Learners should still export important banks as JSON and must not reuse a sensitive PIN.

## Firebase setup

1. Create a Firebase project and add a Web app.
2. In Authentication, enable **Email/Password**.
3. Create a Cloud Firestore database.
4. Replace the placeholders in `firebase-config.js` with the Web app configuration.
5. Deploy `firestore.rules` using the Firebase CLI or paste the rules into the Firebase console.
6. Add the GitHub Pages domain to Authentication → Settings → Authorized domains.

The Firebase Web configuration is public by design. Access control is enforced by `firestore.rules`. Administrator service-account keys are private and must never be added to the repository.

## Build locally

```powershell
node build_mock.js
```

Serve this folder over HTTP and open `index.html`. Opening the file directly may prevent the Firebase modules from loading.

## Publishing

The GitHub Actions workflow rebuilds and deploys the site whenever `main` changes. Enable GitHub Pages with **GitHub Actions** as its source in the repository settings.

## Educational use

Community question banks are supplied by their authors and may contain incomplete or outdated medical information. Verify clinical guidance, doses and thresholds against current authoritative sources.
