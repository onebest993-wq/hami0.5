# تصميم الصفحات — دورة حياة «حجز مال منقول»

## Global Styles (Desktop-first)
- Design tokens:
  - Background: #F7F8FA (سطح) / #FFFFFF (بطاقات)
  - Primary: #1F6FEB
  - Success: #1A7F37
  - Warning: #9A6700
  - Danger: #D1242F
  - Text: #111827 / Muted: #6B7280
  - Border: #E5E7EB
- Typography:
  - H1 24px/700، H2 18px/700، Body 14–16px/400
- Buttons:
  - Primary: خلفية Primary + نص أبيض، Hover: تغميق 8%
  - Secondary: Border + نص Primary، Hover: خلفية فاتحة
  - Destructive: Danger
- Links: Primary مع underline عند hover
- Components style:
  - Card: radius 12px، shadow خفيف، padding 16–20px
  - Badge: radius 999px، أحجام S/M، ألوان حسب الحالة
- Responsive:
  - Desktop ≥ 1200px: شبكة 12 عمود
  - Tablet 768–1199px: عمودان (2-column) للبطاقات
  - Mobile < 768px: عمود واحد، الأزرار بعرض كامل

## 1) صفحة لوحة الحجوزات (Route: /)
### Layout
- Hybrid: CSS Grid للصفحة (Sidebar اختياري) + Flex داخل البطاقات.
- منطقة علوية ثابتة (Top bar) ثم محتوى قابل للتمرير.

### Meta Information
- Title: "لوحة الحجوزات"
- Description: "سجل حجوزات الأموال المنقولة مع بحث وتصفية بالحالات"
- OG: نفس العنوان/الوصف.

### Page Structure
1. Top Bar
2. شريط بحث وتصفية
3. Grid بطاقات السجل

### Sections & Components
- Top Bar:
  - يسار: اسم النظام
  - يمين: عنصر حساب المستخدم (اسم + دور)
- Search & Filters Panel (Card أفقي):
  - حقل بحث (رقم مرجع/اسم مدين)
  - Dropdown الحالة (Pending/Active/Sold/Released/Archived…)
  - نطاق تاريخ (من/إلى)
  - زر "تطبيق" و"مسح"
- سجل الحجوزات ببطاقات (Card Grid):
  - Header: اسم المدين + رقم مرجع
  - Sub: وصف المال المنقول (سطرين max)
  - Badges: حالة الموافقة + حالة التنفيذ
  - Financial mini-summary: إجمالي/صافي (إن وُجد)
  - Actions: زر "فتح تفاصيل" (أساسي) وزر ثانوي "تفاصيل المدين"
- Empty/Loading states:
  - Skeleton للبطاقات
  - Empty message مع نص إرشادي

## 2) صفحة تفاصيل المدين (Route: /debtors/:debtorId)
### Layout
- CSS Grid: عمودين (8/4) على الديسكتوب.
  - يسار: بيانات المدين + سجل الحجوزات
  - يمين: بطاقة الشارة + إجراءات

### Meta Information
- Title: "تفاصيل المدين"
- Description: "عرض حالة الحجوزات وإنشاء طلب حجز مال منقول"

### Page Structure
1. رأس الصفحة (اسم المدين + مرجع)
2. عمود رئيسي: سجل حجوزات المدين ببطاقات
3. عمود جانبي: شارة تحت المدين + زر إنشاء طلب

### Sections & Components
- Debtor Header:
  - H1: اسم المدين
  - معلومات ثانوية: رقم مرجع/هوية (إن موجودة)
- شارة تحت المدين (Status Badge Stack):
  - تعرض أعلى حالة مؤثرة (مثلاً: نشط) + عدّاد الحجوزات النشطة/المعلّقة
  - Tooltip يوضح معاني الحالات
- سجل الحجوزات ببطاقات:
  - كل بطاقة: الحالة، المال المنقول، التاريخ، آخر حدث
  - زر "فتح تفاصيل الحجز"
- CTA Card:
  - زر أساسي "طلب حجز مال منقول"
  - نص صغير يوضح أنه ينتقل إلى "بانتظار موافقة المنفّذ" بعد الحفظ

### مودال إدخال/طلب حجز (Modal)
- Trigger: زر "طلب حجز مال منقول"
- Structure:
  - Header: عنوان + وصف مختصر
  - Form (Grid 2 columns):
    - نوع المال المنقول (select)
    - وصف تفصيلي (textarea)
    - قيمة تقديرية (numeric)
    - معرفات/أرقام (text)
    - ملاحظات (textarea)
    - مرفقات (اختياري: uploader)
  - Footer:
    - زر Primary "حفظ وإرسال للموافقة"
    - زر Secondary "حفظ كمسودة" (إن تم اعتماد المسودة ضمن الحالة)
    - زر إلغاء
