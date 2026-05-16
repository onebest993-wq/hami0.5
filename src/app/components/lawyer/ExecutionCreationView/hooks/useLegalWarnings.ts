import { useMemo } from 'react';

export function getLegalWarningsAndAttachments(selectedClaimType: string) {
    const warnings: string[] = [];
    const requiredAttachments: string[] = [];
    const legalTips: string[] = [];

    switch (selectedClaimType) {
        case 'حجة زواج - مهر معجل':
            warnings.push('المهر المعجل يُنفذ فقط إذا كان مكتوباً بصيغة (مؤجل لحين الميسرة) أو (غير مقبوض)');
            warnings.push('إذا كان مكتوباً بصيغة (مقبوض)، يجب إقامة دعوى (تظاهر بالقبض) في محكمة الأحوال الشخصية أولاً');
            requiredAttachments.push('عقد الزواج الأصلي المصدق');
            requiredAttachments.push('البطاقة الوطنية الموحدة للدائنة (الزوجة)');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية');
            requiredAttachments.push('قرص CD يحتوي المستمسكات الممسوحة ضوئياً');
            legalTips.push('إذا كان المهر محدداً بالذهب (مثقال ذهبي)، المنفذ العدل يفاتح البنك المركزي لتقدير القيمة بالدينار');
            legalTips.push('التقييم يكون بتاريخ عقد الزواج وليس تاريخ التنفيذ (قرار 127/1999)');
            break;

        case 'حجة زواج - مهر مؤجل':
            warnings.push('المهر المؤجر يُنفذ فقط عند تحقق أقرب الأجلين: الطلاق أو الوفاة');
            warnings.push('يجب إرفاق قرار حكم بالطلاق القطعي أو شهادة وفاة الزوج');
            requiredAttachments.push('عقد الزواج الأصلي المصدق');
            requiredAttachments.push('قرار حكم الطلاق القطعي (المكتسب الدرجة القطعية) أو شهادة وفاة الزوج');
            requiredAttachments.push('إذا كانت وفاة: قسام شرعي للزوج المتوفى (لتحديد الورثة)');
            requiredAttachments.push('البطاقة الوطنية للدائنة');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية');
            requiredAttachments.push('قرص CD يحتوي المستمسكات');
            legalTips.push('للذهب: التقييم بتاريخ عقد الزواج عبر البنك المركزي');
            break;

        case 'حجة نفقة اتفاقية':
            warnings.push('النفقة الاتفاقية مشمولة بالنفاذ المعجل بقوة القانون (المادة 165 مرافعات)');
            warnings.push('الطعن التمييزي من المدين لا يوقف إجراءات الاستقطاع');
            warnings.push('النفقة دين مستمر - يجب المراجعة الدورية لقطع التقادم');
            requiredAttachments.push('حجة النفقة الاتفاقية الأصلية');
            requiredAttachments.push('البطاقة الوطنية للدائنة (الزوجة أو الحاضن)');
            requiredAttachments.push('هوية الأحوال المدنية للأطفال (إن وجدوا)');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية');
            legalTips.push('النفقة المستمرة مستثناة من التقادم السباعي (7 سنوات)');
            legalTips.push('إذا سدد المدين خلال 7 أيام من الإخبار، يُعفى من رسم التحصيل 3% (م113 تنفيذ)');
            break;

        case 'حجة مخالعة':
            warnings.push('المخالعة سند متضمن إقراراً بدين من الزوجة المخالِعة للزوج');
            warnings.push('يجب أن يكون بدل الخلع معلوماً ومحدد المقدار في الحجة');
            requiredAttachments.push('حجة المخالعة الأصلية (الطلاق الخلعي)');
            requiredAttachments.push('البطاقة الوطنية للمدينة (الزوجة المطلقة)');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية للزوج');
            legalTips.push('بدل الخلع يكون مقابل موافقة الزوج على الطلاق');
            break;

        case 'حجة إقرار بدين':
            warnings.push('يجب أن يتضمن السند إقراراً صريحاً بانشغال الذمة');
            warnings.push('الدين يجب أن يكون معلوماً ومحدد المقدار والنوع');
            warnings.push('يجب أن يكون مستحق الأداء (حل موعد سداده وغير معلق على شرط)');
            requiredAttachments.push('الحجة الشرعية الأصلية المتضمنة الإقرار');
            requiredAttachments.push('البطاقة الوطنية للدائن والمدين');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية');
            legalTips.push('إذا كان الدين معلقاً على شرط، لا يُقبل التنفيذ');
            break;

        case 'حجة حضانة ومشاهدة':
            warnings.push('الحجة تُستخدم لتنظيم جدول المشاهدة واصطحاب الأطفال');
            warnings.push('في حال امتناع الحاضن، يُنظّم محضر امتناع لإقامة دعوى إسقاط حضانة');
            requiredAttachments.push('حجة الحضانة والمشاهدة الاتفاقية');
            requiredAttachments.push('هوية الأحوال المدنية للأطفال');
            requiredAttachments.push('البطاقة الوطنية لكلا الوالدين');
            legalTips.push('الحجة لا تُنفذ كدين مالي بل كتنظيم للمشاهدة');
            break;

        case 'قسام شرعي':
            warnings.push('القسام حجة كاشفة للسهام وليست منشئة لدين - لا تُنفذ مباشرة');
            warnings.push('لا يمكن استخدامه لإجبار وارث على إعطاء حصة لوارث آخر');
            warnings.push('يتطلب دعوى إزالة شيوع أو محاسبة في محكمة البداءة');
            legalTips.push('القسام يُرفق كمستمسك لمعرفة ورثة الدائن (لتوزيع الأموال) أو ورثة المدين (للحجز على التركة)');
            legalTips.push('لا يُفتح به إضبارة تنفيذية ضد شخص');
            break;

        case 'حجة وصاية':
        case 'حجة ولادة':
        case 'حجة وفاة':
            warnings.push('هذه حجة إخبارية/ثبوتية - غير قابلة للتنفيذ كدين');
            warnings.push('تُستخدم لإثبات الصفة القانونية أو تُرفق كمستمسك فقط');
            legalTips.push('الحجة تُرفق داخل إضبارة تنفيذية أخرى ولا يُفتح بها ملف تنفيذ مستقل');
            break;

        case 'حجة تخارج':
            warnings.push('التخارج المجاني ينفذ في التسجيل العقاري وليس في مديرية التنفيذ');
            warnings.push('يُنفذ في مديرية التنفيذ فقط إذا تضمن بدلاً نقدياً معلوماً غير مدفوع');
            legalTips.push('يجب أن يتضمن نصاً صريحاً بالتزام المتخارِج له بدفع بدل نقدي');
            break;

        case 'مطاوعة':
            warnings.push('يُمنع استخدام القوة الجبرية (الحبس/الإحضار/القبض) في قضايا المطاوعة');
            warnings.push('الإجراء يقتصر على الإخبار/التنبيه فقط - لا يوجد دين مالي');
            warnings.push('مهلة 7 أيام من تاريخ الإخبار للزوجة للاستجابة');
            warnings.push('في حال الامتناع: يُنظّم (محضر امتناع) لإقامة دعوى (نشوز) في محكمة الأحوال الشخصية');
            requiredAttachments.push('قرار حكم قطعي بالمطاوعة (رجوع للعشرة الزوجية)');
            requiredAttachments.push('البطاقة الوطنية للزوج والزوجة');
            requiredAttachments.push('وكالة محامي مقترنة بالصلاحية التنفيذية');
            legalTips.push('المطاوعة إجراء غير مالي - الأتعاب على الزوج/الموكل فقط');
            legalTips.push('الإخبار يتم عبر مبلغ قضائي أو إعلان رسمي بالحضور لبيت الزوجية');
            legalTips.push('إذا حضرت: يُغلق الملف. إذا امتنعت: محضر امتناع + دعوى نشوز');
            break;

        default:
            break;
    }

    return { warnings, requiredAttachments, legalTips };
}

export function useLegalWarnings(claimType: string) {
    const currentLegalInfo = useMemo(() => getLegalWarningsAndAttachments(claimType), [claimType]);

    return { currentLegalInfo };
}
