# Hami Legal App — Architecture Reference

> مرجع المعمارية للعمل أو استئنافه عبر AI

---

## 1. هيكل المشروع

```
src/
├── app/
│   ├── App.tsx              # نقطة الدخول + routing
│   ├── components/           # المكونات
│   │   ├── SharedComponents  # PageWrapper, GlassCard, GoldButton
│   │   ├── ui/               # Button, Card, Dialog, Input...
│   │   ├── lawyer/           # LawyerDashboard, ExecutionDashboard...
│   │   ├── admin/            # AdminDashboard, WIFEMonitor
│   │   ├── figma/            # ImageWithFallback
│   │   └── shared/           # GlobalErrorBoundary, BackButton...
│   ├── context/             # AuthContext, AppContext, AIGuardian
│   ├── hooks/                # useCloudSync, useAuthState, useSecureLogout...
│   ├── stores/               # Zustand: appStore, caseStore, executionFormStore...
│   ├── services/             # DataService, SupabaseService, AuthService...
│   ├── animations/           # transitions.ts
│   └── utils/
├── styles/                   # index.css, theme.css, tailwind.css, fonts.css
├── utils/                    # legalKnowledgeBase, supabase/info (مفاتيح Supabase في src/utils/supabase/info.ts)
└── core/legal/               # IraqiInheritanceLogic, LiabilityCalculator
```

---

## 2. Routing (بدون React Router)

| Screen      | Component      | Load   |
|------------|----------------|--------|
| splash     | SplashScreen   | Eager  |
| auth       | AuthScreens    | Eager  |
| lawyer     | LawyerDashboard| Eager  |
| profile, admin, settings, privacy, support | Lazy | Suspense |

---

## 3. Design Tokens

| Token   | Value        | Usage           |
|---------|-------------|-----------------|
| bg      | #05060D     | Background      |
| gold    | #E6C673     | Accents, buttons|
| emerald | rgb(52,211,153) | Success    |
| amber   | rgb(251,191,36) | Highlights  |

**Fonts:** Tajawal (primary), Cairo (secondary), Traditional Arabic (fallback)

---

## 4. Import Aliases

| Alias   | Path   |
|---------|--------|
| @/      | src/   |
| @/app   | src/app|

**مطلوب:** استخدم `@/utils/supabase/info` لبيانات Supabase (وليس مسار نسبي أو `/utils/...`).

---

## 5. الخدمات (v2.0)

- **مفعّل:** DataService, SupabaseService, CryptoService, AuthService, CacheService
- **محذوف:** AlternativePrivacyProtocol, WebAuthn, figma:asset

---

## 6. Error Boundaries

- **GlobalErrorBoundary** — المستوى الأعلى
- **LawyerDashboardErrorBoundary** — داخل LawyerDashboard
- **ExecutionErrorBoundary** — تنفيذ القضايا
- **MonitoringErrorBoundary** — مراقبة الأخطاء

---

## 7. Figma

- التطبيق يعمل داخل Figma Dev Mode / Make
- `logo-placeholders.tsx` بديل لـ figma:asset
- `ImageWithFallback` للصور الخارجية
- `PushNotificationService` يعطّل Service Worker في بيئة Figma

---

## 8. اختبار التطبيق

```bash
npm run dev      # تشغيل التطبيق
npm run build    # البناء
npm run test     # Vitest
```

---

*آخر تحديث: استئناف العمل من خلال Cursor AI*
