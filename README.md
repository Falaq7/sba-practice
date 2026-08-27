# SBA Workspace

An AI-ready browser workspace for creating, practising and sharing single-best-answer question banks. Use the included BM4 collection, build your own questions, or turn generated material into a structured practice bank.

## Features

- Instant feedback or answers revealed at the end of a session
- Timed and untimed assessments with custom question selections
- Editable questions, answer options, feedback, media and formatting
- Deep Review panels with key clues, positive and negative pointers, highlighted phrases and expanded teaching notes
- AI-ready JSON workflow with both file upload and paste-in import
- Standardised reporting categories to keep progress data consistent across banks
- Attempt history, confidence tracking, focused retries and progress reports
- Private online banks with optional publishing to the Community Library
- Community filtering by category weighting and author
- Broad website-usage analytics with a Settings opt-out

## AI and JSON workflow

SBA Workspace is designed to work with questions produced by any capable AI tool rather than depending on one provider.

1. Use AI Bank Builder to create a prompt containing an import-ready JSON template.
2. Give that prompt to any capable AI so it populates the template and returns JSON only.
3. Paste the completed JSON directly or import a downloaded `.json` file.
4. Review and edit every field, then keep the bank private, export it, or publish it.

The format supports question stems, answer options, explanations, categories, references, media and structured Deep Review content. Imported banks are validated before they are added.

## Using the workspace

Open the deployed site, choose a bank and start an assessment or custom practice session. Signing in keeps private banks connected to the learner's workspace and allows selected banks to be shared publicly.

Community banks are supplied by their authors and may contain incomplete or outdated medical information. Verify clinical guidance, doses and thresholds against current authoritative sources.

## Viewing website analytics

Open the `sba-workspace` project in the [Firebase console](https://console.firebase.google.com/project/sba-workspace/analytics), then use **Analytics → Dashboard** for visitors and engagement or **Analytics → Events** for feature usage. The tracked events cover workspace sections, session starts and completions, Deep Review opens, AI prompt copies, question-bank imports and community-bank additions.

Analytics is enabled by default so overall use of the website can be measured without adding another popup. The site's custom events do not include usernames, PINs, question text, answers, bank titles or author names. Visitors can turn it off or back on from **Settings → Basic usage analytics**.

## Development

Build the standalone page with:

```powershell
node build_mock.js
```

Then serve the folder over HTTP and open `index.html`. The GitHub Actions workflow rebuilds and deploys the site whenever `main` changes.

Firebase configuration and maintainer recovery notes are kept in the project setup files and [`admin/README.md`](admin/README.md).

