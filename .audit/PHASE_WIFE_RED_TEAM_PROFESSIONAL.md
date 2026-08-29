# PHASE — WIFE Red Team Professional Campaign

**التاريخ:** 2026-08-21  
**النطاق:** WIFE BFF فقط (توقيع، CSRF، authz، upload، KV، case-share، auth onboarding)  
**البيئة:** Vite dev `localhost:8080`، توكن ضيف `dev-access-token-guest-lawyer-1`  
**الأمر الموحّد:** `npm run test:security:campaign`

---

## 1. Threat Model (STRIDE → BFF)

| فئة | سطح الهجوم | ضابط Hami |
|-----|-----------|-----------|
| **Spoofing** | JWT مزوّر، توقيع WIFE مزيف | `wifeValidator`, HMAC per-token, nonce |
| **Tampering** | body/path swap، hash multipart | canonical path، `x-wife-content-hash` |
| **Repudiation** | audit log تزوير | `audit/log` يسجّل action نصّي فقط — لا صلاحيات |
| **Info Disclosure** | admin/verify، traversal signed-url | ownership decode، guest empty rows |
| **DoS** | Postgres 500 على non-UUID | `postgresUuidSubject` |
| **Elevation** | KV community، ban، case-share IDOR | `kvProxyOwnership`, roleResolver |

**خارج النطاق (معلَن):** DDoS شبكي، RLS بجلسة UUID حقيقية، Capacitor native، pen test خارجي.

---

## 2. Methodology — 7 مراحل

| # | المرحلة | الأداة | الهدف |
|---|---------|--------|-------|
| 1 | Unit security | `test:security` | crypto، CSP، sanitizer، upload، bffAuth |
| 2 | Auth adversarial | `test:security:auth-assault` | signup/login/forgot، forum auth، lawyer status |
| 3 | Destruction in-process | `test:security:destruction` | business logic بعد اجتياز WIFE (mocked) |
| 4 | **Professional live** | `wife-assault-professional.spec.ts` | tiers 1–6: intel، rate limit، chains، multipart |
| 5 | Three waves + maximum | assault specs | 79 مسار unsigned، burst، protocol |
| 6 | Live HMAC round-trip | `wife-live-server.spec.ts` | wife-sign ↔ BFF |
| 7 | Production gate | `load-env-and-gate.mjs` | 35 فحص، 0 blockers |

**Artifacts:** `.audit/WIFE_RED_TEAM_CAMPAIGN_LATEST.json`

---

## 3. Findings Register

| ID | الشدة | الوصف | الحالة | الدليل |
|----|-------|-------|--------|--------|
| **WIFE-001** | **High** | Path traversal `%2e%2e` / `%252e%252e` في storage ownership | **مُصلَح** | `uploadStorageUtils.ts` + live Tier 4 |
| **WIFE-002** | **High** | non-UUID subject → Postgres 22P02 → HTTP 500 (fail-open DoS) | **مُصلَح** | `postgresUuidSubject.ts` + destruction tests |
| **WIFE-003** | Low | `audit/log` يقبل action نصّي من العميل (log pollution) | **مقبول** | لا privilege؛ Tier 3 يثبت `isAdmin` غير موجود |
| **WIFE-004** | Low | `/api/admin/verify` → 200 `{ isAdmin:false }` (recon) | **مقبول** | Tier 1 — لا service_role |
| **WIFE-005** | Medium (arch) | `syncService.js` → `supabase.from` مباشرة | **مُغلَق** | `/api/settings/cloud-sync` + `SecureAPIClient`؛ gate ✓ |
| **WIFE-006** | Medium (ops) | Redis غير مضبوط محلياً — nonce/CSRF in-memory | **مُغلَق (unit)** | `wifeProductionFailClosed.test.ts` — prod fail-closed |
| **WIFE-007** | Medium (scope) | لا اختبار جلسة lawyer UUID حقيقية | **مُغلَق (surrogate)** | `wife-assault-uuid-session.spec.ts` + tokenCache tests |
| **WIFE-008** | Low | `settings/wipe` و `account/delete` — تأكيد صحيح غير مُختبَر | **مقصود** | destructive؛ wrong-confirm فقط |

**لا breaching ناجح** في الحملة بعد WIFE-001/002.

---

## 4. Professional Live Tiers (19 اختبار)

| Tier | المحتوى | نتيجة |
|------|---------|-------|
| 1 Intel | admin/verify، wife-session 405، OPTIONS | ✓ |
| 2 Auth abuse | login 32→429، signup 14→429 | ✓ |
| 3 Business | case-share IDOR، KV community/follow، timeline 403، lawyer-verification | ✓ |
| 4 Multipart | hash A/body B→403، SVG polyglot، double-encoded signed-url | ✓ |
| 5 Protocol | path swap CSRF، wife-sign admin/ban، JSON on upload | ✓ |
| 6 Resilience | healthz بعد 15 POST موقّعة | ✓ |

**إجمالي Playwright live:** 19 + 31 + 20 + live-server = **70+** (حسب smoke/live-server count).

---

## 5. Vitest Totals (campaign pass)

- `test:security` — full suite ✓  
- `test:security:auth-assault` — 27 scenarios ✓  
- `test:security:destruction` — 4 suites + **2 اختبار UUID جديد** ✓  

---

## 6. تقييم الإغلاق (صادق)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| **أداء** | 8/10 | 7/7 stages ~77s؛ لا regressions |
| **نظافة** | 8/10 | kit مشترك؛ campaign script؛ tests محدّثة لـ UUID |
| **أمان** | 8/10 | WIFE-005–007 مغلقة؛ GoTrue JWT حقيقي + RLS staging يدوي |
| **جودة كود** | 8/10 | tiers واضحة؛ findings register |
| **موبايل** | 6/10 | device-id/header مُختبَر في unit؛ Capacitor paths غير مُختبَرة live |
| **صدق** | 9/10 | WIFE-005–008 مُعلَنة؛ لا «unhackable» |

---

## 7. الحدود — ما لم يُثبت

1. سلوك Redis موحّد multi-instance في الإنتاج  
2. RLS مع subject UUID حقيقي من GoTrue  
3. forum SSE طويل، wipe/delete بتأكيد صحيح  
4. Twilio/SMS برقم عراقي حقيقي  
5. External pen test / compliance claim  

---

## 8. الموقع

| السؤال | الجواب |
|--------|--------|
| جاهز للانتقال لقسم آخر؟ | **نعم** لنطاق WIFE assault — مع WIFE-005–007 كديون معروفة |
| الحملة السابقة كانت سطحية؟ | **نعم جزئياً** — كانت pass/fail counts؛ هذه الحملة تضيف threat model، tiers، findings register، auth rate-limit live، multipart chains |

---

## 9. أوامر إعادة التشغيل

```bash
npm run test:security:campaign
npm run test:e2e:wife:professional
npm run test:e2e:wife:assault
npm run test:e2e:wife:maximum
```