- Validation:
  - إلزام الوصف + نوع المال
  - منع قيم سالبة

## 3) صفحة تفاصيل الحجز (Route: /seizures/:seizureId)
### Layout
- Dashboard layout:
  - Header ثابت: رقم الحجز + الحالة الحالية (Badge كبير)
  - محتوى: عمودين (7/5)

### Meta Information
- Title: "تفاصيل الحجز"
- Description: "متابعة حالة الحجز وسجل الأحداث وإجراءات الموافقة والفك/التراجع والأرشفة"

### Page Structure
1. Seizure Header
2. Summary Cards
3. Timeline / Event log
4. Action Panel (حسب الدور والحالة)

### Sections & Components
- Header:
  - H1: "حجز #…" + Badges (Pending/Approved/Active/Sold/Released/Archived)
  - Breadcrumb: لوحة الحجوزات → المدين → الحجز
- Summary Cards (3-4 بطاقات صغيرة):
  - المدين
  - المال المنقول
  - قرار المنفّذ (إن وجد)
  - ملخص مالي (إن وجد)
- سجل أحداث (Timeline):
  - عناصر بترتيب زمني، كل عنصر: نوع الحدث، الفاعل، التاريخ، تفاصيل مختصرة
  - فلتر (الكل/الموافقات/المالية/الإجراءات)
- Action Panel:
  - إذا الحالة pending_executor_approval ودور المنفّذ:
    - زر "موافقة" (يفتح Modal سبب اختياري)
    - زر "رفض" (Modal سبب إلزامي)
  - إذا الحالة active:
    - زر "الذهاب للمزايدة/البيع" (ينقلك لصفحة البيع)
    - زر "فك الحجز" (Modal سبب)
    - زر "تراجع" (Modal سبب)
  - إذا الحالة sold أو released أو rolled_back:
    - زر "أرشفة" (يطلب تأكيد + يعرض ما سيتم تجميده)
- Confirm dialogs:
  - لكل إجراء متلف (رفض/فك/تراجع/أرشفة) مع نص يوضح الأثر.

## 4) صفحة المزايدة/البيع (Route: /seizures/:seizureId/sale)
### Layout
- ثلاث مناطق رأسية:
  1) معلومات الحجز/الأصل
  2) منطقة إدارة المزايدة/البيع
  3) لوحة الملخص المالي والتثبيت
- على الديسكتوب: صفحتان جنبًا إلى جنب (8/4):
  - يسار: العروض/البيع
  - يمين: الملخص المالي

### Meta Information
- Title: "المزايدة/البيع"
- Description: "تسجيل العروض أو البيع المباشر مع احتساب الرسوم والصافي واعتماد النتائج"

### Sections & Components
- Seizure Context Header:
  - اسم المدين + وصف المال + الحالة
- Sale Setup Card:
  - نوع البيع: مزايدة/بيع مباشر (segmented control)
  - تواريخ البداية/النهاية (للمزايدة)
  - سعر أساس/حد أدنى (اختياري حسب السياسة)
  - زر "فتح المزاد" أو "بدء البيع"
- Bids / Sale Entry:
  - في المزايدة: جدول عروض (اسم، مبلغ، وقت) + إدخال عرض جديد
  - في البيع المباشر: نموذج إدخال بيع نهائي (المشتري، المبلغ، مرجع)
- Financial Logic Panel (Right):
  - حقول مُهيكلة:
    - إجمالي (auto من أعلى عرض/سعر البيع)
    - رسوم (editable)
    - مصاريف (editable)
    - صافي (auto = إجمالي - رسوم - مصاريف)
    - توزيع (اختياري: قائمة بنود توزيع + تحقق أن مجموع التوزيع = الصافي)
  - Validation:
    - منع اعتماد إذا الصافي سالب
    - منع اعتماد إذا عدم توازن التوزيع
- Finalize Bar:
  - زر Primary "تثبيت النتائج" (يتطلب تأكيد)
  - زر Secondary "حفظ بدون تثبيت"
  - رابط "العودة لتفاصيل الحجز"
- States:
  - إذا مُثبت: تتحول الصفحة لوضع قراءة فقط مع ختم "مُثبت"