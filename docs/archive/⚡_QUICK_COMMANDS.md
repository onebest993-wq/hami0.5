# ⚡ الأوامر السريعة - Quick Commands

**الإصدار:** 3.0.0  
**التاريخ:** 16 مارس 2026

---

## 🚀 البدء السريع

```bash
# تثبيت التبعيات
npm install

# تشغيل التطبيق
npm run dev

# الوصول للتطبيق
http://localhost:5173
```

---

## 🔨 البناء - Build

```bash
# بناء عادي
npm run build

# بناء + تحليل Bundle (موصى به!)
npm run build:analyze

# معاينة البناء
npm run preview
```

---

## 🧪 الاختبارات - Testing

```bash
# Unit Tests
npm run test

# Test UI
npm run test:ui

# Test Coverage
npm run test:coverage

# Run all tests
npm run test:run

# E2E Tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed

# All Tests
npm run test:all
```

---

## ✅ فحص الجودة - Quality

```bash
# فحص جودة الكود (جديد!)
npm run quality:check

# سيُنشئ تقرير في:
# code-quality-report.json
```

---

## 📊 التحليل - Analysis

```bash
# تحليل Bundle
npm run build:analyze

# سيُنشئ:
# dist/stats.html (افتحه في المتصفح)
```

---

## 🛠️ أدوات إضافية

```bash
# تحليل ملف معين
npm run analyze:file

# معالجة دفعات
npm run batch:process

# Refactoring ذكي
npm run refactor

# اختبار شامل
npm run tools:test

# عرض المساعدة
npm run tools:help
```

---

## 📚 الاستيراد السريع

### Stores
```typescript
import { 
  useCaseStore, 
  useGhostStore, 
  useNotificationStore,
  useRagStore 
} from '@/app/stores';
```

### Lazy Components
```typescript
import { 
  LazyExecutionDashboard,
  LazyCompleteLawsuitSystem,
  LazySmartLegalConsultant,
  ModalLoadingFallback 
} from '@/app/utils/lazyComponents';
```

### Logger
```typescript
import { logger } from '@/app/utils/logger';

logger.log('dev only');    // يُزال في production
logger.error('kept');       // يبقى في production
```

### Performance Hooks
```typescript
import { 
  useDebounce, 
  useStableCallback,
  usePrevious,
  useRenderCount 
} from '@/app/utils/reactOptimizations';
```

---

## 🔍 التصحيح - Debugging

### في المتصفح:

```javascript
// في Chrome DevTools Console

// فحص الـ Stores
useCaseStore.getState()
useGhostStore.getState()

// فحص Performance
performance.getEntriesByType('measure')
```

---

## 📖 الوثائق السريعة

```bash
# افتح في المتصفح أو محرر النصوص

/START_HERE_V3.md              # ابدأ من هنا
/QUICK_DEVELOPER_GUIDE.md      # دليل المطور
/🎯_MISSION_ACCOMPLISHED.md    # ملخص الإنجاز
/FINAL_QUALITY_CHECKLIST.md   # قائمة الجودة
/CHANGELOG_V3.0.0.md           # سجل التغييرات
```

---

## 🚨 أوامر الطوارئ

```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install

# حذف cache
rm -rf dist .vite

# إعادة بناء كاملة
npm run build -- --force

# إعادة تشغيل مع cache نظيف
npm run dev -- --force
```

---

## 🎯 Workflow الموصى به

### للتطوير اليومي:
```bash
1. npm run dev
2. (تطوير...)
3. npm run quality:check
4. (إصلاح المشاكل إن وُجدت)
5. git commit
```

### قبل النشر:
```bash
1. npm run test:all
2. npm run quality:check
3. npm run build:analyze
4. npm run preview
5. (فحص يدوي)
6. git tag v3.0.0
7. git push --tags
```

---

## 💡 نصائح سريعة

### Vite Dev Server
```bash
# تشغيل على منفذ مخصص
npm run dev -- --port 3000

# تشغيل مع host معين
npm run dev -- --host 0.0.0.0

# تشغيل في وضع debug
npm run dev -- --debug
```

### Build Optimization
```bash
# بناء مع sourcemaps
npm run build -- --sourcemap

# بناء بدون minification (للتصحيح)
npm run build -- --minify false
```

---

## 🔧 متغيرات البيئة

### Development
```bash
# في .env.development
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

### Production
```bash
# في .env.production
VITE_API_URL=https://api.production.com
VITE_ENV=production
```

---

## 📊 الأداء - Performance Monitoring

### في الكود:
```typescript
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';

useEffect(() => {
  PerformanceMonitor.start('MyComponent');
  return () => PerformanceMonitor.end('MyComponent');
}, []);
```

### في Console:
```javascript
// قياس يدوي
performance.mark('start');
// ... code ...
performance.mark('end');
performance.measure('MyOperation', 'start', 'end');
```

---

## 🎨 التصميم - Styling

### Tailwind
```bash
# إعادة بناء CSS
npm run build:css (إن وُجد)

# فحص classes غير المستخدمة
npx tailwindcss-analyzer
```

---

## 🐛 حل المشاكل السريع

### المشكلة: Port محجوز
```bash
# استخدم منفذ آخر
npm run dev -- --port 3000
```

### المشكلة: ENOSPC
```bash
# زيادة file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### المشكلة: Out of Memory
```bash
# زيادة memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 🎯 الاختصارات - Shortcuts

### Git
```bash
alias dev="npm run dev"
alias build="npm run build:analyze"
alias test="npm run test:all"
alias check="npm run quality:check"
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:analyze": "vite build --mode analyze",
    "quality:check": "npx tsx scripts/code-quality-check.ts",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

---

## 📞 مراجع سريعة

### الوثائق الرئيسية:
- **START_HERE_V3.md** - ابدأ من هنا
- **QUICK_DEVELOPER_GUIDE.md** - دليل المطور
- **⚡_QUICK_COMMANDS.md** - هذا الملف

### الأدوات:
```bash
npm run quality:check    # ✅ فحص الجودة
npm run build:analyze    # 📊 تحليل Bundle
npm run test:all         # 🧪 اختبار شامل
```

---

## 🎉 الخلاصة

### الأوامر الأساسية:

```bash
npm install           # مرة واحدة
npm run dev          # للتطوير
npm run quality:check # للتحقق
npm run build:analyze # للبناء
npm run test:all     # للاختبار
```

---

**⚡ كل ما تحتاجه في ملف واحد!**

---

**التاريخ:** 16 مارس 2026  
**الإصدار:** 3.0.0 - النسخة الذهبية
