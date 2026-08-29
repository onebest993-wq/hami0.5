# AUTH ONBOARDING ADVERSARIAL ASSAULT — 2026-08-12

## Command
`npm run test:security:auth-assault`

## Core suite
`src/app/api/auth/adversarialAssault.test.ts` — 11 waves, plus related suites in `npm run test:security:auth-assault`.

| Wave | Target | Result |
|------|--------|--------|
| A | Credential weapons (email/password/phone/XSS) + BFF reject | PASS |
| B | Signup metadata privilege escalation | PASS — role forced lawyer, pending |
| C | KYC skip → forum | PASS — fail-closed |
| D | Forge verification / OCR + no demotion of active | PASS |
| E | Password-reset open redirect | PASS |
| F | Admin ban abuse (role write / no revoke / self-ban) | PASS |
| G | Client gates (terms / grandfather / guest / admin bypass) | PASS |
| H | Password spray + signup flood | PASS |
| I | Redirect allowlist matrix | PASS |
| J | Hidden onboarding gaps (login demotion, HQ directory fallback, forum vs app_metadata) | PASS |
| K | Resubmit / demotion / stale rejection | PASS |

## Extra finding during assault setup
`lawyer-verification/route.ts` imported `../security/*` (resolves to nonexistent `api/auth/security`). Fixed to `../../security/*`. Without this fix the verification BFF module could not resolve in Vitest (and was path-broken relative to disk layout).

## Honesty limits
- White-box against repo code with mocked GoTrue/KV — not live remote pentest.
- `authAdminBypassLogin` still works in DEV test builds; production APK must ship `import.meta.env.DEV === false`.
- Self-unban RLS freeze still requires applying migration `20260812000001_...` on Supabase.
