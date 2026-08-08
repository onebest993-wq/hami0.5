# 🔙 دليل إيماءات التنقل والرجوع

## نظرة عامة

تم إضافة دعم شامل لإيماءات الرجوع والتنقل في نظام "ملف الدعوى الذكي" ليوفر تجربة أصيلة (native) على جميع المنصات.

---

## ✅ المميزات المدعومة

### 1. **متصفحات الويب (Desktop & Mobile)**
- ✅ زر الرجوع في المتصفح (Browser Back Button)
- ✅ اختصارات لوحة المفاتيح (Alt+Left / Backspace)
- ✅ تكامل كامل مع Browser History API

### 2. **أجهزة Android**
- ✅ زر الرجوع الفيزيائي (Hardware Back Button)
- ✅ إيماءة السحب للرجوع (Swipe Back Gesture)
- ✅ دعم PWA وتطبيقات الويب التقدمية

### 3. **أجهزة iOS**
- ✅ إيماءة السحب من الحافة اليسرى (Edge Swipe)
- ✅ التكامل مع Safari و PWA
- ✅ تجربة مشابهة للتطبيقات الأصلية

### 4. **مميزات إضافية**
- ✅ سجل تنقل كامل (Navigation History Stack)
- ✅ تأكيد الخروج عند الشاشة الرئيسية
- ✅ دعم State Persistence
- ✅ Debug Logging للتطوير

---

## 🏗️ البنية المعمارية

### الملفات الرئيسية

```
/src/app/
├── App.tsx                                # التكامل الرئيسي
├── utils/
│   └── navigationGestureHandler.ts        # محرك الإيماءات
└── docs/
    └── NAVIGATION_GESTURES_AR.md          # هذا الملف
```

### التدفق العام

```
[إيماءة الرجوع]
      ↓
[Browser History API / Touch Events]
      ↓
[NavigationGestureHandler]
      ↓
[Update Screen State]
      ↓
[Re-render with Animation]
```

---

## 📱 كيفية العمل

### 1. في المتصفح (Desktop)

```
المستخدم يضغط زر الرجوع ← Browser Back Button
                ↓
      popstate event triggered
                ↓
    NavigationGestureHandler.handlePopState()
                ↓
    التحقق من سجل التنقل (Navigation History)
                ↓
    الانتقال للشاشة السابقة
```

### 2. على Android

```
المستخدم يضغط زر الرجوع ← Hardware Back / Swipe Gesture
                ↓
      popstate event triggered
                ↓
    نفس المعالج أعلاه (Unified Handler)
```

### 3. على iOS

```
المستخدم يسحب من الحافة اليسرى ← Edge Swipe
                ↓
    touchstart → touchend events
                ↓
    setupIOSSwipeDetection()
                ↓
    goBack() method
```

---

## 🔧 التكامل في App.tsx

### Navigation History Stack

```typescript
// تتبع سجل التنقل
const [navigationHistory, setNavigationHistory] = useState<Array<typeof screen>>(['splash']);

// دالة مساعدة للتنقل مع التتبع
const navigateWithHistory = (newScreen: typeof screen) => {
  // إضافة للسجل
  setNavigationHistory(prev => [...prev, newScreen]);
  
  // تحديث الشاشة
  setScreen(newScreen);
  
  // تحديث Browser History
  window.history.pushState({ screen: newScreen }, '', window.location.href);
};
```

### معالج popstate

```typescript
useEffect(() => {
  const handlePopState = (event: PopStateEvent) => {
    event.preventDefault();
    
    if (navigationHistory.length > 1) {
      // الرجوع للشاشة السابقة
      const previousScreen = navigationHistory[navigationHistory.length - 2];
      setNavigationHistory(prev => prev.slice(0, -1));
      setScreen(previousScreen);
    } else {
      // عند الشاشة الرئيسية - تأكيد الخروج
      const confirmExit = window.confirm('هل تريد الخروج من التطبيق؟');
      if (confirmExit) {
        setScreen('splash');
        setNavigationHistory(['splash']);
      }
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [screen, navigationHistory]);
```

---

## 🎯 حالات الاستخدام

### 1. **التنقل العادي**
```
Splash → Auth → Lawyer Dashboard → Case File
  ↓ Back     ↓ Back      ↓ Back
Splash ← Auth ← Lawyer Dashboard
```

### 2. **التنقل المتفرع**
```
Lawyer Dashboard
    ↓
├── Profile
├── Settings
│   └── Privacy
└── Active Cases
    └── Case File
```

### 3. **تأكيد الخروج**
```
Splash Screen (Root)
     ↓ Back
[تأكيد: هل تريد الخروج من التطبيق؟]
     ↓ Yes
  Exit App
```

---

## 🧪 الاختبار

### على Desktop
1. افتح التطبيق في المتصفح
2. انتقل بين الشاشات
3. اضغط زر الرجوع في المتصفح (Alt+Left)
4. تحقق من عودة التطبيق للشاشة السابقة

### على Android
1. افتح التطبيق في Chrome/PWA
2. انتقل بين الشاشات
3. اضغط زر الرجوع الفيزيائي أو استخدم إيماءة السحب
4. تحقق من عودة التطبيق للشاشة السابقة

