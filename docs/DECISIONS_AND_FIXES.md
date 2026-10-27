# Decisions and fixes

This document records production issues encountered during the Cloudflare migration and the fixes that remain in the codebase.

| Problem | Cause | Implemented fix |
| --- | --- | --- |
| Google sign-in returned `redirect_uri_mismatch` | Google OAuth did not have the exact Pages callback URL. | The deployment guide specifies the exact authorized origin and callback URI. |
| Google returned a tester access error | The OAuth consent screen was still in Testing mode. | Added a production OAuth checklist: add test users while testing, then publish and complete verification as needed. |
| The app felt slow with a large history | Rendering the full history list made the page grow without bound. | D1 pagination uses `limit` and `offset`; filters are applied before pagination. |
| Sheets should not be the query database | Reading a spreadsheet for every dashboard or filter interaction is slow and fragile. | D1 is the primary store; Sheets is a synced copy. |
| New users had no spreadsheet | A sheet was expected to exist manually. | The Worker searches for the user's spreadsheet and creates `ShiftLog Records` with the `Records` tab when absent. |
| Suggestions leaked across accounts | Suggestion queries were not sufficiently tenant-scoped. | Suggestions are filtered by the signed-in user before ranking and returning results. |
| Autocomplete menus were clipped | A parent container constrained the visual overlay. | The add-record UI allows the suggestion list to remain visible above the form. |
| Users were asked to sign in too frequently | Session lifetime was too short and expiry was not explicit. | The signed HTTP-only session cookie now has a 90-day `Max-Age` and `Expires` value. |
| Visiting `/` while already signed in was unnecessary | The landing page did not inspect the existing session. | The landing page checks the session and redirects an authenticated user to the dashboard. |
| Static export returned 404 for Next RSC paths | Pages routing did not map the static export paths. | The Pages `_redirects` configuration handles the exported app routes. |
| Native browser confirmation was inconsistent with the UI | History deletion used `window.confirm`. | Record deletion now uses an accessible in-app Cancel/Delete dialog. |
| PDF output looked like an application report | Extra styling and wrapping made it harder to scan. | Export uses a generic table with single-line column headings. |

## Operating constraints

- OAuth client secrets, session secrets, encryption keys, and tokens belong in Cloudflare Worker secrets only.
- Forks must create their own D1 database, Worker, Pages project, and Google OAuth client.
- A Google Sheets sync may be marked pending or failed if Google is unavailable; the D1 record remains safely stored.
