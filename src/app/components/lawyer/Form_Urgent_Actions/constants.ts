import type { PathwayType } from '@/app/domain/urgent/formPathwayConstants';
import { isIqrarRequest } from '@/app/domain/urgent/formPathwayConstants';

export {
    JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
    isIqrarRequest,
    resolveStoredPathwayType,
    type PathwayType,
} from '@/app/domain/urgent/formPathwayConstants';

export {
    PETITION_ORDERS_DROPDOWN_OPTIONS,
    URGENT_JUDICIARY_DROPDOWN_OPTIONS,
    PETITION_ORDER_MANUAL_OPTION,
    PROCEDURE_CATEGORY_GROUP_LABELS,
    resolveProcedureCategory,
} from '@/app/domain/urgent/procedureCategory';

/** Phase 46 — تسميات الأطراف في الإقرار (المستفيد يبادر) */
export const IQRAR_PARTY_LABELS = {
    party1: 'المُقَر له (المستفيد طالب الإقرار)',
    party2: 'المُقِر (المعترف بالحق)',
} as const;

export const UNIFIED_URGENT_FORM_HEADER = {
    title: 'القضاء المستعجل والحجج',
};

/** Phase 25 — إرشادات ديناميكية لحقل تفاصيل الإجراء */
export function getProcedureDetailsGuidance(
    pathway: PathwayType,
    selectedOption: string,
    otherCustomText: string,
): { placeholder: string; helper: string } {
    const resolved = selectedOption === 'other' ? otherCustomText.trim() : selectedOption === '' ? '' : selectedOption;
    const t = resolved.trim();
    const defPh = 'أدخل التفاصيل الجوهرية الخاصة بهذا الطلب...';
    const defH = 'اذكر بيانات تحدد موضوع الطلب بشكل مباشر ودون لبس.';

    if (isIqrarRequest(t)) {
        return {
            placeholder: 'صف موضوع الإقرار والالتزامات أو الحق المعترف به باختصار ودقة...',
            helper: 'الإقرار القضائي حجة طوعية؛ ركّز على ما يُعترَف به دون إسقاط مسارات التظلم/التمييز الخاصة بالأمر الولائي.',
        };
    }

    if (pathway === 'urgent_discovery') {
        return {
            placeholder: 'أدخل وصف الحالة المراد إثباتها أو الكشف عليها باختصار...',
            helper: 'ينطبق على إثبات الحالة والكشف المستعجل وما شاكلها ضمن القضاء المستعجل.',
        };
    }

    if (!t) {
        return { placeholder: defPh, helper: defH };
    }

    if (t.includes('منع السفر')) {
        return {
            placeholder: 'أدخل رقم الجواز أو الرقم الوطني واسم الأم...',
            helper: 'البيانات الشخصية الدقيقة تُسهم في صدور أمر منع دقيق ومحدد.',
        };
    }
    if (t.includes('المرافق المقطوعة') || t.includes('ماء') || t.includes('كهرباء')) {
        return {
            placeholder: 'أدخل عنوان العقار ونوع الخدمة المقطوعة وتاريخ القطع...',
            helper: 'حدّد الخدمة (ماء/كهرباء/هاتف) والعنوان كما في واقع التعسف المدعى.',
        };
    }
    if (t.includes('الكشف المستعجل') || t.includes('تثبيت الحالة')) {
        return {
            placeholder: 'أدخل وصف المحل أو العقار والحالة المراد تثبيتها...',
            helper: 'صف موضوع الكشف أو الحالة بما يكفي لتحديد موعد الإجراء.',
        };
    }
    if (t.includes('استكتاب السندات') || t.includes('البصمة') || t.includes('التوقيع')) {
        return {
            placeholder: 'أدخل نوع السند وموضوعه والأطراف المعنية...',
            helper: 'بيّن السند المطلوب استكتابه وهل الطلب يتعلق ببصمة أو توقيع محدد.',
        };
    }
    if (t.includes('سماع شاهد')) {
        return {
            placeholder: 'أدخل اسم الشاهد وسبب خشية فوات الاستشهاد...',
            helper: 'اذكر سبب الاستعجال وما يُخشى فواته إن لم يُسمع الشاهد فوراً.',
        };
    }
    if (t.includes('الحراسة القضائية')) {
        return {
            placeholder: 'أدخل وصف الأموال أو الحسابات محل الحراسة...',
            helper: 'حدّد الأموال أو الحسابات المطلوب وضعها تحت الحراسة بدقة.',
        };
    }
    if (t.includes('الاستئذان بالتنفيذ') || t.includes('نفقة الخصم')) {
        return {
            placeholder: 'أدخل رقم الإضبارة التنفيذية والعمل المطلوب الاستئذان به...',
            helper: 'اربط الطلب بملف التنفيذ والعمل المطلوب تنفيذه أو إيقافه.',
        };
    }
    if (t.includes('وضع إشارة') || t.includes('إشارة دعوى')) {
        return {
            placeholder: 'أدخل تسلسل العقار والمقاطعة، أو رقم المركبة...',
            helper: 'حدّد محل التصرف (عقار/مركبة/غيره) كما في الواقع المعتمد لدى الكاتب العدل.',
        };
    }
    if (t.includes('إيقاف الإجراءات التنفيذية') || t.includes('المزايدة')) {
        return {
            placeholder: 'أدخل رقم الإضبارة التنفيذية واسم مديرية التنفيذ المختصة...',
            helper: 'أرقام الملف التنفيذي والمديرية تربط الطلب بالسياق التنفيذي المعني.',
        };
    }
    if (t.includes('إيقاف صرف') || t.includes('خطاب ضمان')) {
        return {
            placeholder: 'أدخل اسم المصرف، الفرع، ورقم الحساب/الخطاب...',
            helper: 'بيانات المصرف والحساب أو الخطاب تحدد موضوع الإيقاف المطلوب.',
        };
    }

    return { placeholder: defPh, helper: defH };
}
