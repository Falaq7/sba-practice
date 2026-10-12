# BM4 SBA Practice

Live site: https://falaq7.github.io/sba-workspace/

The current public app lives in `src/public`, shared logic and styles in `src/shared`, and the separately built publishing studio in `src/studio`. Older root-level app files are retained for history; GitHub Pages builds the current source.

## Build and check

Use Node 24:

```
node scripts/build-sites.cjs
node --test tests/*.test.mjs
```

The build writes `dist/public` and `dist/studio`. GitHub Actions publishes **only** `dist/public` when `main` changes. The studio is not included in the Pages artifact.

## Question banks and guest data

`content/library.json` contains the five public Year 1 banks, 70 questions each, including their investigation images and teaching feedback. The bundle has no learner accounts, attempts, reports or private drafts. These bundled bank versions remain available independently of Firebase; update this file and deploy to revise them. Additional Firebase-published collections can appear alongside them.

Guests can practise without signing in. Their progress and personal banks remain in that browser's device storage; use the app's backup/download controls to keep a copy. Data from a local preview URL does not automatically transfer to the hosted site's different origin.

## Optional Firebase features

Account sign-in, cross-device sync, community sharing and sending inaccuracy reports use the configured Firebase project. GitHub Pages deployment does not deploy Firestore rules or Cloud Functions, grant publisher access, or change Firebase authentication settings. Those services require their own setup and validation; the public question banks do not depend on them.

Never commit service account keys, user backups, `.preview`, or local report data. `firebase-config.js` contains public client identifiers, not admin credentials.
