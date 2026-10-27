# Security policy

## Supported deployment

Security fixes are applied to the latest deployed version of NexDesk.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature for this repository, or contact the repository owner directly. Include reproduction steps, impact, and any proof of concept.

## Secret handling

Set `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and `TOKEN_ENCRYPTION_KEY` with `wrangler secret put`. Never place them in source files, screenshots, issues, or commits. Rotate a credential immediately if it is exposed.
