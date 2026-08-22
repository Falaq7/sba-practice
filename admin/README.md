# SBA Workspace account recovery

This owner-only utility changes a locked-out learner's PIN without deleting their account or question banks. It also marks the temporary PIN for replacement at the next sign-in.

## One-time preparation

1. In Firebase Console, open **Project settings → Service accounts**.
2. Generate a new private key and store the downloaded JSON somewhere private outside this repository.
3. Never upload, share or commit that JSON file.
4. Install Node.js 22 or newer, then run `npm install` in the project folder.

## Reset a PIN

Open PowerShell in the project folder and run:

```powershell
$env:SBA_FIREBASE_ADMIN_KEY='C:\private\location\sba-workspace-admin.json'
npm run admin:reset-pin
```

Enter the exact username, a temporary four-digit PIN (or press Enter for `1234`), and the displayed confirmation. Verify the requester's identity before resetting an account.

The private key grants administrator access. If it is ever exposed, delete it immediately from **Google Cloud Console → IAM & Admin → Service Accounts → Keys** and generate a replacement.
