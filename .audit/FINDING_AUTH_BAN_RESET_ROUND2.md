# FINDING — Round 2 auth risks (ban self-restore, reset redirect, ban role writer)

**Date:** 2026-08-12  
**Status:** Mitigated in code (+ SQL migration pending apply)

## High (verified)

1. **Self-unban via profiles RLS** — UPDATE own row froze `role` only, not `is_banned`/`is_active`/`is_deleted`.  
   Fix: migration `20260812000001_freeze_profile_ban_flags_and_verification_meta.sql`

2. **Ban without session revoke** — `/api/admin/ban` set flags only.  
   Fix: revoke WIFE/CSRF/stolen-token sessions + GoTrue `ban_duration`

3. **Ban endpoint accepted arbitrary `updates` incl. `role`**  
   Fix: whitelist `is_banned|is_active|is_deleted|status|deleted_at`

4. **forgot-password `redirectTo` open redirect**  
   Fix: `passwordResetRedirectAllowlist.ts`

## Medium

5. Client KYC grandfather → fail-closed `pending`  
6. Signup forces `role`/`accountType` to lawyer|client only  
7. KYC preview must be image data-URL; client OCR fields ignored

## Ops

- Apply the new Supabase migration before relying on RLS freeze in production.
- Re-sync approved lawyers with `verificationStatus=active` / local store after client fail-closed.
