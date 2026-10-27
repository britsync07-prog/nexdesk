# Cloudflare deployment

NexDesk runs as a static Next.js export on Cloudflare Pages. Same-origin `/api/*` requests are proxied by a Pages Function to the `nexdesk-api` Worker, which owns authentication, D1 access, and Google APIs.

## Live resources

- Pages: `https://nexdesk-d3t.pages.dev`
- Worker: `https://nexdesk-api.mehedy303.workers.dev`
- D1 binding: `DB` → `nexdesk-db`

Cloudflare assigned the Pages domain with the `-d3t` suffix. A `pages.dev` hostname cannot be manually aliased; use a custom domain if the exact `nexdesk.pages.dev` hostname is mandatory and available to the account.

## Worker secrets

Configure these with `wrangler secret put <NAME> --config worker/wrangler.jsonc`:

```text
APP_ORIGIN=https://nexdesk-d3t.pages.dev
SESSION_SECRET=<random 32+ character value>
TOKEN_ENCRYPTION_KEY=<different random 32+ character value>
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
```

The first three are already set. Google secrets must be current, rotated credentials and are intentionally not stored in the repository.

## Google Cloud OAuth setup

Enable Google Drive API and Google Sheets API. Add these exact values to the OAuth web client:

- Authorized JavaScript origin: `https://nexdesk-d3t.pages.dev`
- Authorized redirect URI: `https://nexdesk-d3t.pages.dev/api/auth/google/callback`

## Release and verification

```powershell
npm run build
npx wrangler deploy --config worker/wrangler.jsonc
npx wrangler pages deploy out --project-name nexdesk --branch main
```

Verify:

```powershell
Invoke-WebRequest https://nexdesk-d3t.pages.dev/api/health
```

Expected response: `{"status":"ok"}`.

After OAuth is configured, verify Google sign-in, record CRUD, custom columns, Sheets creation, sync/import, PDF export, and logout.
