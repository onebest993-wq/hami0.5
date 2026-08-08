# ترويسات التخزين عند نشر Vite (`dist/`)

الهدف: **`index.html` دائماً قابل للتحقق** (تحديث التطبيق)، و**أصول الـ hash طويلة الأمد** (أقل تحميل متكرر).

## Netlify

المشروع يتضمن **`public/_headers`** (يُنسَخ إلى جذر `dist/` مع البناء). يمكنك تعديله حسب `base` أو مسار الاستضافة:

```http
/index.html
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

عدّل المسارات إن كان `base` في Vite غير `/`.

## Cloudflare Pages

في **Headers** (Transform Rules أو `_headers` حسب الإعداد)، نفس المنطق أعلاه.

## nginx (مثال)

```nginx
location = /index.html {
    add_header Cache-Control "no-cache";
}

location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## ملاحظة

- عدم تخزين `index.html` طويلاً يعني أن المتصفح يعيد التحقق من الصفحة؛ **الحزم المُسمّاة بالـ hash** هي التي تُخزَّن بقوة.
- إن استخدمت مساراً لـ SPA بدون hash في أسماء الملفات، لا تطبّق `immutable` على JS/CSS غير المُسمّى بـ hash.
