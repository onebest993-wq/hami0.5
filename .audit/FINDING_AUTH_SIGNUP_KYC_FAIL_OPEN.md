# FINDING — Auth signup / KYC fail-open (هجمة تسجيل)

**Date:** 2026-08-12  
**Severity (pre-fix):** Critical  
**Status:** Mitigated in code (forum fail-closed + signup pending seed + credential rules + ID front required)

## Realistic attack chain (white-box)

1. Attacker skips `LawyerRegisterWizard` / terms / OCR UI.
2. Calls `POST /api/auth/signup` with email+password (previously only `password.length >= 8`).
3. Receives real session cookies when GoTrue accepts.
4. **Pre-fix:** Forum `requireForumAuth` only blocked when a KV verification record existed with `pending|rejected`. **Missing KV = allow.**
5. Client `resolveLawyerVerificationStatus` grandfathered missing local record as `active`.

Result: appear as an official lawyer on network forum surfaces without KYC.

## Fixes landed

| Area | Change |
|------|--------|
| `api/forum/_auth.ts` | No KV / non-active / KV error → deny (403/503) |
| `api/auth/signup/route.ts` | Trusted email + secure password; force `verificationStatus: pending`; `kvSet` pending row |
| `api/auth/lawyer-verification/route.ts` | Require ID front preview |
| `authProviderRuntime.ts` | `authAdminBypassLogin` DEV-only |

## Residual honesty

- Legal terms gate remains client-side (API can skip UI).
- Client grandfather for accounts with **no** metadata still `active` in UI; **server forum** is authority.
- Existing production lawyers without KV rows need a one-time `active` migration or they lose forum until approved.
