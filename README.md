# SBA Workspace

A browser-based workspace for creating, practising and sharing single-best-answer question banks. Use the included BM4 collection, build your own questions, or turn AI-generated material into a structured practice bank.

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

## AI and JSON workflow

SBA Workspace is designed to work with questions produced by any capable AI tool rather than depending on one provider.

1. Ask an AI to generate a bank using the workspace JSON format.
2. Paste the JSON directly or import a downloaded `.json` file.
3. Review and edit every field in the visual question editor.
4. Keep the bank private, export it, or publish it for other learners.

The format supports question stems, answer options, explanations, categories, references, media and structured Deep Review content. Imported banks are validated before they are added.

## Using the workspace

Open the deployed site, choose a bank and start an assessment or custom practice session. Signing in keeps private banks connected to the learner's workspace and allows selected banks to be shared publicly.

Community banks are supplied by their authors and may contain incomplete or outdated medical information. Verify clinical guidance, doses and thresholds against current authoritative sources.

## Development

Build the standalone page with:

```powershell
node build_mock.js
```

Then serve the folder over HTTP and open `index.html`. The GitHub Actions workflow rebuilds and deploys the site whenever `main` changes.

Firebase configuration and maintainer recovery notes are kept in the project setup files and [`admin/README.md`](admin/README.md).