### على iOS
1. افتح التطبيق في Safari/PWA
2. انتقل بين الشاشات
3. اسحب من الحافة اليسرى
4. تحقق من عودة التطبيق للشاشة السابقة

### اختبار تأكيد الخروج
1. انتقل للشاشة الرئيسية (Splash)
2. اضغط زر الرجوع
3. يجب ظهور رسالة تأكيد
4. تحقق من الخيارين (نعم/لا)

---

## 📊 Debug & Monitoring

### تفعيل Debug Logs

جميع عمليات التنقل تُسجل تلقائياً في Console:

```javascript
// عند الرجوع
🔙 [Back Gesture] Detected - Current: lawyer
🔙 [Back Gesture] Navigate to: auth

// عند التنقل الأمامي
🔄 [Navigation] From: splash To: auth
🔄 [Navigation] Pushed: auth - Stack size: 2

// iOS Swipe Detection
🔙 [iOS Swipe] Detected
```

### مراقبة سجل التنقل

```typescript
// في Console
console.log(navigationGesture.getHistory());

// Output:
[
  { screen: 'splash', timestamp: 1234567890 },
  { screen: 'auth', timestamp: 1234567891 },
  { screen: 'lawyer', timestamp: 1234567892 }
]
```

---

## ⚙️ الإعدادات المتقدمة

### تخصيص رسالة تأكيد الخروج

```typescript
// في navigationGestureHandler.ts
private handleRootBack() {
  const confirmExit = window.confirm('رسالتك المخصصة هنا');
  // ...
}
```

### تعطيل تأكيد الخروج

```typescript
private handleRootBack() {
  // Navigate directly without confirmation
  this.push('splash');
}
```

### إضافة بيانات إضافية للتنقل

```typescript
navigationGesture.push('lawyer', {
  userId: '123',
  caseId: '456',
  timestamp: Date.now()
});
```

---

## 🔒 الأمان والخصوصية

- ✅ لا يتم إرسال بيانات التنقل لأي خادم خارجي
- ✅ جميع البيانات محفوظة محلياً في الذاكرة
- ✅ يتم مسح السجل عند تسجيل الخروج
- ✅ لا يتم حفظ بيانات حساسة في Browser History

---

## 🐛 حل المشاكل الشائعة

### المشكلة: زر الرجوع لا يعمل

**الحل:**
```typescript
// تحقق من تهيئة المعالج
useEffect(() => {
  navigationGesture.initialize('splash');
}, []);
```

### المشكلة: رسالة تأكيد الخروج تظهر دائماً

**الحل:**
```typescript
// تحقق من الشاشة الحالية
if (screen !== 'splash') {
  // Show confirmation
}
```

### المشكلة: iOS Swipe لا تعمل

**الحل:**
```typescript
// تحقق من passive: true في Event Listeners
document.addEventListener('touchstart', handler, { passive: true });
```

---

## 📈 التحسينات المستقبلية

- [ ] دعم إيماءات متقدمة (Long Press, Double Tap)
- [ ] Animation transitions مخصصة للرجوع
- [ ] State Restoration بعد إعادة تحميل الصفحة
- [ ] Analytics للتتبع وتحسين UX
- [ ] A/B Testing لرسائل التأكيد

---

## 📝 الملاحظات الفنية

### State-Based Navigation vs React Router

التطبيق يستخدم **State-Based Navigation** بدلاً من React Router:

**المميزات:**
- ✅ تحكم كامل في التنقل
- ✅ أداء أفضل (No Re-renders)
- ✅ تكامل سهل مع Browser History
- ✅ Animations أكثر سلاسة

**العيوب:**
- ⚠️ Deep Linking يتطلب إعداد إضافي
- ⚠️ SEO محدود (SPA)

### Performance Considerations

```typescript
// تحسين الأداء - تجنب Re-renders غير الضرورية
const navigateWithHistory = useCallback((newScreen) => {
  // Implementation
}, []);
```

---

## 🎓 أمثلة كاملة

### مثال 1: إضافة شاشة جديدة مع دعم الرجوع

```typescript
function NewScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    // تسجيل الشاشة في السجل
    navigationGesture.push('newScreen');
    
    return () => {
      // التنظيف عند Unmount
    };
  }, []);

  return (
    <div>
      <button onClick={onBack}>رجوع</button>
      {/* Screen content */}
    </div>
  );
}
```

### مثال 2: التنقل مع بيانات إضافية

```typescript
// في Component A
navigationGesture.push('caseFile', { 
  caseId: '123',
  title: 'دعوى مدنية' 
});

// في Component B (استرجاع البيانات)
const history = navigationGesture.getHistory();
const currentItem = history[history.length - 1];
console.log(currentItem.data); // { caseId: '123', title: 'دعوى مدنية' }
```

---

## 📞 الدعم الفني

للمشاكل أو الاستفسارات:
- افتح Issue في GitHub Repository
- راجع Debug Logs في Console
- تحقق من Browser Compatibility

---

## 📄 الترخيص

هذه الميزة جزء من نظام "ملف الدعوى الذكي" وتخضع لنفس شروط الترخيص.

---

**آخر تحديث:** مارس 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للإنتاج
