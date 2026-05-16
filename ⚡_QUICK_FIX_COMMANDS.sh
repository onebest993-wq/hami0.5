#!/bin/bash

# ⚡ أوامر الإصلاح السريع
# لتنفيذ الإصلاحات الحرجة بسرعة

echo "🚀 بدء الإصلاحات الحرجة..."

# ===========================
# 1. ترقية TypeScript
# ===========================
echo "📦 ترقية TypeScript..."
npm install -D typescript@latest

echo "✅ TypeScript version:"
npx tsc --version

# ===========================
# 2. حذف الملف الميت
# ===========================
echo "🗑️ حذف الملف الميت..."
rm -f src/app/components/lawyer/ExecutionDashboard_FIXED.tsx
echo "✅ تم حذف ExecutionDashboard_FIXED.tsx"

# ===========================
# 3. عرض console.* statements
# ===========================
echo "🔍 البحث عن console statements..."
echo "عدد console.log:"
grep -r "console\.log" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "عدد console.error:"
grep -r "console\.error" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "عدد console.warn:"
grep -r "console\.warn" src/ --include="*.tsx" --include="*.ts" | wc -l

# ===========================
# 4. عرض useState<any>
# ===========================
echo "🔍 البحث عن useState<any>..."
grep -r "useState<any>" src/ --include="*.tsx" --include="*.ts"

# ===========================
# 5. عرض as any
# ===========================
echo "🔍 البحث عن as any..."
grep -r "as any" src/ --include="*.tsx" --include="*.ts" | wc -l

# ===========================
# 6. عرض TODO/FIXME
# ===========================
echo "🔍 البحث عن TODO/FIXME..."
grep -r "TODO\|FIXME\|HACK\|XXX\|BUG" src/ --include="*.tsx" --include="*.ts" | head -20

# ===========================
# 7. تحديث المكتبات
# ===========================
echo "📦 عرض المكتبات القديمة..."
npm outdated

# ===========================
# 8. فحص TypeScript
# ===========================
echo "🔍 فحص أخطاء TypeScript..."
npx tsc --noEmit

# ===========================
# 9. npm audit
# ===========================
echo "🔒 فحص الأمان..."
npm audit

echo "✅ انتهى الفحص!"
echo ""
echo "📋 التقرير:"
echo "============"
echo "✅ TypeScript updated"
echo "✅ Dead file removed"
echo "⚠️ Console statements: تحتاج تنظيف يدوي"
echo "⚠️ useState<any>: تحتاج تنظيف يدوي"
echo "⚠️ as any: تحتاج تنظيف يدوي"
echo ""
echo "📖 راجع /🔧_CRITICAL_FIXES_ROADMAP.md للتفاصيل الكاملة"

